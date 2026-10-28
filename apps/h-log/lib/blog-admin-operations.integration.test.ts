import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { parseAuditQuery, parseJobsQuery, readAdminAudit, readAdminJobs } from "./blog-admin-operations.ts";

test("operations read bounded real ledgers, safe failures, exact versions and unknown costs without mutations", { skip: !process.env.DATABASE_URL && "DATABASE_URL is required" }, async () => {
  const base = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Use an isolated local database");
  const admin = new pg.Client({ connectionString: new URL("/postgres", base).href });
  const name = `hlog_operations_${process.pid}`;
  await admin.connect(); await admin.query(`create database ${name}`);
  const url = new URL(`/${name}`, base).href;
  const pool = new pg.Pool({ connectionString: url });
  try {
    await runBlogMigrations(url);
    const empty = await readAdminJobs(pool, parseJobsQuery({}));
    assert.equal(empty.jobs.length, 0); assert.equal(empty.hasNext, false);
    const noUsage = await readAdminAudit(pool, parseAuditQuery({}), {});
    assert.equal(noUsage.usage.day.events, 0); assert.equal(noUsage.usage.day.knownCost, 0);
    assert.equal(noUsage.usage.month.events, 0);
    await pool.query("insert into posts(id,slug,title,description,article_mode,status,created_at,updated_at) values ('post','post','SECRET-TITLE','SECRET-DESCRIPTION','project_record','published',now(),now())");
    await pool.query("insert into post_versions(id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) select 'v'||n,'post',n,'SECRET-TITLE','SECRET-DESCRIPTION','SECRET-BODY','SECRET-HTML',repeat('a',64),'admin',now() from generate_series(1,2) n");
    await pool.query("update posts set current_version_id='v2'");
    const states = ["queued", "running", "retrying", "failed", "succeeded"];
    for (let i = 0; i < states.length; i++) {
      await pool.query(`insert into publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status,retry_count,error,lease_owner,lease_expires_at,started_at,policy_revision)
        values ($1,'post','v1','render','required',$1,$2,2,'SECRET-RAW-ERROR /internal/path token=SECRET',case when $2='running' then 'SECRET-WORKER' end,case when $2='running' then now()-interval '1 minute' end,now()-interval '1 hour',3)`, [`j${i}`, states[i]]);
    }
    await pool.query("insert into publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status) values ('new','post','v2','discord','retryable','new','queued')");
    const jobs = await readAdminJobs(pool, parseJobsQuery({}));
    assert.deepEqual(jobs.jobs.slice(0,5).map(j => j.status), states);
    assert.equal(jobs.jobs[1].lease, "expired"); assert.equal(jobs.jobs[0].lease, "none");
    assert.equal(jobs.jobs[3].failure, "required_failed");
    assert.equal(jobs.jobs[0].targetVersion, 1); assert.equal(jobs.jobs[0].currentVersion, 2);
    assert.equal(jobs.jobs[0].publicVersion, 2); assert.equal(jobs.jobs[0].isCurrentVersion, false);
    assert.equal(jobs.jobs[0].targetHash, "a".repeat(64)); assert.equal(jobs.jobs[0].retryCount, 2);
    assert.equal(jobs.jobs[0].policyRevision, 3);
    assert.equal((await readAdminJobs(pool, parseJobsQuery({ lease: "expired" }))).jobs.length, 1);
    assert.equal((await readAdminJobs(pool, parseJobsQuery({ importance: "retryable" }))).jobs.length, 1);
    await pool.query("update posts set status='retracted'");
    assert.equal((await readAdminJobs(pool, parseJobsQuery({}))).jobs[0].publicVersion, null);
    await pool.query("insert into admin_actions(id,action_type,actor_type,actor_id,target_type,target_id,reason,created_at,command_id,request_fingerprint,command_receipt) values ('policy','automation_policy_changed','admin','SECRET-ACTOR','automation_policy','SECRET-TARGET','SECRET-REASON /internal/path',now(),$1,repeat('a',64),$2)", [randomUUID(), JSON.stringify({ revision: 3, requested: { generation: true, publication: false, jobs: true }, body: "SECRET-RECEIPT" })]);
    await pool.query("insert into usage_events(id,run_id,event_type,provider,model,estimated_cost,status,created_at) values ('known','SECRET-RUN','llm','SECRET-PROVIDER','SECRET-MODEL',1.25,'success',now()), ('zero','SECRET-RUN','llm',null,null,0,'success',now()), ('unknown','SECRET-RUN','llm',null,null,null,'failed',now()), ('old','run','llm',null,null,90,'success',date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'-interval '1 second'),('future','run','llm',null,null,80,'success',now()+interval '1 day')");
    const audit = await readAdminAudit(pool, parseAuditQuery({ target: "automation_policy", actor: "admin" }), { HLOG_DAILY_ESTIMATED_COST_LIMIT: "0", HLOG_MONTHLY_ESTIMATED_COST_LIMIT: "10" });
    assert.equal(audit.actions.length, 1); assert.equal(audit.actions[0].hasReason, true);
    assert.deepEqual(audit.actions[0].policy, { revision: 3, generation: true, publication: false, jobs: true });
    for (const window of [audit.usage.day, audit.usage.month]) {
      assert.equal(window.knownCost, 1.25); assert.equal(window.events, 3); assert.equal(window.unknownAmount, 1);
      assert.equal(window.unknownBasis, 3); // Current schema cannot distinguish included or estimated cost basis.
    }
    assert.deepEqual(audit.usage.day.limit, { state: "limited", amount: 0 });
    assert.doesNotMatch(JSON.stringify({ jobs, audit }), /SECRET|internal\/path/);
    // Large ledgers must still return at most 20 items plus a hasNext flag.
    await pool.query("insert into publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status) select 'z'||lpad(n::text,5,'0'),'post','v2','discord','retryable','bulk'||n,'queued' from generate_series(1,3000) n");
    await pool.query("insert into admin_actions(id,action_type,actor_type,actor_id,target_type,target_id,created_at) select 'z'||lpad(n::text,5,'0'),'save','admin','owner','post','post',now() from generate_series(1,3000) n");
    const before = (await pool.query("select (select count(*) from publish_jobs) jobs,(select count(*) from admin_actions) actions,(select sum(retry_count) from publish_jobs) retries,(select count(*) from usage_events) usage")).rows;
    for (const reader of [() => readAdminJobs(pool, parseJobsQuery({})), () => readAdminAudit(pool, parseAuditQuery({}), {})]) {
      const result = await reader(); assert.equal(result.hasNext, true);
      assert.equal("jobs" in result ? result.jobs.length : result.actions.length, 20);
    }
    const p1 = await readAdminJobs(pool, parseJobsQuery({ status: "queued", page: "1" }));
    const p2 = await readAdminJobs(pool, parseJobsQuery({ status: "queued", page: "2" }));
    assert.equal(new Set([...p1.jobs, ...p2.jobs].map(j => j.ref)).size, 40);
    const a1 = await readAdminAudit(pool, parseAuditQuery({ page: "1" }), {});
    const a2 = await readAdminAudit(pool, parseAuditQuery({ page: "2" }), {});
    assert.equal(new Set([...a1.actions,...a2.actions].map(a => a.ref)).size, 40);
    assert.deepEqual((await pool.query("select (select count(*) from publish_jobs) jobs,(select count(*) from admin_actions) actions,(select sum(retry_count) from publish_jobs) retries,(select count(*) from usage_events) usage")).rows, before);
    await pool.query("alter table publish_jobs rename to unavailable_jobs");
    await assert.rejects(readAdminJobs(pool, parseJobsQuery({}))); // Never turn DB failure into an empty queue.
    await pool.query("alter table usage_events rename to unavailable_usage");
    await assert.rejects(readAdminAudit(pool, parseAuditQuery({}), {}));
  } finally {
    await pool.end(); await admin.query(`drop database ${name} with (force)`); await admin.end();
  }
});
