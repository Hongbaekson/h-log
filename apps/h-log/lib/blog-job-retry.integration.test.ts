import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { createPostVersionContentFromMarkdown } from "./blog-content-model.ts";
import { retryAdminJob } from "./blog-job-retry.ts";
import { changeAutomationPolicy } from "./blog-automation-policy.ts";
import { runPersistentWorkerOnce } from "./blog-persistent-worker.ts";

const environment = { HLOG_BLOG_JOBS_ENABLED: "1", HLOG_BLOG_AUTO_PUBLISH_ENABLED: "1", HLOG_BLOG_MANUAL_PUBLISH_ENABLED: "1" };
test("bounded retries preserve jobs and audit, serialize with workers, pause and retraction", { skip: !process.env.DATABASE_URL }, async () => {
  const base = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
  const name = `hlog_retry_${process.pid}`, url = new URL(`/${name}`, base).href;
  const admin = new pg.Client({ connectionString: new URL("/postgres", base).href });
  await admin.connect(); await admin.query(`create database ${name}`);
  const pool = new pg.Pool({ connectionString: url });
  const content = createPostVersionContentFromMarkdown("## 로컬 테스트\n\n합성 내용입니다.\n");
  const seed = async (type = "render", importance = "required", state = "failed_publish") => {
    await pool.query("truncate posts,admin_actions,usage_events cascade");
    await pool.query("insert into posts(id,slug,title,description,article_mode,status,created_at,updated_at) values('post','fixture','검증','요약','project_record',$1,now(),now())", [state]);
    await pool.query("insert into post_versions(id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) values('v','post',1,'검증','요약',$1,$2,$3,'admin',now())", [content.contentMarkdown, content.contentHtml, content.contentHash]);
    await pool.query("update posts set current_version_id='v'");
    const row = (await pool.query("insert into publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status,error,retry_count) values('PRIVATE-LEGACY-ID','post','v',$1,$2,'original-key','failed','raw failure',1) returning admin_id", [type, importance])).rows[0];
    return { commandId: randomUUID(), jobId: row.admin_id, expectedRetryCount: 1, expectedPostRevision: 0, expectedVersion: 1, expectedHash: content.contentHash, reason: "실패 원인을 확인하고 조치했습니다", confirmed: true };
  };
  try {
    await runBlogMigrations(url);
    await changeAutomationPolicy(pool, { commandId: randomUUID(), expectedRevision: 0, generation: false, publication: true, jobs: true, reason: "합성 검증" });
    let c = await seed();
    const receipts = await Promise.all([retryAdminJob(pool,c,environment), retryAdminJob(pool,c,environment)]);
    assert.deepEqual(receipts[0],receipts[1]); assert.equal(receipts[0].retryCount,2);
    assert.equal((await pool.query("select count(*)::int n from admin_actions where action_type='retry'")).rows[0].n,1);
    assert.equal((await pool.query("select count(*)::int n from publish_jobs")).rows[0].n,1);
    assert.equal((await pool.query("select status,retry_count,idempotency_key from publish_jobs")).rows[0].idempotency_key,"original-key");
    await assert.rejects(retryAdminJob(pool,{...c,reason:"다른 조치 사유"},environment), /command_conflict/);
    await assert.rejects(retryAdminJob(pool,{...c,commandId:randomUUID()},environment), /state_conflict/);
    let calls=0;
    const adapter={ async run(){ calls++; return {status:"succeeded" as const}; } };
    const run = (workerId:string) => runPersistentWorkerOnce({pool,runAt:new Date().toISOString(),workerId,adapter,environment});
    const workers=await Promise.all([run("one"),run("two")]);
    assert.equal(calls,1); assert(workers.some(r=>r.status==="succeeded"));
    // Success is idempotently acknowledged even after the worker has completed.
    const restarted=new pg.Pool({connectionString:url});
    try { assert.deepEqual(await retryAdminJob(restarted,c,environment),receipts[0]); } finally {await restarted.end();}
    c=await seed();
    const competing=await Promise.allSettled([retryAdminJob(pool,c,environment),retryAdminJob(pool,{...c,commandId:randomUUID()},environment)]);
    assert.equal(competing.filter(r=>r.status==="fulfilled").length,1);
    assert.equal((await pool.query("select count(*)::int n from admin_actions where action_type='retry'")).rows[0].n,1);
    // Required failures do not reset the manual budget, including after restart.
    for(let count=2;count<=3;count++) {
      await runPersistentWorkerOnce({pool,runAt:new Date().toISOString(),workerId:`failure-${count}`,adapter:{async run(){return {status:"failed",error:"same failure"};}},environment});
      const command={...c,commandId:randomUUID(),expectedRetryCount:count,expectedPostRevision:count-1};
      if(count===3) await assert.rejects(retryAdminJob(pool,command,environment),/retry_limit/);
      else await retryAdminJob(pool,command,environment);
    }
    for (const state of ["queued","running","succeeded"]) {
      c=await seed(); await pool.query("update publish_jobs set status=$1",[state]);
      await assert.rejects(retryAdminJob(pool,c,environment),/state_conflict/);
    }
    for(const state of ["retracted","unpublished","drafted","correction_pending"]) {
      c=await seed("render","required",state); await assert.rejects(retryAdminJob(pool,c,environment),/state_conflict/);
    }
    c=await seed(); await pool.query("update publish_jobs set retry_count=3");
    await assert.rejects(retryAdminJob(pool,{...c,expectedRetryCount:3},environment),/retry_limit/);
    c=await seed(); await pool.query("update publish_jobs set lease_owner='worker',lease_expires_at=now()+interval '1 minute'");
    await assert.rejects(retryAdminJob(pool,c,environment),/lease_active/);
    c=await seed(); await pool.query("update publish_jobs set lease_owner='old',lease_expires_at=now()-interval '1 minute'");
    await retryAdminJob(pool,c,environment);
    assert.equal((await pool.query("select lease_owner from publish_jobs")).rows[0].lease_owner,null);
    c=await seed(); await assert.rejects(retryAdminJob(pool,{...c,expectedHash:"f".repeat(64)},environment),/version_conflict/);
    await pool.query("update post_versions set content_markdown='변경된 원문'");
    await assert.rejects(retryAdminJob(pool,c,environment),/version_conflict/);
    c=await seed(); await pool.query("update posts set current_version_id=null");
    await assert.rejects(retryAdminJob(pool,c,environment),/version_conflict/);
    c=await seed("public_url","required","correction_pending");
    await assert.rejects(retryAdminJob(pool,c,environment),/retry_not_supported/);
    c=await seed("discord","retryable","published");
    await assert.rejects(retryAdminJob(pool,c,environment),/retry_not_supported/);
    c=await seed("feed","retryable","published"); await retryAdminJob(pool,c,environment);
    assert.equal((await pool.query("select status from posts")).rows[0].status,"published");
    // Policy is read under the same lock as claim: pause prevents new retries/claims.
    c=await seed();
    await changeAutomationPolicy(pool,{commandId:randomUUID(),expectedRevision:1,generation:false,publication:true,jobs:false,reason:"처리 중지"});
    await assert.rejects(retryAdminJob(pool,c,environment),/automation_paused/);
    assert.equal((await run("paused")).status,"idle");
    await changeAutomationPolicy(pool,{commandId:randomUUID(),expectedRevision:2,generation:false,publication:true,jobs:true,reason:"처리 재개"});
    await assert.rejects(retryAdminJob(pool,c,{}),/automation_paused/);
    // Retraction holding the post lock wins before retry, and its rollback leaves no audit.
    const blocker=await pool.connect(); await blocker.query("begin"); await blocker.query("update posts set status='retracted' where id='post'");
    const pending=retryAdminJob(pool,c,environment);
    await blocker.query("commit"); blocker.release();
    await assert.rejects(pending,/state_conflict/);
    c=await seed();
    await pool.query("create function fail_retry_audit() returns trigger language plpgsql as $$ begin raise exception 'synthetic audit failure'; end $$");
    await pool.query("create trigger fail_retry_audit before update on admin_actions for each row execute function fail_retry_audit()");
    await assert.rejects(retryAdminJob(pool,c,environment),/synthetic audit/);
    assert.equal((await pool.query("select status,retry_count from publish_jobs")).rows[0].status,"failed");
    assert.equal((await pool.query("select count(*)::int n from admin_actions where action_type='retry'")).rows[0].n,0);
    await pool.query("drop trigger fail_retry_audit on admin_actions");
    // A held job lock is a safe conflict, never a post/job deadlock.
    const holder=await pool.connect();await holder.query("begin");await holder.query("select 1 from publish_jobs for update");
    await assert.rejects(retryAdminJob(pool,c,environment),/state_conflict/);
    await holder.query("rollback");holder.release();
    await assert.rejects(retryAdminJob(pool,{...c,reason:"연락 test@example.com"},environment),/unsafe_reason/);
  } finally {await pool.end(); await admin.query(`drop database ${name} with (force)`); await admin.end();}
});
