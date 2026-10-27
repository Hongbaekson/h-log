import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { createDailyAutoPublishOutput, createDailyAutoPublishPostId, parseDailyAutoPublishInput, runDailyAutoPublishOnce } from "./blog-auto-publish-runner.ts";
import { generationLockKey } from "./blog-draft-requests.ts";
import { readAutomationPolicy, withAutomationPolicy, type AutomationEnvironment } from "./blog-automation-policy.ts";
import { saveBlogAggregate } from "./blog-postgres-repository.ts";
import { createPostgresBlogUsageLedger, resolveUsageBudgetPolicy } from "./blog-usage-ledger.ts";
import type { GenerateArticleInput, GenerateArticleResult } from "./blog-daily-auto-article.ts";

export async function runDailyAutomationOnce({ pool, loadInput, generateArticle, environment = process.env, runAt = new Date().toISOString() }: {
  pool: Pool; loadInput(): Promise<unknown>; generateArticle(input: GenerateArticleInput): Promise<GenerateArticleResult>;
  environment?: AutomationEnvironment; runAt?: string;
}) {
  const postId = createDailyAutoPublishPostId(runAt);
  const release = await createDailyRunLock(pool)(generationLockKey);
  if (!release) return { status: "busy", postId };
  let admissionId: string | null = null, savedAsDraft = false;
  try {
    // A lost daily process is as uncertain as a lost manual request; never charge again automatically.
    const uncertain = await pool.query(`select 1 from blog_draft_requests where status in ('running','needs_review')
      union all select 1 from admin_actions where action_type='automation_admitted' and command_receipt->>'status' in ('running','needs_review') limit 1`);
    if (uncertain.rowCount) return { status: "attention_required", postId };
    if (!(await readAutomationPolicy(pool, environment)).effective.generation) return { status: "paused", postId };
    const budget = resolveUsageBudgetPolicy(environment);
    if (![budget.dailyEstimatedCostLimit, budget.monthlyEstimatedCostLimit].every(n => Number.isFinite(n) && n >= 0)) return { status: "budget_unconfigured", postId };
    const input = parseDailyAutoPublishInput(await loadInput());
    const ledger = createPostgresBlogUsageLedger(pool);
    const result = await runDailyAutoPublishOnce({ ...input,
      acquireDailyRunLock: createDailyRunLock(pool),
      hasPersistedPost: async id => !!(await pool.query("select 1 from posts where id=$1", [id])).rowCount,
      hasPersistedPostSlug: async slug => !!(await pool.query("select 1 from posts where slug=$1", [slug])).rowCount,
      runAt, policy: budget, usageLedger: { ...ledger,
        // The date is stable, but a known quality failure may have another paid attempt.
        recordUsageEvent: event => ledger.recordUsageEvent({ ...event, id: event.eventType === "llm" ? `${event.id}:${admissionId}` : event.id }),
      },
      generateArticle: async value => {
        const id = randomUUID();
        await withAutomationPolicy(pool, async (client, policy) => {
          if (!policy.effective.generation) throw Error("automation_paused");
          await client.query(`insert into admin_actions(id,action_type,actor_type,actor_id,target_type,target_id,reason,created_at,command_receipt,command_id,request_fingerprint)
            values ($1,'automation_admitted','system','daily-runner','automation_policy','blog','일일 작성 실행 허용',now(),$2,$3,$4)`, [id, JSON.stringify({ revision: policy.revision, postId, status: "running" }), id, createHash("sha256").update(JSON.stringify(["daily", postId, id])).digest("hex")]);
        }, environment);
        admissionId = id;
        return generateArticle(value);
      },
      persistPublishingArticle: aggregate => withAutomationPolicy(pool, async (client, policy) => {
        // Even an already admitted provider result stays private after generation/publication/jobs are stopped.
        savedAsDraft = !policy.effective.generation || !policy.effective.publication;
        await saveBlogAggregate(client, { ...aggregate, assets: [], post: { ...aggregate.post, status: savedAsDraft ? "drafted" : "publishing" }, publishJobs: savedAsDraft ? [] : aggregate.publishJobs });
      }, environment),
    });
    if (admissionId) await pool.query("update admin_actions set command_receipt=command_receipt || '{\"status\":\"completed\"}'::jsonb where id=$1", [admissionId]);
    return { ...createDailyAutoPublishOutput(result, runAt), status: savedAsDraft ? "drafted" : result.status };
  } catch (error) {
    if (admissionId) await pool.query("update admin_actions set command_receipt=command_receipt || '{\"status\":\"needs_review\"}'::jsonb where id=$1", [admissionId]);
    if (error instanceof Error && ["automation_paused", "policy_unavailable"].includes(error.message)) return { status: error.message === "automation_paused" ? "paused" : "policy_unavailable", postId };
    throw error;
  } finally { await release(); }
}

function createDailyRunLock(pool: Pool) {
  return async (key: string) => {
    const client = await pool.connect();
    try {
      const result = await client.query("select pg_try_advisory_lock(hashtext($1)) as acquired", [key]);
      if (!result.rows[0]?.acquired) { client.release(); return null; }
      return async () => {
        try { await client.query("select pg_advisory_unlock(hashtext($1))", [key]); client.release(); }
        catch (error) { client.release(true); throw error; }
      };
    } catch (error) { client.release(true); throw error; }
  };
}
