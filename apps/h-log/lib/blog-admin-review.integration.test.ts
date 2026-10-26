import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { createPostVersionContentFromMarkdown } from "./blog-content-model.ts";
import { readAdminPosts, parseAdminPostReviewQuery } from "./blog-admin-review.ts";
import { createPostgresBlogRepository } from "./blog-postgres-repository.ts";
import { getPublicBlogIndex } from "./blog-public.ts";

test("private review pages all states and exact historical versions without mutating or widening public reads", { skip: !process.env.DATABASE_URL && "DATABASE_URL is required" }, async () => {
  const base = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Use an isolated local database");
  const admin = new pg.Client({ connectionString: new URL("/postgres", base).href });
  const name = `hlog_admin_review_${process.pid}`;
  await admin.connect();
  await admin.query(`create database ${name}`);
  const url = new URL(`/${name}`, base).href;
  const pool = new pg.Pool({ connectionString: url });
  try {
    await runBlogMigrations(url);
    for (let i = 0; i < 23; i++) {
      const id = `post-${String(i).padStart(2, "0")}`;
      const state = i === 0 ? "drafted" : i === 1 ? "failed_verification" : "published";
      await pool.query("insert into posts (id,slug,title,description,article_mode,status,created_at,updated_at,published_at) values ($1,$1,$1,'summary','project_record',$2,now(),now(),case when $2='published' then now() end)", [id, state]);
      const content = createPostVersionContentFromMarkdown(`# ${id}\n\nPRIVATE-REVIEW-${i}\n`);
      await pool.query("insert into post_versions (id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) values ($1,$2,1,$2,'summary',$3,$4,$5,'admin',now())", [`v-${id}`, id, content.contentMarkdown, content.contentHtml, content.contentHash]);
      await pool.query("update posts set current_version_id=$1 where id=$2", [`v-${id}`, id]);
    }
    const newer = createPostVersionContentFromMarkdown("# 현재 비공개 원고\n\nPRIVATE-CURRENT-V2\n");
    await pool.query("insert into post_versions (id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) values ('v2','post-00',2,'현재 비공개 원고','summary',$1,$2,$3,'system',now())", [newer.contentMarkdown, newer.contentHtml, newer.contentHash]);
    await pool.query("update posts set current_version_id='v2' where id='post-00'");
    await pool.query("insert into post_sources values ('source','post-00',null,'javascript:alert(1)','출처','문서','reference',now(),'summary','hash')");
    await pool.query("insert into publish_verifications values ('check','post-00','v-post-00','public_url','failed',404,'SECRET-RAW-VERIFICATION',now())");
    await pool.query("insert into publish_jobs (id,post_id,post_version_id,type,importance,idempotency_key,status,retry_count,error) values ('job','post-00','v-post-00','render','required','fixture','failed',1,'SECRET-RAW-JOB')");
    const before = (await pool.query("select row_to_json(p) as data from posts p order by id")).rows;
    const versionsBefore = (await pool.query("select row_to_json(v) as data from post_versions v order by id")).rows;
    const first = await readAdminPosts(pool, parseAdminPostReviewQuery({}));
    const second = await readAdminPosts(pool, parseAdminPostReviewQuery({ page: "2" }));
    assert.equal(first.posts.length, 20); assert.equal(first.hasNext, true);
    assert.equal(second.posts.length, 3); assert.equal(second.hasNext, false);
    assert.equal(new Set([...first.posts, ...second.posts].map(p => p.id)).size, 23);
    const current = await readAdminPosts(pool, parseAdminPostReviewQuery({ status: "drafted", post: "post-00" }));
    assert.equal(current.posts.length, 1); assert.equal(current.review?.version?.id, "v2");
    const old = await readAdminPosts(pool, parseAdminPostReviewQuery({ post: "post-00", version: "1" }));
    assert.equal(old.review?.version?.id, "v-post-00");
    assert.equal(old.review?.post.currentVersionId, "v2"); assert.equal(old.review?.hashMatches, true);
    assert.equal(old.review?.checks[0].status, "failed"); assert.equal(old.review?.jobs[0].status, "failed");
    assert.equal(old.review?.sources[0].href, null);
    assert.doesNotMatch(JSON.stringify(old), /SECRET-RAW/);
    assert.equal((await readAdminPosts(pool, parseAdminPostReviewQuery({ post: "post-01", version: "2" }))).review, null);
    assert.equal((await readAdminPosts(pool, parseAdminPostReviewQuery({ post: "missing" }))).review, null);
    const publicStore = await createPostgresBlogRepository(pool).findPublicBlogContent();
    assert.equal(getPublicBlogIndex(publicStore, { pageSize: 100 }).posts.length, 21);
    assert(!publicStore.posts.some(p => ["post-00", "post-01"].includes(p.id)));
    assert.deepEqual((await pool.query("select row_to_json(p) as data from posts p order by id")).rows, before);
    assert.deepEqual((await pool.query("select row_to_json(v) as data from post_versions v order by id")).rows, versionsBefore);
    await pool.query("update post_versions set content_hash=repeat('a',64) where id='v2'");
    assert.equal((await readAdminPosts(pool, parseAdminPostReviewQuery({ post: "post-00" }))).review?.hashMatches, false);
    await pool.query("update post_versions set content_markdown=repeat('x',262145) where id='v2'");
    const large = (await readAdminPosts(pool, parseAdminPostReviewQuery({ post: "post-00" }))).review!;
    assert.equal(large.version?.contentMarkdown, null); assert.equal(large.hashMatches, null);
    await pool.query("update posts set current_version_id=null where id='post-01'");
    assert.equal((await readAdminPosts(pool, parseAdminPostReviewQuery({ post: "post-01" }))).review?.version?.versionNo, 1);
  } finally {
    await pool.end(); await admin.query(`drop database ${name} with (force)`); await admin.end();
  }
});
