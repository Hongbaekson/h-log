import type { Pool, PoolClient } from "pg";
import { readAutomationPolicy } from "./blog-automation-policy.ts";

export const jobStatusLabels = { queued: "대기", running: "처리 중", retrying: "재시도 대기", failed: "실패", succeeded: "완료" };
export const importanceLabels = { required: "필수 검증", retryable: "후속 작업" };
export const actorLabels = { admin: "관리자", system: "시스템", discord: "Discord", cli: "CLI" };
export const targetLabels = { post: "글", post_version: "글 버전", publish_job: "작업", topic_candidate: "주제", brain_note: "Second Brain", resume_pdf_version: "이력서 버전", resume_pdf: "이력서", draft_request: "초안 요청", automation_policy: "자동 작성 정책" };
export const actionLabels = { preview: "미리보기", save: "저장", publish: "공개 요청", retry: "재시도 요청", unpublish: "공개 해제", retract: "철회", correct: "정정", block_topic: "주제 차단", approve_preview: "검토 승인", draft_requested: "초안 요청", draft_completed: "초안 저장", automation_policy_changed: "정책 변경", automation_admitted: "자동 작성 시작 승인" };
export const jobTypeLabels = { public_url: "공개 URL", md_url: "Markdown URL", render: "렌더링", privacy_scan: "개인정보 검사", sitemap: "사이트맵", content_version_match: "공개 버전 일치", embedding: "임베딩", search_index: "검색 색인", related_posts: "관련 글", llms: "LLMs 문서", feed: "피드", indexnow: "IndexNow", discord: "Discord 알림", og: "OG 이미지", diagram: "다이어그램" };

type Search = Record<string, string | string[] | undefined>;
export type JobsQuery = { page: number; status: "all" | keyof typeof jobStatusLabels; importance: "all" | keyof typeof importanceLabels; lease: "all" | "expired" };
export type AuditQuery = { page: number; target: "all" | keyof typeof targetLabels; actor: "all" | keyof typeof actorLabels };
export type CostLimit = { state: "unlimited" | "invalid" } | { state: "limited"; amount: number };
type UsageWindow = { events: number; knownCost: number; unknownAmount: number; unknownBasis: number; limit: CostLimit };

function choice<T extends string>(value: string | string[] | undefined, values: readonly T[]): T | "all" {
  if (value === undefined || value === "all") return "all";
  if (typeof value !== "string" || !values.includes(value as T)) throw new Error("invalid_query");
  return value as T;
}
function pageNumber(value: Search[string]): number {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d{0,4}$/.test(value) || Number(value) > 10000) throw new Error("invalid_query");
  return Number(value);
}
export function parseJobsQuery(search: Search): JobsQuery {
  return { page: pageNumber(search.page), status: choice(search.status, Object.keys(jobStatusLabels) as (keyof typeof jobStatusLabels)[]), importance: choice(search.importance, ["required", "retryable"]), lease: choice(search.lease, ["expired"]) };
}
export function parseAuditQuery(search: Search): AuditQuery {
  return { page: pageNumber(search.page), target: choice(search.target, Object.keys(targetLabels) as (keyof typeof targetLabels)[]), actor: choice(search.actor, Object.keys(actorLabels) as (keyof typeof actorLabels)[]) };
}
export function readCostLimit(value: string | undefined): CostLimit {
  if (!value?.trim()) return { state: "unlimited" };
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? { state: "limited", amount } : { state: "invalid" };
}

// Each screen reads one bounded, consistent snapshot. Failure never becomes an empty ledger.
// ponytail: capped OFFSET + a 3s statement timeout; add keyset paging/indexes if measured ledger growth needs it.
async function snapshot<T>(pool: Pool, read: (client: PoolClient, observedAt: string) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    await client.query("set local statement_timeout = '3s'");
    const observedAt = (await client.query("select transaction_timestamp() as at")).rows[0].at.toISOString();
    const result = await read(client, observedAt);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback"); throw error;
  } finally { client.release(); }
}

export type AdminJob = {
  adminId: string; postRevision: number; postStatus: string;
  ref: string; postRef: string; type: keyof typeof jobTypeLabels; status: keyof typeof jobStatusLabels;
  importance: keyof typeof importanceLabels; retryCount: number; policyRevision: number | null;
  targetVersion: number; currentVersion: number | null; publicVersion: number | null; isCurrentVersion: boolean;
  targetHash: string | null; lease: "none" | "active" | "expired";
  leaseExpiresAt: string | null; startedAt: string | null; finishedAt: string | null;
  failure: "none" | "retry_pending" | "required_failed" | "optional_failed"; hasError: boolean;
};
export function readAdminJobs(pool: Pool, query: JobsQuery) {
  return snapshot(pool, async (client, observedAt) => {
    const { rows } = await client.query(`select
        md5(j.admin_id::text) as ref, j.admin_id,p.command_revision,p.status as post_status,md5(p.id) as post_ref, j.type,j.status,j.importance,j.retry_count,j.policy_revision,
        v.version_no as target_version, cv.version_no as current_version,
        case when p.status='published' then cv.version_no end as public_version,
        j.post_version_id=p.current_version_id as is_current_version,
        case when v.content_hash ~ '^[a-f0-9]{64}$' then v.content_hash end as target_hash,
        j.lease_expires_at,j.started_at,j.finished_at,j.error is not null as has_error
      from publish_jobs j join posts p on p.id=j.post_id
      join post_versions v on v.id=j.post_version_id
      left join post_versions cv on cv.id=p.current_version_id
      where ($1='all' or j.status=$1) and ($2='all' or j.importance=$2)
        and ($3='all' or (j.status='running' and j.lease_expires_at < $4::timestamptz))
      order by j.id limit 21 offset $5`, [query.status, query.importance, query.lease, observedAt, (query.page - 1) * 20]);
    const jobs: AdminJob[] = rows.slice(0,20).map(r => ({
      adminId: r.admin_id, postRevision: r.command_revision, postStatus: r.post_status,
      ref: r.ref, postRef: r.post_ref, type: r.type, status: r.status, importance: r.importance,
      retryCount: r.retry_count, policyRevision: r.policy_revision,
      targetVersion: r.target_version, currentVersion: r.current_version, publicVersion: r.public_version,
      isCurrentVersion: r.is_current_version === true, targetHash: r.target_hash,
      lease: r.status !== "running" || !r.lease_expires_at ? "none" : r.lease_expires_at.getTime() < Date.parse(observedAt) ? "expired" : "active",
      leaseExpiresAt: r.lease_expires_at?.toISOString() ?? null, startedAt: r.started_at?.toISOString() ?? null, finishedAt: r.finished_at?.toISOString() ?? null,
      failure: r.status === "retrying" ? "retry_pending" : r.status === "failed" ? r.importance === "required" ? "required_failed" : "optional_failed" : "none",
      hasError: r.has_error,
    }));
    return { observedAt, jobs, hasNext: rows.length > 20, policy: await readAutomationPolicy(client) };
  });
}

export type AdminAuditAction = {
  ref: string; targetRef: string; action: keyof typeof actionLabels; actor: keyof typeof actorLabels;
  target: keyof typeof targetLabels; createdAt: string; hasReason: boolean; hasCommand: boolean;
  policy: { revision: number; generation: boolean; publication: boolean; jobs: boolean } | null;
};
export function readAdminAudit(pool: Pool, query: AuditQuery, environment: Record<string, string | undefined>) {
  return snapshot(pool, async (client, observedAt) => {
    const { rows } = await client.query(`select md5(id) as ref,md5(target_id) as target_ref,action_type,actor_type,target_type,created_at,
        reason is not null as has_reason,command_id is not null as has_command,
        case when action_type='automation_policy_changed' then left(command_receipt->>'revision',16) end as revision,
        case when action_type='automation_policy_changed' then command_receipt->'requested'->'generation' end as generation,
        case when action_type='automation_policy_changed' then command_receipt->'requested'->'publication' end as publication,
        case when action_type='automation_policy_changed' then command_receipt->'requested'->'jobs' end as jobs
      from admin_actions where ($1='all' or target_type=$1) and ($2='all' or actor_type=$2)
      order by created_at desc,id desc limit 21 offset $3`, [query.target, query.actor, (query.page - 1) * 20]);
    const actions: AdminAuditAction[] = rows.slice(0,20).map(r => ({
      ref: r.ref, targetRef: r.target_ref, action: r.action_type, actor: r.actor_type, target: r.target_type,
      createdAt: r.created_at.toISOString(), hasReason: r.has_reason, hasCommand: r.has_command,
      policy: /^\d+$/.test(r.revision ?? "") && Number.isSafeInteger(Number(r.revision)) && [r.generation,r.publication,r.jobs].every(v => typeof v === "boolean")
        ? { revision: Number(r.revision), generation: r.generation, publication: r.publication, jobs: r.jobs } : null,
    }));
    const instant = new Date(observedAt);
    const dayStart = new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate())).toISOString();
    const monthStart = new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), 1)).toISOString();
    const usage = (await client.query(`select count(*)::int as month_events,
        coalesce(sum(estimated_cost),0) as month_cost,count(*) filter(where estimated_cost is null)::int as month_unknown,
        count(*) filter(where created_at >= $1)::int as day_events,
        coalesce(sum(estimated_cost) filter(where created_at >= $1),0) as day_cost,
        count(*) filter(where created_at >= $1 and estimated_cost is null)::int as day_unknown
      from usage_events where created_at >= $2 and created_at <= $3`, [dayStart, monthStart, observedAt])).rows[0];
    const window = (key: "day" | "month", setting: string): UsageWindow => ({
      events: usage[`${key}_events`], knownCost: Number(usage[`${key}_cost`]), unknownAmount: usage[`${key}_unknown`],
      unknownBasis: usage[`${key}_events`], limit: readCostLimit(environment[setting]),
    });
    return { observedAt, actions, hasNext: rows.length > 20, usage: { day: window("day", "HLOG_DAILY_ESTIMATED_COST_LIMIT"), month: window("month", "HLOG_MONTHLY_ESTIMATED_COST_LIMIT") } };
  });
}
