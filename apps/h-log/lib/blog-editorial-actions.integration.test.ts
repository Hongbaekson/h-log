import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { createPostVersionContentFromMarkdown, requiredPublishJobTypes } from "./blog-content-model.ts";
import { createBlogEditorialRepository } from "./blog-editorial-actions.ts";
import { createPostgresBlogRepository } from "./blog-postgres-repository.ts";
import { runPersistentWorkerOnce } from "./blog-persistent-worker.ts";
import { createPostgresRequiredPublishJobAdapter } from "./blog-required-publish-job-adapter.ts";

test("editorial versions preserve public content, validate evidence and commit commands with audit atomically", { skip: !process.env.DATABASE_URL && "DATABASE_URL required" }, async () => {
  const base = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
  const name = `hlog_editorial_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Client({ connectionString: new URL("/postgres", base).href });
  await admin.connect(); await admin.query(`create database ${name}`);
  const url = new URL(`/${name}`, base).href, pool = new pg.Pool({ connectionString: url });
  try {
    await runBlogMigrations(url);
    const old = createPostVersionContentFromMarkdown("# 공개 원본\n\n이미 공개한 내용입니다.\n");
    await pool.query("insert into posts (id,slug,title,description,article_mode,status,created_at,updated_at) values ('post','editorial-example','공개 원본','요약','document_analysis','published',now(),now())");
    await pool.query("insert into post_versions (id,post_id,version_no,title,description,content_markdown,content_html,content_hash,created_by,created_at) values ('old','post',1,'공개 원본','요약',$1,$2,$3,'system',now())", [old.contentMarkdown, old.contentHtml, old.contentHash]);
    await pool.query("update posts set current_version_id='old' where id='post'");
    await pool.query("insert into post_sources values ('source','post',null,'https://www.postgresql.org/docs/current/transaction-iso.html','격리 수준','PostgreSQL','official',now(),'문서','hash')");
    const repository = createBlogEditorialRepository(pool, { publishEnabled: true });
    const draft = { title: "격리 수준을 읽고 확인한 것", description: "공식 문서를 바탕으로 확인한 내용", contentMarkdown: "## 격리 수준\n\n트랜잭션은 격리 수준을 선택할 수 있습니다.\n", claims: [{ text: "트랜잭션은 격리 수준을 선택할 수 있습니다.", type: "api", sourceId: "source", evidencePath: "", evidenceQuote: "" }], evidencePaths: [] };
    const save = { action: "save", commandId: randomUUID(), postId: "post", expectedRevision: 0, expectedStatus: "published", expectedCurrentVersionId: "old", versionId: "old", reason: "본문의 설명을 보완함", draft };
    const result = await repository.execute(save);
    assert.equal(result.commandRevision, 1); assert.equal(result.versionNo, 2);
    const publicRepo = createPostgresBlogRepository(pool);
    assert.equal((await publicRepo.findPublicBlogContent()).versions[0].contentMarkdown, old.contentMarkdown);
    assert.deepEqual(await repository.execute(save), result);
    await assert.rejects(repository.execute({ ...save, reason: "다른 내용" }), /command_conflict/);
    await assert.rejects(repository.execute({ ...save, commandId: randomUUID() }), /revision_conflict/);
    const selected = (await pool.query("select * from post_versions where id=$1", [result.versionId])).rows[0];
    const publish = { action: "publish", commandId: randomUUID(), postId: "post", expectedRevision: 1, expectedStatus: "published", expectedCurrentVersionId: "old", versionId: result.versionId, contentHash: selected.content_hash, reason: "본문과 근거 검토 완료", confirmed: true };
    await assert.rejects(createBlogEditorialRepository(pool).execute(publish), /publication_disabled/);
    await assert.rejects(repository.execute({ ...publish, confirmed: false }), /review_required/);
    await assert.rejects(repository.execute({ ...publish, contentHash: "a".repeat(64) }), /version_conflict/);
    // A failed audit insert must roll back the new private version and revision.
    await pool.query("create function reject_editorial_audit() returns trigger language plpgsql as $$ begin raise exception 'synthetic audit failure'; end $$");
    await pool.query("create trigger reject_editorial_audit before update on admin_actions for each row execute function reject_editorial_audit()");
    await assert.rejects(repository.execute({ ...save, commandId: randomUUID(), expectedRevision: 1, versionId: result.versionId }), /synthetic audit failure/);
    assert.equal((await pool.query("select count(*)::int as n from post_versions")).rows[0].n, 2);
    await pool.query("drop trigger reject_editorial_audit on admin_actions");
    await pool.query("update post_sources set source_role='discovery' where id='source'");
    await assert.rejects(repository.execute(publish), /quality_blocked/);
    await pool.query("update post_sources set source_role='official' where id='source'");
    await pool.query("update post_versions set editorial_review=jsonb_set(editorial_review,'{claims}','[]') where id=$1", [result.versionId]);
    await assert.rejects(repository.execute(publish), /quality_blocked/);
    await pool.query("update post_versions set editorial_review=$2 where id=$1", [result.versionId,selected.editorial_review]);
    const accepted = await repository.execute(publish);
    assert.equal(accepted.status, "publishing");
    assert.equal((await publicRepo.findPublicBlogContent()).posts.length, 0);
    assert.equal((await pool.query("select count(*)::int as n from publish_jobs")).rows[0].n, requiredPublishJobTypes.length);
    await pool.query("insert into publish_jobs (id,post_id,post_version_id,type,importance,idempotency_key,status,retry_count) values ('000-old-job','post','old','render','required','old-job','queued',0)");
    const adapter = createPostgresRequiredPublishJobAdapter({ pool, publicBaseUrl: "https://hlog.example", fetch: async input => {
      const path = new URL(String(input)).pathname;
      return new Response(path.endsWith(".md") ? selected.content_markdown : path === "/sitemap.xml" ? "https://hlog.example/blog/editorial-example" : "ok");
    } });
    for (let i=0;i<6;i++) assert.equal((await runPersistentWorkerOnce({ pool, adapter, runAt: new Date().toISOString(), workerId: "editorial-test" })).status, "succeeded");
    assert.equal((await publicRepo.findPublicBlogContent()).versions[0].id, result.versionId);
    const edit = { ...save, commandId: randomUUID(), expectedRevision: 2, expectedCurrentVersionId: result.versionId, versionId: result.versionId };
    const concurrent = await Promise.allSettled([repository.execute(edit), repository.execute({ ...edit, commandId: randomUUID() })]);
    assert.equal(concurrent.filter(r=>r.status==="fulfilled").length, 1);
    assert.equal((await publicRepo.findPublicBlogContent()).versions[0].id, result.versionId);
    const retract = { action: "retract", commandId: randomUUID(), postId: "post", expectedRevision: 3, expectedStatus: "published", expectedCurrentVersionId: result.versionId, versionId: result.versionId, reason: "추가 확인이 필요해 철회함" };
    // A post-publication verifier finishing after retraction must not resurrect it.
    await pool.query("update publish_jobs set status='queued' where type='public_url' and post_id='post'");
    const late = await runPersistentWorkerOnce({ pool, workerId: "late-check", runAt: new Date().toISOString(), adapter: { async run() {
      await repository.execute(retract); return { status: "failed", error: "synthetic late failure" };
    } } });
    assert.equal(late.status, "failed");
    assert.equal((await pool.query("select status from posts where id='post'")).rows[0].status, "retracted");
    assert.equal((await publicRepo.findPublicBlogContent()).posts.length, 0);
    assert.deepEqual(await repository.execute(publish), accepted); // receipt does not republish
    await assert.rejects(repository.execute({ ...edit, expectedRevision: 4, expectedStatus: "retracted" }), /state_conflict/);
    assert.equal((await pool.query("select content_markdown from post_versions where id='old'")).rows[0].content_markdown, old.contentMarkdown);
  } finally { await pool.end(); await admin.query(`drop database ${name} with (force)`); await admin.end(); }
});
