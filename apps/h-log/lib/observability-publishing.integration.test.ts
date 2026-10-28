import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { createPostVersionContentHash, requiredPublishJobTypes } from "./blog-content-model.ts";
import { renderPublishingMetrics, verifyPublication } from "./observability-publishing.ts";

test("monitoring migration, publication proof and bounded private aggregates", { skip: !process.env.DATABASE_URL && "DATABASE_URL is required" }, async t => {
  const base = new URL(process.env.DATABASE_URL!);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
  const admin = new pg.Client({ connectionString: new URL("/postgres", base).href });
  const name = `hlog_signals_${process.pid}`;
  await admin.connect(); await admin.query(`CREATE DATABASE ${name}`);
  const url = new URL(`/${name}`, base).href;
  const pool = new pg.Pool({ connectionString: url });
  let createdRole = false;
  try {
    await pool.query("CREATE TABLE schema_migrations(version text primary key, applied_at timestamptz not null default now())");
    for (const file of (await readdir(new URL("../migrations/", import.meta.url))).filter(f => /^0(0|1[01])/.test(f)).sort()) {
      await pool.query(await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
      await pool.query("INSERT INTO schema_migrations(version) VALUES($1)", [file.slice(0, -4)]);
    }
    await pool.query("INSERT INTO posts(id,slug,title,description,article_mode,status,created_at,updated_at) VALUES('post','post','PRIVATE-TITLE','PRIVATE-DESC','project_record','published',now(),now())");
    await pool.query("INSERT INTO post_versions(id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) VALUES('v1','post',1,'PRIVATE-TITLE','PRIVATE-DESC','PRIVATE-BODY','PRIVATE-HTML',repeat('a',64),'admin',now())");
    await pool.query("UPDATE posts SET current_version_id='v1'");
    await pool.query("INSERT INTO publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status) VALUES('old','post','v1','render','required','old','queued')");
    await pool.query("INSERT INTO usage_events(id,run_id,event_type,estimated_cost,status,created_at) VALUES('old','PRIVATE-RUN','llm',0,'success',now())");
    await runBlogMigrations(url);
    assert.equal((await pool.query("SELECT enqueued_at FROM publish_jobs WHERE id='old'")).rows[0].enqueued_at, null);
    assert.equal((await pool.query("SELECT cost_basis FROM usage_events WHERE id='old'")).rows[0].cost_basis, null);
    const inserted = (await pool.query("INSERT INTO publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status) VALUES('new','post','v1','public_url','required','new','queued') RETURNING enqueued_at")).rows[0].enqueued_at;
    assert.ok(inserted instanceof Date);
    await pool.query("UPDATE publish_jobs SET status='running',started_at=now(),lease_owner='synthetic',lease_expires_at=now()+interval '1 minute' WHERE id='new'");
    assert.equal((await pool.query("SELECT enqueued_at FROM publish_jobs WHERE id='new'")).rows[0].enqueued_at.toISOString(), inserted.toISOString());
    await t.test("success requires the current immutable version and every required job", async () => {
      const candidate = { status: "publishing", postId: "post", versionId: "v1" };
      await pool.query("DELETE FROM publish_jobs");
      const hash = createPostVersionContentHash({ contentMarkdown: "PRIVATE-BODY", contentHtml: "PRIVATE-HTML" });
      await pool.query("UPDATE post_versions SET content_hash=$1", [hash]);
      assert.equal(await verifyPublication(pool, candidate), false);
      for (const type of requiredPublishJobTypes) await pool.query("INSERT INTO publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status) VALUES($1,'post','v1',$1,'required',$1,'succeeded')", [type]);
      assert.equal(await verifyPublication(pool, candidate), true);
      assert.equal(await verifyPublication(pool, { ...candidate, status: "duplicate" }), false);
      assert.equal(await verifyPublication(pool, { ...candidate, versionId: "old-version" }), false);
      await pool.query("UPDATE publish_jobs SET status='failed' WHERE type='privacy_scan'");
      assert.equal(await verifyPublication(pool, candidate), false);
      await pool.query("UPDATE publish_jobs SET status='succeeded'; UPDATE post_versions SET content_markdown='changed'");
      assert.equal(await verifyPublication(pool, candidate), false);
      await pool.query("UPDATE post_versions SET content_markdown='PRIVATE-BODY'; UPDATE posts SET status='verifying'");
      assert.equal(await verifyPublication(pool, candidate), false);
      await pool.query("UPDATE posts SET status='published'");
    });
    await t.test("aggregate views keep legacy unknowns, UTC windows and raw-table permissions", async () => {
      if (!(await admin.query("SELECT 1 FROM pg_roles WHERE rolname='hlog_metrics_collector'")).rowCount) {
        await admin.query("CREATE ROLE hlog_metrics_collector NOLOGIN"); createdRole = true;
      }
      await pool.query("CREATE SCHEMA monitoring; GRANT USAGE ON SCHEMA monitoring TO hlog_metrics_collector");
      await pool.query(await readFile(new URL("../deploy/observability/publishing-views.sql", import.meta.url), "utf8"));
      await pool.query("DELETE FROM usage_events; DELETE FROM publish_jobs");
      await pool.query("INSERT INTO publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status,enqueued_at) VALUES('unknown','post','v1','render','required','unknown','queued',NULL)");
      let queue = (await pool.query("SELECT * FROM monitoring.publishing_queue ORDER BY importance")).rows;
      assert.equal(queue[0].age, null); assert.equal(queue[0].unknown, '1'); assert.equal(Number(queue[1].age), 0);
      await pool.query("INSERT INTO publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status,enqueued_at,lease_expires_at,lease_owner) VALUES('expired','post','v1','public_url','required','expired','running',now()-interval '5 minutes',now()-interval '1 minute','synthetic')");
      queue = (await pool.query("SELECT * FROM monitoring.publishing_queue ORDER BY importance")).rows;
      assert.equal(queue[0].expired, '1');
      await pool.query("INSERT INTO post_versions(id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) SELECT 'v2',post_id,2,title,description,content_markdown,content_html,content_hash,created_by,created_at FROM post_versions WHERE id='v1'; UPDATE posts SET current_version_id='v2'");
      assert.equal((await pool.query("SELECT * FROM monitoring.publishing_jobs")).rowCount, 0);
      assert.equal(Number((await pool.query("SELECT age FROM monitoring.publishing_queue WHERE importance='required'")).rows[0].age), 0);
      await pool.query("UPDATE posts SET current_version_id='v1'");
      await pool.query(`INSERT INTO usage_events(id,run_id,event_type,estimated_cost,cost_basis,status,created_at) VALUES
        ('known','PRIVATE-RUN','llm',2,'estimated','success',now()),
        ('zero','PRIVATE-RUN','llm',0,NULL,'success',now()),
        ('included','PRIVATE-RUN','llm',0,'included','success',now()),
        ('unknown','PRIVATE-RUN','llm',NULL,'unknown','success',now()),
        ('future','PRIVATE-RUN','llm',99,'estimated','success',now()+interval '1 day'),
        ('old','PRIVATE-RUN','llm',99,'estimated','success',date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'-interval '1 second')`);
      const usage = (await pool.query("SELECT * FROM monitoring.publishing_usage")).rows;
      for (const row of usage) { assert.equal(Number(row.known), 2); assert.equal(row.unknown, '2'); assert.equal(row.included, '1'); }
      const restricted = await pool.connect();
      await restricted.query("SET ROLE hlog_metrics_collector");
      try {
        const jobs = (await restricted.query("SELECT * FROM monitoring.publishing_jobs")).rows;
        const text = renderPublishingMetrics({ jobs, queue, usage }, {});
        assert.doesNotMatch(text, /PRIVATE|v1|post|run_id|content_markdown/);
        for (const sql of ['SELECT * FROM posts','SELECT * FROM usage_events',"UPDATE publish_jobs SET status='failed'"]) await assert.rejects(restricted.query(sql), e => (e as { code: string }).code === '42501');
      } finally { await restricted.query("RESET ROLE"); restricted.release(); }
      await pool.query("INSERT INTO usage_events(id,run_id,event_type,estimated_cost,cost_basis,status,created_at) SELECT 'scale-'||i,'synthetic','llm',0,'estimated','success',now()-interval '2 months' FROM generate_series(1,10000) i; ANALYZE usage_events; SET statement_timeout='3s'");
      const explain = (await pool.query("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM monitoring.publishing_usage")).rows[0]['QUERY PLAN'][0];
      assert.ok(explain['Execution Time'] < 3000);
      assert.match(JSON.stringify(explain), /usage_events_created_at_idx/);
      assert.equal((await pool.query("SELECT * FROM monitoring.publishing_usage")).rowCount, 2);
      await pool.query(`INSERT INTO posts(id,slug,title,description,article_mode,status,created_at,updated_at) SELECT 'scale-'||i,'scale-'||i,'synthetic','synthetic','project_record','published',now(),now() FROM generate_series(1,2000) i;
        INSERT INTO post_versions(id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) SELECT id,id,1,title,description,'synthetic','synthetic',repeat('a',64),'system',now() FROM posts WHERE id LIKE 'scale-%';
        UPDATE posts SET current_version_id=id WHERE id LIKE 'scale-%';
        INSERT INTO publish_jobs(id,post_id,post_version_id,type,importance,idempotency_key,status) SELECT id,id,id,'embedding','retryable',id,'queued' FROM posts WHERE id LIKE 'scale-%';
        ANALYZE posts; ANALYZE publish_jobs`);
      for (const view of ['publishing_jobs', 'publishing_queue']) {
        const plan = (await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM monitoring.${view}`)).rows[0]['QUERY PLAN'][0];
        assert.ok(plan['Execution Time'] < 3000);
      }
      assert.equal((await pool.query("SELECT count FROM monitoring.publishing_jobs WHERE job_type='embedding'")).rows[0].count, '2000');
    });
  } finally { await pool.end(); await admin.query(`DROP DATABASE ${name} WITH (FORCE)`); if (createdRole) await admin.query("DROP ROLE hlog_metrics_collector"); await admin.end(); }
});
