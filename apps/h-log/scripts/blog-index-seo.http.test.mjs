// Explicitly opt in against a migrated, empty, disposable hlog_seo_* database
// and its loopback public ingress. The caller owns and removes the database.
import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { createPostVersionContentFromMarkdown } from "../lib/blog-content-model.ts";
import { createPostgresBlogRepository } from "../lib/blog-postgres-repository.ts";

test("public Blog URL, indexing and failure contracts", { skip: process.env.HLOG_SEO_HTTP_TEST !== "1" }, async t => {
  const origin = new URL(process.env.HLOG_SEO_HTTP_ORIGIN);
  const canonical = new URL(process.env.HLOG_PUBLIC_BASE_URL);
  const database = new URL(process.env.DATABASE_URL);
  assert.equal(origin.protocol, "http:");
  assert.equal(origin.hostname, "127.0.0.1");
  assert.equal(origin.pathname, "/");
  assert(!origin.username && !origin.password && !origin.search && !origin.hash);
  assert.equal(database.hostname, "127.0.0.1");
  assert.match(database.pathname, /^\/hlog_seo_[a-z0-9_]+$/);
  assert(!database.search);
  assert.equal(canonical.origin, "https://hlog.example.org");
  const pool = new pg.Pool({ connectionString: database.href });
  const repository = createPostgresBlogRepository(pool);
  const marker = "UNPUBLISHED_SEO_FIXTURE_BODY";
  const get = async path => {
    const url = new URL(path, origin);
    assert.equal(url.origin, origin.origin);
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    assert(!body.includes(marker), "non-public content leaked");
    return { status: response.status, headers: response.headers, body,
      canonical: [...body.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g)].map(m => m[1].replaceAll("&amp;", "&")),
      robots: [...body.matchAll(/<meta\b[^>]*name="robots"[^>]*content="([^"]+)"[^>]*>/g)].map(m => m[1]).join(", ") };
  };
  try {
    assert.equal((await pool.query("select count(*)::int n from posts")).rows[0].n, 0, "Use an empty disposable database");
    for (const [slug, status] of [...Array.from({ length: 8 }, (_, i) => [`seo-public-${i + 1}`, "published"]), ["seo-draft", "ready_to_publish"], ["seo-withdrawn", "retracted"]]) {
      const timestamp = "2026-11-01T00:00:00.000Z", id = `post-${slug}`, versionId = `version-${slug}`;
      const title = status === "published" ? `PostgreSQL 공개 검수 ${slug}` : marker;
      const content = createPostVersionContentFromMarkdown(`## 확인한 범위\n\n${title}의 합성 자료입니다.\n`);
      await repository.savePost({ post: { id, slug, title, description: "공개 URL 계약을 확인하는 합성 글입니다.", articleMode: "project_record", status, currentVersionId: versionId, createdAt: timestamp, updatedAt: timestamp, publishedAt: status === "published" ? timestamp : null, unpublishedAt: null, retractedAt: status === "retracted" ? timestamp : null }, version: { ...content, id: versionId, postId: id, versionNo: 1, title, description: "공개 URL 계약을 확인하는 합성 글입니다.", createdAt: timestamp, createdBy: "system", personaVersionId: null, researchPackId: null }, tags: [{ id: `tag-${slug}`, postId: id, tag: "PostgreSQL", createdAt: timestamp }], assets: [], sources: [], publishJobs: [] });
    }
    await t.test("normalizes the canonical to the displayed unfiltered page", async () => {
      for (const [query, href] of [["", "/blog"], ["?page=2", "/blog?page=2"], ["?page=99", "/blog?page=2"], ["?page=1", "/blog"], ["?page=abc", "/blog"], ["?page=-1", "/blog"], ["?page=0", "/blog"], ["?page=1.5", "/blog"], ["?page=02", "/blog?page=2"], ["?page=2&page=1", "/blog?page=2"], ["?page=1&page=2", "/blog"], ["?page=2&utm_source=test", "/blog?page=2"], ["?q=%20&tag=%20", "/blog"]]) {
        const result = await get("/blog" + query);
        assert.equal(result.status, 200, query);
        assert.deepEqual(result.canonical, [canonical.origin + href], query);
        assert.doesNotMatch(result.robots, /noindex/, query);
      }
    });
    await t.test("search and tag results are noindex, follow without a conflicting canonical", async () => {
      for (const query of ["?q=PostgreSQL", "?tag=PostgreSQL", "?q=PostgreSQL&tag=PostgreSQL&page=2", "?tag=missing", "?q=missing&page=99", "?q=%20PostgreSQL%20&q=ignored", "?tag=%20PostgreSQL%20&tag=ignored"]) {
        const result = await get("/blog" + query);
        assert.equal(result.status, 200, query);
        assert.match(result.robots, /noindex/, query);
        assert.match(result.robots, /(?:^|,\s*)follow(?:,|$)/, query);
        assert.deepEqual(result.canonical, [], query);
      }
    });
    await t.test("keeps published details, crawler output and private failures consistent", async () => {
      const detail = await get("/blog/seo-public-1");
      assert.equal(detail.status, 200);
      assert.deepEqual(detail.canonical, [canonical.origin + "/blog/seo-public-1"]);
      for (const slug of ["seo-draft", "seo-withdrawn", "seo-missing"]) {
        const hidden = await get("/blog/" + slug);
        assert.equal(hidden.status, 404);
        assert.match(hidden.robots, /noindex/);
      }
      for (const path of ["/sitemap.xml", "/feed.xml", "/llms.txt", "/llms-full.txt"]) {
        const result = await get(path);
        assert.equal(result.status, 200);
        assert.doesNotMatch(result.body, /seo-draft|seo-withdrawn|seo-missing|\/blog\?/);
      }
      const sitemap = await get("/sitemap.xml");
      assert.equal([...sitemap.body.matchAll(/<loc>https:\/\/hlog\.example\.org\/blog\/seo-public-\d<\/loc>/g)].length, 8);
      const legacy = await get("/projects");
      assert.equal(legacy.status, 308);
      assert.equal(legacy.headers.get("location"), "/portfolio");
    });
    await t.test("database read failures return 500 before a successful list is streamed", async () => {
      await pool.query("alter table posts rename to seo_unavailable_posts");
      try {
        for (const path of ["/blog", "/blog?page=2", "/blog?q=PostgreSQL", "/blog?tag=PostgreSQL", "/sitemap.xml"]) assert.equal((await get(path)).status, 500, path);
      } finally { await pool.query("alter table seo_unavailable_posts rename to posts"); }
      assert.equal((await get("/blog")).status, 200);
    });
    await t.test("a genuinely empty catalog is a normal first page, not a database failure", async () => {
      await pool.query("update posts set status='retracted' where status='published'");
      for (const path of ["/blog", "/blog?page=2"]) {
        const result = await get(path);
        assert.equal(result.status, 200);
        assert.deepEqual(result.canonical, [canonical.origin + "/blog"]);
        assert.match(result.body, /아직 공개된 글이 없습니다/);
        assert.doesNotMatch(result.robots, /noindex/);
      }
      await pool.query("update posts set status='published' where slug like 'seo-public-%'");
    });
  } finally { await pool.end(); }
});
