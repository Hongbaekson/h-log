import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { runBlogMigrations } from "./blog-migrations.mjs";
import { makeBlogFixture } from "./performance-fixtures.mjs";
import { createPostgresBlogRepository } from "../lib/blog-postgres-repository.ts";
import { buildBlogCrawlerOutputs, buildPublicSitemapXml } from "../lib/blog-crawler-output.ts";
import { createPostVersionContentFromMarkdown } from "../lib/blog-content-model.ts";
import { brainCatalog } from "../lib/brain-catalog.ts";
import { selectPublicBrain } from "../lib/brain.ts";
import { createBrainRepository } from "../lib/brain-postgres-repository.ts";
import { projects } from "../lib/projects.ts";
import { runLocalProjection } from "../lib/public-read-rebuild.ts";
import { projectionContext } from "../lib/public-read-model.ts";
import { readCrawlerResponse } from "../lib/public-crawler.ts";

test("crawler artifacts follow the selected publication snapshot", { skip: process.env.HLOG_PROJECTION_TEST !== "1" }, async t => {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.match(url.pathname, /^\/hlog_projection_[a-z0-9_]+$/);
  const admin = new pg.Client({ connectionString: new URL("/postgres", url).href });
  await admin.connect();
  const name = "hlog_projection_" + randomUUID().replaceAll("-", "");
  await admin.query("create database " + name);
  const pool = new pg.Pool({ connectionString: new URL("/" + name, url).href });
  t.after(async () => {
    await pool.end();
    try { await admin.query("drop database " + name); } finally { await admin.end(); }
  });
  await admin.query(`comment on database ${name} is 'hlog-public-read-local-v1'`);
  await runBlogMigrations(pool.options.connectionString);
  const fixture = makeBlogFixture(10);
  const repo = createPostgresBlogRepository(pool);
  for (const post of fixture.posts) for (const version of fixture.versions.filter(v => v.postId === post.id)) {
    await repo.savePost({ post: { ...post, currentVersionId: version.id }, version,
      tags: fixture.tags.filter(tag => tag.postId === post.id), sources: [], assets: [], publishJobs: [] });
  }
  await pool.query("update posts set current_version_id=id||'-v1'");
  const rebuild = onProgress => runLocalProjection(pool, { command: "rebuild", kind: "all", confirmOwnedLocal: true, onProgress });
  await rebuild();
  const origin = "https://hlog.example.org", context = projectionContext();
  const sql = [];
  const tracked = { connect: async () => {
    const client = await pool.connect();
    return { query: (...args) => { sql.push(args[0]); return client.query(...args); }, release: () => client.release() };
  } };
  const response = (name, options = {}, site = origin, policy = context) =>
    readCrawlerResponse(tracked, name, site, policy, { mode: "projected", dbBrain: true, ...options });
  const text = async (...args) => {
    const res = await response(...args);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    const body = await res.text();
    assert.equal(Number(res.headers.get("content-length")), Buffer.byteLength(body));
    return body;
  };
  const outputs = { "feed.xml": "feedXml", "llms.txt": "llmsTxt", "llms-full.txt": "llmsFullTxt", "sitemap.xml": "sitemapXml" };
  await t.test("matches original bytes, reads Markdown only for full text, then reuses the selected artifact", async () => {
    const store = await repo.findPublicBlogContent(), expected = buildBlogCrawlerOutputs(store, { origin });
    expected.sitemapXml = buildPublicSitemapXml(store, { origin, paths: ["/", "/resume", "/portfolio", ...projects.map(p => "/portfolio/" + p.slug),
      "/blog", "/brain", ...selectPublicBrain(brainCatalog).nodes.map(n => "/brain/" + n.id)] });
    for (const [name, field] of Object.entries(outputs)) {
      sql.length = 0;
      assert.equal(await text(name), expected[field]);
      assert.equal(sql.some(query => query.includes("v.content_markdown")), name === "llms-full.txt");
      assert(sql.some(query => query.startsWith("fetch forward")));
      sql.length = 0;
      assert.equal(await text(name), expected[field]);
      assert(!sql.some(query => query.startsWith("fetch forward")), "warm artifact should skip body generation");
      assert.equal(await text(name, { mode: "shadow" }), expected[field]);
      assert.equal(await text(name, { mode: "source" }), expected[field]);
    }
    const other = await text("feed.xml", {}, "https://other.example.org");
    assert(other.includes("https://other.example.org/blog/")); assert(!other.includes(origin));
  });
  await t.test("withdrawal, version rollback, metadata, new policies and generation replacement invalidate reuse", async () => {
    const path = "/blog/perf-0000";
    await pool.query("update posts set status='retracted' where id='perf-0000'");
    for (const name of Object.keys(outputs)) assert(!(await text(name)).includes(path));
    await pool.query("update posts set status='published',current_version_id='perf-0000-v2' where id='perf-0000'");
    assert((await text("llms-full.txt")).includes("PERF_PRIVATE_UNSELECTED")); // Now explicitly selected in this synthetic DB.
    await pool.query("update posts set current_version_id='perf-0000-v1' where id='perf-0000'");
    assert(!(await text("llms-full.txt")).includes("PERF_PRIVATE_UNSELECTED"));
    await pool.query("update post_versions set title='변경된 제목' where id='perf-0000-v1'");
    const current = await text("feed.xml");
    assert(current.includes("변경된 제목"));
    const blocked = projectionContext({ restrictedTerms: [{ category: "organization_name", value: "변경된 제목" }] });
    assert(!(await text("feed.xml", {}, origin, blocked)).includes(path));
    let buildingChecked = false;
    await rebuild(async progress => {
      if (progress.status === "building" && !buildingChecked) {
        const { rows: [state] } = await pool.query("select active_generation from public_read_state");
        assert.notEqual(state.active_generation, progress.generation);
        assert.equal(await text("feed.xml"), current);
        buildingChecked = true;
      }
    });
    assert(buildingChecked);
    sql.length = 0; assert.equal(await text("feed.xml"), current);
    assert(sql.some(query => query.startsWith("fetch forward")));
    await pool.query("update public_read_state set writer_protocol=99");
    await assert.rejects(response("feed.xml"), /projection_unavailable/);
    await pool.query("update public_read_state set writer_protocol=1");
  });
  await t.test("sitemap follows Brain publication and fails closed when its source is unavailable", async () => {
    const brain = createBrainRepository(pool), command = commandRevision => ({ commandRevision, commandId: randomUUID() });
    const note = await brain.saveDraft({ title: "original", originalText: "draft", publicTitle: "공개 생각", publicSummary: "공개 요약",
      publicBody: "공개 본문", kind: "question", basis: "question", topic: "tools", tags: [], sources: [] }, undefined, 0, command(0));
    await brain.publish(note.id, 1, true, command(1));
    assert((await text("sitemap.xml")).includes("/brain/" + note.id));
    assert(!(await text("sitemap.xml", { dbBrain: false })).includes("/brain/" + note.id));
    await text("sitemap.xml");
    await pool.query("update public_read_sources set deleted=true where kind='brain' and source_id=$1", [note.id]);
    try { await assert.rejects(response("sitemap.xml"), /projection_marker_missing/); }
    finally { await pool.query("update public_read_sources set deleted=false where kind='brain' and source_id=$1", [note.id]); }
    await brain.unpublish(note.id, 1, command(2));
    assert(!(await text("sitemap.xml")).includes("/brain/" + note.id));
    await pool.query("alter table brain_notes rename to unavailable_notes");
    try { await assert.rejects(response("sitemap.xml")); assert((await text("feed.xml")).includes("<rss")); }
    finally { await pool.query("alter table unavailable_notes rename to brain_notes"); }
  });
  await t.test("source batches keep legacy slug ordering across page boundaries", async () => {
    await pool.query("update posts set slug=case id when 'perf-0000' then 'Z' when 'perf-0001' then 'a' when 'perf-0002' then '한글' else slug end");
    const original = fixture.versions.find(version => version.id === "perf-0000-v1");
    const large = createPostVersionContentFromMarkdown("가".repeat(370000));
    const replaceBody = content => pool.query("update post_versions set content_markdown=$1, content_html=$2, content_hash=$3 where id=$4",
      [content.contentMarkdown, content.contentHtml, content.contentHash, original.id]);
    try {
      await replaceBody(large);
      const expected = buildBlogCrawlerOutputs(await repo.findPublicBlogContent(), { origin }).feedXml;
      assert.equal(await text("feed.xml", { mode: "source" }), expected);
    } finally {
      await replaceBody(original);
      await pool.query("update posts set slug=id where slug<>id");
    }
  });
  await t.test("large full text preserves bytes, releases the snapshot before delivery and supports cancellation", async () => {
    const content = createPostVersionContentFromMarkdown("합성 본문입니다. ".repeat(8000));
    await pool.query("update post_versions set content_markdown=$1,content_html=$2,content_hash=$3 where id like '%-v1'",
      [content.contentMarkdown, content.contentHtml, content.contentHash]);
    await rebuild();
    const expected = buildBlogCrawlerOutputs(await repo.findPublicBlogContent(), { origin }).llmsFullTxt;
    assert(Buffer.byteLength(expected) > 1024*1024);
    const res = await response("llms-full.txt");
    await pool.query("update posts set status='retracted' where id='perf-0000'");
    assert.equal(await res.text(), expected);
    assert(!(await text("llms-full.txt")).includes("/blog/perf-0000"));
    const interrupted = await response("llms-full.txt");
    const reader = interrupted.body.getReader(); await reader.read(); await reader.cancel();
    assert.equal(pool.idleCount, pool.totalCount);
  });
});
