import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { readAutomationPolicy } from "./blog-automation-policy.ts";
import { parseDailyAutoPublishInput } from "./blog-auto-publish-runner.ts";
import { runDailyAutoArticlePipeline, type GenerateArticleInput, type GenerateArticleResult, type PersistPublishingArticleInput } from "./blog-daily-auto-article.ts";
import { saveBlogAggregate } from "./blog-postgres-repository.ts";
import { createBlogPrivacyScanPolicyFromEnvironment, scanBlogPrivacyText } from "./blog-privacy-scanner.ts";
import { createPostgresBlogUsageLedger, type UsageBudgetPolicy } from "./blog-usage-ledger.ts";

export const generationLockKey = "hlog-article-generation";
export type DraftCommand = { commandId: string; inputHash: string; reason: string };
export type DraftReceipt = { requestId: string; inputHash: string; status: "accepted" };
export type DraftRequestSummary = { id: string; status: string; reasonCode: string | null; createdAt: string; postId: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value, (_, item) =>
  item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)).digest("hex");

export function parseDraftCommand(input: unknown): DraftCommand {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("invalid_request");
  const c = input as Record<string, unknown>;
  if (Object.keys(c).length !== 3 || typeof c.commandId !== "string" || !uuid.test(c.commandId)
    || typeof c.inputHash !== "string" || !/^[0-9a-f]{64}$/.test(c.inputHash)
    || typeof c.reason !== "string" || !c.reason.trim() || c.reason.length > 400) throw Error("invalid_request");
  return { commandId: c.commandId.toLowerCase(), inputHash: c.inputHash, reason: c.reason.trim() };
}

export function prepareDraftInput(value: unknown, now = Date.now()) {
  const input = parseDailyAutoPublishInput(value);
  // Source bodies are not needed by the writer; keep only the existing verified summaries.
  input.researchPackSources = input.researchPackSources.map(source => {
    const { rawContent: _raw, ...summary } = source; void _raw; return summary;
  });
  if (!input.topicSources.length || !input.researchPackSources.length || Buffer.byteLength(JSON.stringify(input)) > 262144) throw Error("input_unavailable");
  for (const source of input.researchPackSources) {
    const age = now - Date.parse(source.fetchedAt);
    if (!Number.isFinite(age) || age < 0 || age > 86400000) throw Error("input_stale");
  }
  if (scanBlogPrivacyText(JSON.stringify(input), createBlogPrivacyScanPolicyFromEnvironment(process.env)).status === "blocked") throw Error("input_unsafe");
  return { input, hash: hash(input) };
}
export type PreparedDraftInput = ReturnType<typeof prepareDraftInput>;

export function createDraftRequestRepository(pool: Pool) {
  return {
    async list(): Promise<DraftRequestSummary[]> {
      const { rows } = await pool.query("select id,status,reason_code,created_at,post_id from blog_draft_requests order by created_at desc,id desc limit 20");
      return rows.map(r => ({ id: r.id, status: r.status, reasonCode: r.reason_code, createdAt: r.created_at.toISOString(), postId: r.post_id }));
    },
    async submit(value: unknown, loadInput: () => Promise<PreparedDraftInput>, enabled = false): Promise<DraftReceipt> {
      const c = parseDraftCommand(value), fingerprint = hash(["draft_request", c]);
      if (/https?:\/\//i.test(c.reason) || scanBlogPrivacyText(c.reason, createBlogPrivacyScanPolicyFromEnvironment(process.env)).status === "blocked") throw Error("unsafe_reason");
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("set local statement_timeout='5s'");
        const reserved = await client.query(`insert into admin_actions
          (id,action_type,actor_type,actor_id,target_type,target_id,reason,created_at,command_id,request_fingerprint,command_receipt)
          values ($1,'draft_requested','admin','owner','draft_request',$2::text,$3,now(),$2::text::uuid,$4,'{}')
          on conflict (actor_type,actor_id,command_id) where command_id is not null do nothing returning id`, [randomUUID(), c.commandId, c.reason, fingerprint]);
        if (!reserved.rowCount) {
          const previous = (await client.query("select request_fingerprint,command_receipt from admin_actions where actor_type='admin' and actor_id='owner' and command_id=$1", [c.commandId])).rows[0];
          if (previous.request_fingerprint !== fingerprint) throw Error("command_conflict");
          await client.query("commit"); return previous.command_receipt;
        }
        if (!enabled) throw Error("generation_disabled");
        if (!(await readAutomationPolicy(client, process.env, true)).effective.generation) throw Error("automation_paused");
        const prepared = await loadInput();
        if (prepared.hash !== c.inputHash) throw Error("input_changed");
        const inserted = await client.query(`insert into blog_draft_requests(id,input_hash,input_snapshot) values ($1,$2,$3)
          on conflict (input_hash) do nothing returning id`, [randomUUID(), prepared.hash, JSON.stringify(prepared.input)]);
        const requestId = inserted.rows[0]?.id ?? (await client.query("select id from blog_draft_requests where input_hash=$1", [prepared.hash])).rows[0].id;
        const receipt: DraftReceipt = { requestId, inputHash: prepared.hash, status: "accepted" };
        await client.query("update admin_actions set target_id=$2,command_receipt=$3 where id=$1", [reserved.rows[0].id, requestId, JSON.stringify(receipt)]);
        await client.query("commit"); return receipt;
      } catch (error) { await client.query("rollback"); throw error; }
      finally { client.release(); }
    },
  };
}

export async function runDraftRequestOnce({ pool, generateArticle, enabled = false, policy, providerTimeoutMs = 330000 }: {
  pool: Pool; generateArticle(input: GenerateArticleInput): Promise<GenerateArticleResult>;
  enabled?: boolean; policy: UsageBudgetPolicy; providerTimeoutMs?: number;
}): Promise<{ status: string; requestId?: string }> {
  if (!enabled) return { status: "disabled" };
  if (![policy.dailyEstimatedCostLimit, policy.monthlyEstimatedCostLimit].every(n => Number.isFinite(n) && n >= 0)) return { status: "budget_unconfigured" };
  const client = await pool.connect();
  let locked = false;
  try {
    locked = (await client.query("select pg_try_advisory_lock(hashtext($1)) acquired", [generationLockKey])).rows[0].acquired;
    if (!locked) return { status: "busy" };
    // Holding the single generation lock means any previous running request has lost its runner.
    await client.query(`update blog_draft_requests set status='needs_review',finished_at=now(),reason_code=case
      when provider_returned_at is not null then 'result_persistence_failed'
      when provider_started_at is not null then 'provider_outcome_unknown' else 'interrupted_before_provider' end where status='running'`);
    const row = (await client.query("select * from blog_draft_requests where status in ('queued','result_ready') order by (status='result_ready') desc,created_at,id limit 1")).rows[0];
    if (!row) return { status: "idle" };
    const requestId: string = row.id;
    const finish = async (aggregate: PersistPublishingArticleInput) => {
      await client.query("begin");
      try {
        if (aggregate.post.status !== "drafted" || aggregate.publishJobs.length) throw Error("invalid_draft_result");
        await saveBlogAggregate(client, { ...aggregate, assets: [] });
        await client.query("update blog_draft_requests set status='completed',reason_code=null,post_id=$2,finished_at=now() where id=$1 and status='result_ready'", [requestId, aggregate.post.id]);
        await client.query(`insert into admin_actions(id,action_type,actor_type,actor_id,target_type,target_id,reason,created_at)
          values ($1,'draft_completed','system','draft-runner','draft_request',$2,'비공개 초안 저장 완료',now())`, [randomUUID(), requestId]);
        await client.query("commit");
      } catch (e) { await client.query("rollback"); throw e; }
    };
    if (row.status === "result_ready") {
      try { await finish(row.result); return { status: "completed", requestId }; }
      catch { return { status: "result_ready", requestId }; }
    }
    // Unknown provider cost must be reconciled before another chargeable request.
    if ((await client.query("select 1 from blog_draft_requests where status='needs_review' union all select 1 from admin_actions where action_type='automation_admitted' and command_receipt->>'status' in ('running','needs_review') limit 1")).rowCount) return { status: "attention_required" };
    await client.query("begin");
    try {
      const current = await readAutomationPolicy(client, process.env, true);
      if (!current.effective.generation) { await client.query("rollback"); return { status: "paused", requestId }; }
      await client.query("update blog_draft_requests set status='running',started_at=now(),policy_revision=$2 where id=$1", [requestId, current.revision]);
      await client.query("commit");
    } catch (e) { await client.query("rollback"); throw e; }
    let providerStarted = false, providerReturned = false, resultSaved = false;
    try {
      const prepared = prepareDraftInput(row.input_snapshot);
      if (prepared.hash !== row.input_hash) throw Error("input_changed");
      const result = await runDailyAutoArticlePipeline({ ...prepared.input,
        dayKey: `draft-${requestId}`, runId: `draft-request:${requestId}`, runAt: new Date().toISOString(), persistenceMode: "draft", policy,
        usageLedger: createPostgresBlogUsageLedger(client),
        hasPersistedPostSlug: async slug => (await client.query("select 1 from posts where slug=$1", [slug])).rowCount !== 0,
        generateArticle: async input => {
          await client.query("begin");
          try {
            const current = await readAutomationPolicy(client, process.env, true);
            if (!current.effective.generation) throw Error("automation_paused");
            await client.query("update blog_draft_requests set provider_started_at=now(),policy_revision=$2 where id=$1", [requestId, current.revision]);
            await client.query("commit");
          } catch (e) { await client.query("rollback"); throw e; }
          providerStarted = true;
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            const generated = await Promise.race([generateArticle(input), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error("provider_outcome_unknown")), Math.min(providerTimeoutMs, 330000)); })]);
            providerReturned = true;
            await client.query("update blog_draft_requests set provider_returned_at=now() where id=$1", [requestId]);
            return generated;
          } finally { clearTimeout(timer); }
        },
        persistPublishingArticle: async aggregate => {
          await client.query("update blog_draft_requests set status='result_ready',result=$2,reason_code='result_persistence_failed' where id=$1", [requestId, JSON.stringify(aggregate)]);
          resultSaved = true;
          await finish(aggregate);
        },
      });
      if (result.status === "drafted") return { status: "completed", requestId };
      await client.query("update blog_draft_requests set status='blocked',reason_code=$2,finished_at=now() where id=$1", [requestId, result.status]);
      return { status: "blocked", requestId };
    } catch (e) {
      if (resultSaved) return { status: "result_ready", requestId };
      if (!providerStarted && e instanceof Error && ["automation_paused", "policy_unavailable"].includes(e.message)) {
        await client.query("update blog_draft_requests set status='queued',reason_code='automation_paused',started_at=null where id=$1", [requestId]);
        return { status: "paused", requestId };
      }
      const status = providerStarted ? "needs_review" : "blocked";
      const reason = providerReturned ? "result_persistence_failed" : providerStarted ? "provider_outcome_unknown" : e instanceof Error && ["input_stale","input_unsafe","input_changed"].includes(e.message) ? e.message : "input_unavailable";
      await client.query("update blog_draft_requests set status=$2,reason_code=$3,finished_at=now() where id=$1", [requestId, status, reason]);
      return { status, requestId };
    }
  } finally {
    // Destroy this connection if unlocking fails, so it cannot return a held session lock to the pool.
    try { if (locked) await client.query("select pg_advisory_unlock(hashtext($1))", [generationLockKey]); client.release(); }
    catch { client.release(true); }
  }
}
