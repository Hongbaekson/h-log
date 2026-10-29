import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileMetrics, renderPublishingMetrics, publicationSchedule, batchDeadline } from "./observability-publishing.ts";

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

test("backup/restore deadlines use first success, reactivation and finite maintenance", () => {
  const now = 1793145600, hour = 3600;
  const e = { enabled: true, enabled_at: now, maintenance_from: 0, maintenance_until: 0 };
  assert.equal(batchDeadline('backup', e, 0, now), now+26*hour);
  assert.equal(batchDeadline('restore', e, 0, now), now+24*hour);
  assert.equal(batchDeadline('restore', e, now+hour, now+hour), now+hour+30*86400);
  assert.equal(batchDeadline('restore', { ...e, enabled_at: now+2*hour }, now+hour, now+2*hour), now+26*hour);
  const maintenance = { ...e, maintenance_from: now+hour, maintenance_until: now+2*hour };
  assert.equal(batchDeadline('restore', maintenance, now, now+2*hour), now+26*hour);
  assert.equal(batchDeadline('restore', maintenance, now+3*hour, now+3*hour), now+3*hour+30*86400);
  assert.equal(batchDeadline('backup', { ...e, enabled_at: now-30*hour, maintenance_from: now-hour, maintenance_until: now+hour }, 0, now), now-4*hour);
  assert.equal(batchDeadline('backup', { ...e, enabled: false }, 0, now), undefined);
});

test("backup and restore files emit independent results without dump paths or invented missing success", async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hlog-batch-')), now = 1793145600;
  try {
    for (const task of ['backup', 'restore'] as const) {
      const file = join(dir, task+'.json');
      await assert.rejects(readFileMetrics(file, task, now), { code: 'ENOENT' });
      await writeFile(file, JSON.stringify({ schema_version: 1, task, invocation_id: 'a'.repeat(32), mode: 'manual', started_at: now-2, completed_at: now, result: 'failed', stage: 'verification', last_success_at: now-100 }));
      const text = await readFileMetrics(file, task, now);
      assert.match(text, new RegExp(`hlog_batch_last_success_timestamp_seconds\\{task="${task}"} ${now-100}`));
      assert.match(text, new RegExp(`hlog_batch_result\\{task="${task}",result="failed"} 1`));
      assert.doesNotMatch(text, /dump|path|invocation|aaaa/);
    }
  } finally { for (const task of ['backup','restore']) await unlink(join(dir,task+'.json')).catch(()=>undefined); await rmdir(dir); }
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
    await assert.rejects(readFileMetrics(path, "expectations", now), { code: "INVALID_METRICS" });
    const off = { enabled: false, enabled_at: 0, maintenance_from: 0, maintenance_until: 0 };
    await writeFile(path, JSON.stringify({ schema_version: 1, autopublish: off, backup: off, restore: off }));
    const disabled = await readFileMetrics(path, "expectations", now);
    assert.match(disabled, /expected_enabled\{task="autopublish"} 0/); assert.doesNotMatch(disabled, /deadline/);
    await writeFile(path, JSON.stringify({ schema_version: 1, autopublish: off, backup: { ...off, enabled: true, enabled_at: now-1000 }, restore: off }));
    assert.match(await readFileMetrics(path, "expectations", now), new RegExp(`deadline_timestamp_seconds\\{task="backup"} ${now-1000+26*3600}`));
    await writeFile(join(dir,'backup.json'), JSON.stringify({ ...state, task:'backup' }));
    assert.match(await readFileMetrics(path, "expectations", now), new RegExp(`deadline_timestamp_seconds\\{task="backup"} ${now-2+26*3600}`));
    await writeFile(join(dir,'backup.json'), '{');
    assert.doesNotMatch(await readFileMetrics(path, "expectations", now), /deadline_timestamp_seconds\{task="backup"}/);
    await unlink(path); await assert.rejects(readFileMetrics(path, "expectations", now), { code: "ENOENT" });
  } finally { await unlink(path).catch(() => undefined); await unlink(join(dir,'backup.json')).catch(() => undefined); await rmdir(dir); }
});
