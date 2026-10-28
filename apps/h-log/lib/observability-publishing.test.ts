import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileMetrics, renderPublishingMetrics, publicationSchedule } from "./observability-publishing.ts";

test("job/usage metrics keep unknown age and costs separate from zero and invalid budget", () => {
  const snapshot = { jobs: [{ state: "queued", job_type: "render", importance: "required", count: 2 }],
    queue: [{ importance: "required", age: null, unknown: 2, expired: 1 }, { importance: "retryable", age: 0, unknown: 0, expired: 0 }],
    usage: [{ window: "day", known: 1.25, unknown: 2, included: 1 }, { window: "month", known: 3, unknown: 4, included: 2 }] };
  const metrics = renderPublishingMetrics(snapshot, { HLOG_DAILY_ESTIMATED_COST_LIMIT: "0", HLOG_MONTHLY_ESTIMATED_COST_LIMIT: "bad" });
  assert.match(metrics, /hlog_usage_budget_state\{window="day",state="zero"} 1/);
  assert.match(metrics, /hlog_usage_budget_state\{window="month",state="invalid"} 1/);
  assert.doesNotMatch(metrics, /budget_ratio|oldest_pending_age_seconds\{importance="required"}/);
  assert.match(metrics, /oldest_pending_age_seconds\{importance="retryable"} 0/);
  assert.match(metrics, /hlog_usage_unknown_events\{window="day"} 2/);
  assert.throws(() => renderPublishingMetrics({ ...snapshot, jobs: [{ ...snapshot.jobs[0], state: "SECRET" }] }, {}));
});

test("KST slots respect activation, missed runs and finite maintenance without forging success", () => {
  const epoch = (s: string) => Date.parse(s) / 1000;
  const start = epoch("2026-10-28T00:10:00Z");
  assert.equal(publicationSchedule({ enabled: true, enabled_at: start, maintenance_from: 0, maintenance_until: 0 }, start).slot, epoch("2026-10-29T00:00:00Z"));
  const schedule = publicationSchedule({ enabled: true, enabled_at: start, maintenance_from: 0, maintenance_until: 0 }, epoch("2026-10-30T01:00:00Z"));
  assert.equal(schedule.slot, epoch("2026-10-30T00:00:00Z"));
  assert.equal(schedule.deadline, epoch("2026-10-30T00:30:00Z"));
  assert.throws(() => publicationSchedule({ enabled: true, enabled_at: start, maintenance_from: start, maintenance_until: start + 86401 }, start));
  assert.equal(typeof readFileMetrics, "function");
});

test("durable file reader rejects corrupt, future and mistyped state without emitting identifiers", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hlog-state-")), path = join(dir, "state.json"), now = 1793145600;
  const state = { schema_version: 1, invocation_id: "a".repeat(32), mode: "scheduled", result: "succeeded", stage: "complete", started_at: now-20, completed_at: now-1, last_success_at: now-2, last_success_slot: now-60, last_budget_block_at: 0 };
  try {
    await assert.rejects(readFileMetrics(path, "autopublish", now), { code: "ENOENT" });
    await writeFile(path, JSON.stringify(state));
    assert.match(await readFileMetrics(path, "autopublish", now), /result="succeeded"} 1/);
    assert.doesNotMatch(await readFileMetrics(path, "autopublish", now), /aaaa|invocation|scheduled/);
    for (const content of ['{', 'x'.repeat(32769), JSON.stringify({ ...state, last_success_at: now+3600 }), JSON.stringify({ ...state, completed_at: now-30 }), JSON.stringify({ ...state, started_at: String(now-20) })]) {
      await writeFile(path, content); await assert.rejects(readFileMetrics(path, "autopublish", now), { code: "INVALID_METRICS" });
    }
    await writeFile(path, JSON.stringify({ schema_version: 1, autopublish: { enabled: false, enabled_at: 0, maintenance_from: 0, maintenance_until: 0 } }));
    const disabled = await readFileMetrics(path, "expectations", now);
    assert.match(disabled, /expected_enabled\{task="autopublish"} 0/); assert.doesNotMatch(disabled, /deadline/);
    await unlink(path); await assert.rejects(readFileMetrics(path, "expectations", now), { code: "ENOENT" });
  } finally { await unlink(path).catch(() => undefined); await rmdir(dir); }
});
