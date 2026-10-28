import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { canPublish, readAutomationPolicy, type AutomationEnvironment } from "./blog-automation-policy.ts";
import { assertBlogPostStatusTransition, createPostVersionContentFromMarkdown, type BlogPostStatus } from "./blog-content-model.ts";
import { PERSISTENT_WORKER_RETRY_LIMIT } from "./blog-persistent-worker.ts";
import { createBlogPrivacyScanPolicyFromEnvironment, scanBlogPrivacyText } from "./blog-privacy-scanner.ts";

export type JobRetryCommand = { commandId: string; jobId: string; expectedRetryCount: number; expectedPostRevision: number; expectedVersion: number; expectedHash: string; reason: string; confirmed: true };
export type JobRetryReceipt = { jobId: string; retryCount: number; postStatus: BlogPostStatus; status: "queued" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const retrySupportedTypes = ["render", "privacy_scan", "search_index", "related_posts", "llms", "feed", "og"];
export function parseJobRetryCommand(input: unknown): JobRetryCommand {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("invalid_request");
  const c = input as Record<string, unknown>;
  if (Object.keys(c).length !== 8 || typeof c.commandId !== "string" || !uuid.test(c.commandId) || typeof c.jobId !== "string" || !uuid.test(c.jobId)
    || ![c.expectedRetryCount,c.expectedPostRevision,c.expectedVersion].every(n => Number.isSafeInteger(n) && (n as number) >= 0) || (c.expectedVersion as number) < 1
    || typeof c.expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(c.expectedHash) || c.confirmed !== true
    || typeof c.reason !== "string" || !c.reason.trim() || c.reason.length > 400) throw Error("invalid_request");
  return { commandId: c.commandId.toLowerCase(), jobId: c.jobId.toLowerCase(), expectedRetryCount: c.expectedRetryCount as number, expectedPostRevision: c.expectedPostRevision as number, expectedVersion: c.expectedVersion as number, expectedHash: c.expectedHash, reason: c.reason.trim(), confirmed: true };
}

export async function retryAdminJob(pool: Pool, input: unknown, environment: AutomationEnvironment = process.env): Promise<JobRetryReceipt> {
  const c = parseJobRetryCommand(input);
  if (/https?:\/\//i.test(c.reason) || scanBlogPrivacyText(c.reason, createBlogPrivacyScanPolicyFromEnvironment(environment)).status === "blocked") throw Error("unsafe_reason");
  const fingerprint = createHash("sha256").update(JSON.stringify(["job_retry",c])).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("begin"); await client.query("set local statement_timeout='5s'");
    const reserved = await client.query(`insert into admin_actions(id,action_type,actor_type,actor_id,target_type,target_id,reason,created_at,command_id,request_fingerprint,command_receipt)
      values($1,'retry','admin','owner','publish_job',$2,$3,now(),$4,$5,'{}')
      on conflict(actor_type,actor_id,command_id) where command_id is not null do nothing returning id`,[randomUUID(),c.jobId,c.reason,c.commandId,fingerprint]);
    if (!reserved.rowCount) {
      const previous = (await client.query("select request_fingerprint,command_receipt from admin_actions where actor_type='admin' and actor_id='owner' and command_id=$1",[c.commandId])).rows[0];
      if (previous.request_fingerprint !== fingerprint) throw Error("command_conflict");
      await client.query("commit"); return previous.command_receipt;
    }
    const policy = await readAutomationPolicy(client,environment,true);
    if (!policy.effective.jobs) throw Error("automation_paused");
    const target = (await client.query("select post_id from publish_jobs where admin_id=$1",[c.jobId])).rows[0];
    if (!target) throw Error("job_not_found");
    const post = (await client.query("select status,current_version_id,publication_mode,command_revision from posts where id=$1 for update",[target.post_id])).rows[0];
    // Worker completion locks job before post; do not wait on a job while holding post.
    const job = (await client.query("select * from publish_jobs where admin_id=$1 for update nowait",[c.jobId])).rows[0];
    if (job.status !== "failed" || job.retry_count !== c.expectedRetryCount || post.command_revision !== c.expectedPostRevision) throw Error("state_conflict");
    if (job.retry_count >= PERSISTENT_WORKER_RETRY_LIMIT) throw Error("retry_limit");
    if (job.lease_expires_at && job.lease_expires_at.getTime() > Date.now()) throw Error("lease_active");
    if (!retrySupportedTypes.includes(job.type)) throw Error("retry_not_supported");
    if (post.current_version_id !== job.post_version_id) throw Error("version_conflict");
    const version = (await client.query(`select version_no,content_hash,
      case when octet_length(content_markdown)<=262144 then content_markdown end as markdown,
      case when octet_length(content_html)<=262144 then content_html end as html
      from post_versions where id=$1 and post_id=$2`,[job.post_version_id,job.post_id])).rows[0];
    if (!version || version.version_no !== c.expectedVersion || version.content_hash !== c.expectedHash || version.markdown === null || version.html === null) throw Error("version_conflict");
    const canonical = createPostVersionContentFromMarkdown(version.markdown);
    if (canonical.contentHash !== version.content_hash || canonical.contentHtml !== version.html) throw Error("version_conflict");
    let status = post.status as BlogPostStatus;
    if (job.importance === "required") {
      if (!canPublish(policy,post.publication_mode,environment)) throw Error("automation_paused");
      if (!["failed_publish","failed_verification","publishing","verifying"].includes(status)) throw Error("state_conflict");
      if ((await client.query("select 1 from publish_jobs where post_id=$1 and status='running' and lease_expires_at>now() limit 1",[job.post_id])).rowCount) throw Error("lease_active");
      const next = status === "failed_publish" ? "publishing" : status === "failed_verification" ? "verifying" : status;
      if (next !== status) assertBlogPostStatusTransition(status,next);
      status = next;
    } else if (status !== "published") throw Error("state_conflict");
    await client.query("update publish_jobs set status='queued',retry_count=retry_count+1,lease_owner=null,lease_expires_at=null,started_at=null,finished_at=null where admin_id=$1",[c.jobId]);
    await client.query("update posts set status=$2,command_revision=command_revision+1,updated_at=now() where id=$1",[job.post_id,status]);
    const receipt: JobRetryReceipt = { jobId:c.jobId,retryCount:job.retry_count+1,postStatus:status,status:"queued" };
    await client.query("update admin_actions set command_receipt=$2 where id=$1",[reserved.rows[0].id,JSON.stringify(receipt)]);
    await client.query("commit"); return receipt;
  } catch (e) {
    await client.query("rollback");
    if (e && typeof e === "object" && "code" in e && e.code === "55P03") throw Error("state_conflict");
    throw e;
  } finally {client.release();}
}
