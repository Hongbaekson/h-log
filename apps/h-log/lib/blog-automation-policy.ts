import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { createBlogPrivacyScanPolicyFromEnvironment, scanBlogPrivacyText } from "./blog-privacy-scanner.ts";

export type AutomationEnvironment = Readonly<Record<string, string | undefined>>;
export type AutomationFlags = { generation: boolean; publication: boolean; jobs: boolean };
export type AutomationPolicy = {
  requested: AutomationFlags; effective: AutomationFlags; revision: number; updatedAt: string;
  reasons: Record<keyof AutomationFlags, "policy_off" | "server_disabled" | "jobs_paused" | null>;
};
export type AutomationCommand = AutomationFlags & { commandId: string; expectedRevision: number; reason: string };
export type AutomationReceipt = { revision: number; requested: AutomationFlags };

export async function readAutomationPolicy(client: Pick<PoolClient, "query">, environment: AutomationEnvironment = process.env, lock = false): Promise<AutomationPolicy> {
  let row;
  try { row = (await client.query(`select * from blog_automation_policy where singleton${lock ? " for update" : ""}`)).rows[0]; }
  catch { throw Error("policy_unavailable"); }
  if (!row) throw Error("policy_unavailable");
  const requested: AutomationFlags = { generation: row.generation, publication: row.publication, jobs: row.jobs };
  const caps: AutomationFlags = { generation: environment.HLOG_BLOG_DRAFT_GENERATION_ENABLED === "1", publication: environment.HLOG_BLOG_AUTO_PUBLISH_ENABLED === "1", jobs: environment.HLOG_BLOG_JOBS_ENABLED === "1" };
  const reason = (key: keyof AutomationFlags): AutomationPolicy["reasons"][keyof AutomationFlags] => !requested[key] ? "policy_off" : !caps[key] ? "server_disabled" : key !== "jobs" && !(requested.jobs && caps.jobs) ? "jobs_paused" : null;
  const reasons = { generation: reason("generation"), publication: reason("publication"), jobs: reason("jobs") };
  return { requested, reasons, effective: { generation: !reasons.generation, publication: !reasons.publication, jobs: !reasons.jobs }, revision: row.revision, updatedAt: row.updated_at.toISOString() };
}

// Only short database operations belong in this transaction; never await a provider here.
export async function withAutomationPolicy<T>(pool: Pool, operation: (client: PoolClient, policy: AutomationPolicy) => Promise<T>, environment: AutomationEnvironment = process.env): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local statement_timeout='5s'");
    const policy = await readAutomationPolicy(client, environment, true);
    const result = await operation(client, policy);
    await client.query("commit"); return result;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export function canPublish(policy: AutomationPolicy, mode: string, environment: AutomationEnvironment = process.env) {
  return policy.effective.jobs && (mode === "manual" ? environment.HLOG_BLOG_MANUAL_PUBLISH_ENABLED === "1" : policy.effective.publication);
}

export function parseAutomationCommand(input: unknown): AutomationCommand {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("invalid_request");
  const c = input as Record<string, unknown>;
  if (Object.keys(c).length !== 6 || typeof c.commandId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.commandId)
    || !Number.isSafeInteger(c.expectedRevision) || (c.expectedRevision as number) < 0
    || typeof c.generation !== "boolean" || typeof c.publication !== "boolean" || typeof c.jobs !== "boolean"
    || typeof c.reason !== "string" || !c.reason.trim() || c.reason.length > 400) throw Error("invalid_request");
  return { commandId: c.commandId.toLowerCase(), expectedRevision: c.expectedRevision as number, generation: c.generation, publication: c.publication, jobs: c.jobs, reason: c.reason.trim() };
}

export async function changeAutomationPolicy(pool: Pool, input: unknown): Promise<AutomationReceipt> {
  const c = parseAutomationCommand(input);
  if (/https?:\/\//i.test(c.reason) || scanBlogPrivacyText(c.reason, createBlogPrivacyScanPolicyFromEnvironment(process.env)).status === "blocked") throw Error("unsafe_reason");
  const fingerprint = createHash("sha256").update(JSON.stringify(["automation_policy", c])).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local statement_timeout='5s'");
    const reserved = await client.query(`insert into admin_actions
      (id,action_type,actor_type,actor_id,target_type,target_id,reason,created_at,command_id,request_fingerprint,command_receipt)
      values ($1,'automation_policy_changed','admin','owner','automation_policy','blog',$2,now(),$3,$4,'{}')
      on conflict (actor_type,actor_id,command_id) where command_id is not null do nothing returning id`, [randomUUID(), c.reason, c.commandId, fingerprint]);
    if (!reserved.rowCount) {
      const previous = (await client.query("select request_fingerprint,command_receipt from admin_actions where actor_type='admin' and actor_id='owner' and command_id=$1", [c.commandId])).rows[0];
      if (previous.request_fingerprint !== fingerprint) throw Error("command_conflict");
      await client.query("commit"); return previous.command_receipt;
    }
    const policy = await readAutomationPolicy(client, process.env, true);
    if (policy.revision !== c.expectedRevision) throw Error("revision_conflict");
    const receipt = { revision: policy.revision + 1, requested: { generation: c.generation, publication: c.publication, jobs: c.jobs } };
    await client.query("update blog_automation_policy set generation=$1,publication=$2,jobs=$3,revision=revision+1,updated_at=now() where singleton", [c.generation, c.publication, c.jobs]);
    await client.query("update admin_actions set command_receipt=$2 where id=$1", [reserved.rows[0].id, JSON.stringify(receipt)]);
    await client.query("commit"); return receipt;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function loadAutomationState(pool: Pool, environment: AutomationEnvironment = process.env) {
  return withAutomationPolicy(pool, async (client, policy) => {
    const drafts = (await client.query("select id::text,started_at as admitted_at,policy_revision from blog_draft_requests where status='running' order by started_at limit 20")).rows;
    const jobs = (await client.query("select id,started_at as admitted_at,policy_revision,lease_expires_at from publish_jobs where status='running' order by started_at limit 20")).rows;
    const daily = (await client.query("select id,created_at as admitted_at,command_receipt->>'revision' as policy_revision,command_receipt->>'status' as status from admin_actions where action_type='automation_admitted' and command_receipt->>'status' in ('running','needs_review') order by created_at limit 20")).rows;
    return { policy, observedAt: new Date().toISOString(), inflight: [...drafts.map(r => ({ ...r, kind: "초안" })), ...jobs.map(r => ({ ...r, kind: "워커" })), ...daily.map(r => ({ ...r, kind: "일일 작성" }))].map(r => ({ id: r.id as string, kind: r.kind, revision: r.policy_revision as number | string | null, admittedAt: r.admitted_at?.toISOString() as string | null, status: "lease_expires_at" in r && r.lease_expires_at <= new Date() ? "lease_expired" : r.status ?? "running" })) };
  }, environment);
}
