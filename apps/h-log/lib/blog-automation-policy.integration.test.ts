import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import pg from "pg";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { changeAutomationPolicy, readAutomationPolicy, withAutomationPolicy } from "./blog-automation-policy.ts";
import { runDailyAutomationOnce } from "./blog-automation-runner.ts";

const enabled = { HLOG_BLOG_DRAFT_GENERATION_ENABLED: "1", HLOG_BLOG_AUTO_PUBLISH_ENABLED: "1", HLOG_BLOG_JOBS_ENABLED: "1" };

test("policy persists revisions, serializes admissions, audits atomically and blocks CLI bypass", { skip: !process.env.DATABASE_URL }, async () => {
  await withDatabase(async (pool, url) => {
    assert.deepEqual((await readAutomationPolicy(pool, enabled)).effective, { generation: false, publication: false, jobs: false });
    const cli = await promisify(execFile)(process.execPath, ["--no-warnings", "--experimental-strip-types", "scripts/blog-auto-publish.mjs", "--once"], { env: { ...process.env, ...enabled, DATABASE_URL: url, HLOG_AUTO_PUBLISH_INPUT_FILE: "must-not-open-while-paused.json" } });
    const output = JSON.parse(cli.stdout);
    assert.equal(output.status, "paused"); assert.match(output.postId, /^post-\d{4}-\d{2}-\d{2}$/);
    const noInput = await promisify(execFile)(process.execPath, ["--no-warnings", "--experimental-strip-types", "scripts/blog-auto-publish.mjs", "--once"], { env: { ...process.env, ...enabled, DATABASE_URL: url, HLOG_AUTO_PUBLISH_INPUT_FILE: "" } });
    assert.equal(JSON.parse(noInput.stdout).postId, output.postId, "paused generation must hand off existing public verification even without generation input");
    const c = { commandId: randomUUID(), expectedRevision: 0, generation: true, publication: true, jobs: true, reason: "합성 자료로 정책 검증" };
    const [first, duplicate] = await Promise.all([changeAutomationPolicy(pool, c), changeAutomationPolicy(pool, c)]);
    assert.deepEqual(first, duplicate); assert.equal(first.revision, 1);
    await assert.rejects(changeAutomationPolicy(pool, { ...c, jobs: false }), /command_conflict/);
    const race = await Promise.allSettled([false, true].map(jobs => changeAutomationPolicy(pool, { ...c, commandId: randomUUID(), expectedRevision: 1, jobs })));
    assert.equal(race.filter(r => r.status === "fulfilled").length, 1);
    assert.equal((await readAutomationPolicy(pool, enabled)).revision, 2);
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>(r => { entered = r; }), paused = new Promise<void>(r => { release = r; });
    const admission = withAutomationPolicy(pool, async (_, p) => { entered(); await paused; return p.revision; }, enabled);
    await started;
    const off = changeAutomationPolicy(pool, { ...c, commandId: randomUUID(), expectedRevision: 2, jobs: false });
    release(); assert.equal(await admission, 2); assert.equal((await off).revision, 3);
    assert.equal(await withAutomationPolicy(pool, async (_, p) => p.effective.generation, enabled), false);
    const restarted = new pg.Pool({ connectionString: url });
    try { assert.equal((await readAutomationPolicy(restarted, enabled)).reasons.generation, "jobs_paused"); }
    finally { await restarted.end(); }
    assert.equal((await readAutomationPolicy(pool, {})).reasons.generation, "server_disabled");
    await pool.query("create function reject_policy_audit() returns trigger language plpgsql as $$ begin raise exception 'test audit failure'; end $$");
    await pool.query("create trigger reject_policy_audit before update on admin_actions for each row execute function reject_policy_audit()");
    await assert.rejects(changeAutomationPolicy(pool, { ...c, commandId: randomUUID(), expectedRevision: 3 }), /test audit failure/);
    assert.equal((await readAutomationPolicy(pool, enabled)).revision, 3);
    assert.equal((await pool.query("select count(*)::int n from admin_actions where action_type='automation_policy_changed'")).rows[0].n, 3);
    await pool.query("drop trigger reject_policy_audit on admin_actions");
    await pool.query("alter table blog_automation_policy rename to unavailable_policy");
    await assert.rejects(readAutomationPolicy(pool, enabled), /policy_unavailable/);
  });
});

test("daily generation respects OFF, quality gates, pause after provider and unknown outcomes", { skip: !process.env.DATABASE_URL }, async () => {
  for (const scenario of ["draft", "publish", "pause", "quality", "unknown", "db-error"]) await withDatabase(async pool => {
    const now = new Date().toISOString();
    const source = { id: "source", publisher: "Example", title: "런타임 변경", summary: "공식 변경 사항", url: "https://example.com/releases/runtime" };
    const input = { personalContextItems: [{ id: "context", category: "H-Log", title: "워커 적용 검토", summary: "공개 자료로 워커 적용을 검토합니다.", allowedUsage: "applied_analysis", publicSafe: true, createdAt: now, updatedAt: now, version: 1 }],
      topicSources: [{ ...source, sourceType: "official_release_note", signals: { backendAutomationFit: true, directVerificationAvailable: true, originalSourceAvailable: true }, relevanceReason: "워커 적용 검토" }],
      researchPackSources: [{ ...source, fetchedAt: now, sourceRole: "official", excerpt: "공식 변경", claimMetadata: [{ claimId: "claim", claimText: "API 동작이 바뀌었습니다.", sourceId: "source" }] }] };
    const command = { commandId: randomUUID(), expectedRevision: 0, generation: true, publication: scenario !== "draft", jobs: true, reason: "합성 실행 검증" };
    await changeAutomationPolicy(pool, command);
    let calls = 0;
    const options: Parameters<typeof runDailyAutomationOnce>[0] = { pool, runAt: now, environment: { ...enabled, HLOG_DAILY_ESTIMATED_COST_LIMIT: "1", HLOG_MONTHLY_ESTIMATED_COST_LIMIT: "10" }, loadInput: async () => input, generateArticle: async () => {
      calls++;
      if (scenario === "unknown") throw Error("fake provider disconnected");
      if (scenario === "pause") await changeAutomationPolicy(pool, { ...command, commandId: randomUUID(), expectedRevision: 1, jobs: false });
      if (scenario === "db-error") await pool.query("alter table blog_automation_policy rename to unavailable_policy");
      return { output: { title: "런타임 변경과 워커", description: "공식 변경 사항의 적용 조건을 살펴봐요.", slug: "runtime-conditions", articleMode: "applied_analysis", contentMarkdown: "## 변경 내용\n\nAPI 동작이 바뀌었습니다.\n", tags: ["운영"], claims: [{ id: "claim", text: "API 동작이 바뀌었습니다.", type: "api", sourceId: scenario === "quality" ? "missing" : "source" }], sources: [source.url], evidencePaths: [], personalContextIds: ["context"], publishDecision: "publish", blockReason: null }, usage: { estimatedCost: 0.01, inputTokens: 100, outputTokens: 100, provider: "fake", model: "fake" } };
    } };
    if (scenario === "unknown") {
      await assert.rejects(runDailyAutomationOnce(options), /fake provider/);
      assert.equal((await runDailyAutomationOnce(options)).status, "attention_required"); assert.equal(calls, 1); return;
    }
    const result = await runDailyAutomationOnce(options);
    assert.equal(calls, 1, JSON.stringify(result));
    if (["quality", "db-error"].includes(scenario)) {
      assert.equal((await pool.query("select count(*)::int n from posts")).rows[0].n, 0);
      assert.equal(result.status, scenario === "quality" ? "generation_failed" : "policy_unavailable");
      if (scenario === "quality") {
        assert.equal((await runDailyAutomationOnce(options)).status, "generation_failed");
        assert.equal(calls, 2);
        assert.equal((await pool.query("select count(*)::int n from usage_events where event_type='llm'")).rows[0].n, 2, "each admitted call must be charged even when quality failures are retried on the same day");
        assert.equal((await runDailyAutomationOnce({ ...options, environment: { ...options.environment, HLOG_DAILY_ESTIMATED_COST_LIMIT: "0.02" } })).status, "budget_exceeded");
        assert.equal(calls, 2);
      }
      return;
    }
    assert.equal(result.status, scenario === "publish" ? "publishing" : "drafted");
    assert.equal((await pool.query("select status from posts")).rows[0].status, result.status);
    assert.equal((await pool.query("select count(*)::int n from publish_jobs")).rows[0].n, scenario === "publish" ? 6 : 0);
    const revision = (await pool.query("select command_receipt from admin_actions where action_type='automation_admitted'")).rows[0].command_receipt;
    assert.equal(revision.revision, 1); assert.equal(revision.status, "completed");
  });
});

async function withDatabase(run: (pool: pg.Pool, url: string) => Promise<void>) {
  const base = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
  const name = `hlog_policy_${randomUUID().replaceAll("-", "")}`, url = new URL(`/${name}`, base).href;
  const admin = new pg.Client({ connectionString: new URL("/postgres", base).href });
  await admin.connect(); await admin.query(`create database ${name}`);
  const pool = new pg.Pool({ connectionString: url });
  try { await runBlogMigrations(url); await run(pool, url); }
  finally { await pool.end(); await admin.query(`drop database ${name} with (force)`); await admin.end(); }
}
