import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import type { Pool } from "pg";
import { createPostVersionContentHash, publishJobStatuses, requiredPublishJobTypes, retryablePublishJobTypes } from "./blog-content-model.ts";
import { resolveUsageBudgetPolicy } from "./blog-usage-ledger.ts";

type PublishingSnapshot = {
  jobs: { state: string; job_type: string; importance: string; count: number | string }[];
  queue: { importance: string; age: number | string | null; unknown: number | string; expired: number | string }[];
  usage: { window: string; known: number | string; unknown: number | string; included: number | string }[];
};
const invalid = () => Object.assign(new Error("invalid monitoring data"), { code: "INVALID_METRICS" });
function number(value: unknown, integer = false): number {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") throw invalid();
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (integer && !Number.isSafeInteger(n))) throw invalid();
  return n;
}
function allowed(value: string, values: readonly string[]): string { if (!values.includes(value)) throw invalid(); return value; }

export function renderPublishingMetrics(snapshot: PublishingSnapshot, environment: Record<string, string | undefined>): string {
  const lines: string[] = [];
  const jobs = [...requiredPublishJobTypes, ...retryablePublishJobTypes];
  if (snapshot.jobs.length > jobs.length * publishJobStatuses.length * 2 || snapshot.queue.length !== 2 || snapshot.usage.length !== 2) throw invalid();
  for (const row of snapshot.jobs) {
    lines.push(`hlog_publish_jobs{state="${allowed(row.state, publishJobStatuses)}",job_type="${allowed(row.job_type, jobs)}",importance="${allowed(row.importance, ["required", "retryable"])}"} ${number(row.count, true)}`);
  }
  for (const row of snapshot.queue) {
    const label = `importance="${allowed(row.importance, ["required", "retryable"])}"`;
    if (row.age !== null) lines.push(`hlog_publish_oldest_pending_age_seconds{${label}} ${number(row.age)}`);
    lines.push(`hlog_publish_pending_age_unknown_jobs{${label}} ${number(row.unknown, true)}`, `hlog_publish_expired_leases{${label}} ${number(row.expired, true)}`);
  }
  for (const row of snapshot.usage) {
    const window = allowed(row.window, ["day", "month"]), known = number(row.known);
    lines.push(`hlog_usage_known_cost_usd{window="${window}"} ${known}`, `hlog_usage_unknown_events{window="${window}"} ${number(row.unknown, true)}`, `hlog_usage_included_events{window="${window}"} ${number(row.included, true)}`);
    const key = window === "day" ? "HLOG_DAILY_ESTIMATED_COST_LIMIT" : "HLOG_MONTHLY_ESTIMATED_COST_LIMIT";
    let state = "invalid";
    try {
      const policy = resolveUsageBudgetPolicy({ [key]: environment[key] });
      const limit = window === "day" ? policy.dailyEstimatedCostLimit : policy.monthlyEstimatedCostLimit;
      state = limit === Infinity ? "unlimited" : limit === 0 ? "zero" : "limited";
      if (Number.isFinite(limit)) lines.push(`hlog_usage_budget_usd{window="${window}"} ${limit}`);
      if (limit > 0 && Number.isFinite(limit)) lines.push(`hlog_usage_budget_ratio{window="${window}"} ${known / limit}`);
    } catch { /* Invalid configuration is a state, never an invented budget. */ }
    for (const candidate of ["limited", "zero", "unlimited", "invalid"]) lines.push(`hlog_usage_budget_state{window="${window}",state="${candidate}"} ${Number(candidate === state)}`);
  }
  return lines.join("\n") + "\n";
}

type Expectation = { enabled: boolean; enabled_at: number; maintenance_from: number; maintenance_until: number };
function validateExpectation(expectation: Expectation, now: number) {
  if (!expectation || typeof expectation.enabled !== "boolean" || [expectation.enabled_at, expectation.maintenance_from, expectation.maintenance_until].some(n => typeof n !== "number")) throw invalid();
  const enabled = number(expectation.enabled_at), from = number(expectation.maintenance_from), until = number(expectation.maintenance_until);
  if (enabled > now + 60 || (expectation.enabled && enabled === 0) || until < from || until - from > 86400 || (from === 0 && until !== 0)) throw invalid();
  return { enabled, from, until };
}
export function publicationSchedule(expectation: Expectation, now: number) {
  const { enabled, from, until } = validateExpectation(expectation, now);
  // 09:00 Asia/Seoul is 00:00 UTC. No catch-up loop for missed daily slots.
  let slot = Math.max(Math.ceil(enabled / 86400) * 86400, Math.floor(now / 86400) * 86400);
  if (now >= from && from > 0 && slot >= from && slot <= until) slot = (Math.floor(until / 86400) + 1) * 86400;
  return { slot, deadline: slot + 1800 };
}

export function batchDeadline(task: "backup" | "restore", expectation: Expectation, success: number, now: number): number | undefined {
  const { enabled, from, until } = validateExpectation(expectation, now);
  number(success);
  if (success > now + 60) throw invalid();
  if (!expectation.enabled) return undefined;
  const first = (task === "backup" ? 26 : 24) * 3600;
  let deadline = success >= enabled ? success + (task === "backup" ? first : 30 * 86400) : enabled + first;
  if (from > 0 && now >= from && success <= until && deadline >= from) deadline = until + first;
  return deadline;
}

export const batchResults = ["never", "running", "succeeded", "failed", "skipped", "budget_blocked", "interrupted", "unverified"] as const;
export const batchStages = ["preflight", "generation", "worker", "verification", "complete", "interrupted", "unknown"] as const;

async function readStateFile(path: string) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let value;
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 32768) throw invalid();
    const buffer = Buffer.alloc(32769);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 32768) throw invalid();
    try { value = JSON.parse(buffer.subarray(0, bytesRead).toString("utf8")); } catch { throw invalid(); }
  } finally { await file.close(); }
  if (!value || typeof value !== "object" || value.schema_version !== 1) throw invalid();
  return value;
}

function parseSummary(value: Record<string, unknown>, task: string, now: number) {
  if (!/^[a-f0-9]{32}$/.test(String(value.invocation_id)) || !["scheduled", "manual"].includes(String(value.mode)) || (value.task !== task && !(task === "autopublish" && value.task === undefined))) throw invalid();
  const result = allowed(String(value.result), batchResults), stage = allowed(String(value.stage), batchStages);
  if ([value.started_at, value.completed_at, value.last_success_at].some(n => typeof n !== "number")) throw invalid();
  const start = number(value.started_at), end = number(value.completed_at), success = number(value.last_success_at);
  if (start === 0 || [start,end,success].some(n => n > now+60) || (end > 0 && end < start) || success > (end || start) || (result !== "running" && end === 0)) throw invalid();
  return { start, end, success, result, stage };
}

export async function readFileMetrics(path: string, kind: "autopublish" | "backup" | "restore" | "expectations", now = Date.now() / 1000): Promise<string> {
  const value = await readStateFile(path);
  if (kind === "expectations") {
    const lines: string[] = [];
    for (const task of ["autopublish", "backup", "restore"] as const) {
      const e = value[task];
      validateExpectation(e, now);
      let deadline: number | undefined;
      if (task === "autopublish") deadline = e.enabled ? publicationSchedule(e, now).deadline : undefined;
      else {
        let success: number | undefined;
        try { success = parseSummary(await readStateFile(join(dirname(path), `${task}.json`)), task, now).success; }
        catch (error) { if ((error as { code?: string }).code === "ENOENT") success = 0; }
        // An unreadable summary must not fabricate a new first-success deadline.
        if (success !== undefined) deadline = batchDeadline(task, e, success, now);
      }
      lines.push(`hlog_schedule_expected_enabled{task="${task}"} ${Number(e.enabled)}`,
        `hlog_schedule_enabled_timestamp_seconds{task="${task}"} ${e.enabled_at}`,
        `hlog_schedule_maintenance_from_timestamp_seconds{task="${task}"} ${e.maintenance_from}`,
        `hlog_schedule_maintenance_until_timestamp_seconds{task="${task}"} ${e.maintenance_until}`);
      if (deadline !== undefined) lines.push(`hlog_schedule_deadline_timestamp_seconds{task="${task}"} ${deadline}`);
    }
    return lines.join("\n") + "\n";
  }
  const { start, end, success, result, stage } = parseSummary(value, kind, now);
  const lines = kind === "autopublish" ? [] : [`hlog_batch_last_attempt_timestamp_seconds{task="${kind}"} ${start}`, `hlog_batch_last_success_timestamp_seconds{task="${kind}"} ${success}`];
  if (kind === "autopublish") {
    if ([value.last_success_slot, value.last_budget_block_at].some(n => typeof n !== "number")) throw invalid();
    const slot = number(value.last_success_slot), budget = number(value.last_budget_block_at);
    if (slot > success || budget > (end || start) || budget > now+60) throw invalid();
    lines.push(`hlog_autopublish_last_attempt_timestamp_seconds ${start}`, `hlog_autopublish_last_success_timestamp_seconds ${success}`, `hlog_autopublish_last_success_slot_timestamp_seconds ${slot}`, `hlog_autopublish_last_budget_block_timestamp_seconds ${budget}`);
  }
  return [...lines, ...batchResults.map(r => `hlog_batch_result{task="${kind}",result="${r}"} ${Number(r === result)}`), ...batchStages.map(s => `hlog_batch_stage{task="${kind}",stage="${s}"} ${Number(s === stage)}`)].join("\n") + "\n";
}

export async function verifyPublication(pool: Pool, candidate: { status: string; postId: string; versionId: string | null }): Promise<boolean> {
  if (candidate.status !== "publishing" || !candidate.versionId) return false;
  // One statement sees the current version and all six job results in one snapshot.
  const result = await pool.query(`SELECT v.content_markdown, v.content_html, v.content_hash
    FROM posts p JOIN post_versions v ON v.id=p.current_version_id AND v.post_id=p.id
    WHERE p.id=$1 AND v.id=$2 AND p.status='published'
      AND NOT EXISTS (SELECT 1 FROM unnest($3::text[]) AS required(type) WHERE NOT EXISTS
        (SELECT 1 FROM publish_jobs j WHERE j.post_id=p.id AND j.post_version_id=v.id AND j.importance='required' AND j.type=required.type AND j.status='succeeded'))
      AND NOT EXISTS (SELECT 1 FROM publish_jobs j WHERE j.post_id=p.id AND j.post_version_id=v.id AND j.importance='required' AND j.status<>'succeeded')`, [candidate.postId, candidate.versionId, requiredPublishJobTypes]);
  const row = result.rows[0];
  return !!row && row.content_hash === createPostVersionContentHash({ contentMarkdown: row.content_markdown, contentHtml: row.content_html });
}
