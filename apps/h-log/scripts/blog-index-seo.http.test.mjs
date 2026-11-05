// Explicitly opt in against a migrated, empty, disposable hlog_seo_* database
// and its loopback public ingress. The caller owns and removes the database.
import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { createPostVersionContentFromMarkdown } from "../lib/blog-content-model.ts";
import { createPostgresBlogRepository } from "../lib/blog-postgres-repository.ts";

const decodeHtml = value => value.replace(/&(amp|quot|lt|gt|#x27|#39);/g, (_, entity) => ({ amp: "&", quot: '"', lt: "<", gt: ">", "#x27": "'", "#39": "'" })[entity]);
const meta = (html, name) => [...html.matchAll(/<meta\b[^>]*>/g)]
  .filter(([tag]) => tag.includes(`name="${name}"`) || tag.includes(`property="${name}"`))
  .map(([tag]) => decodeHtml(tag.match(/\bcontent="([^"]*)"/)[1]));
const structuredData = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));

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
  const get = async (path, headers = {}) => {
    const url = new URL(path, origin);
    assert.equal(url.origin, origin.origin);
    const response = await fetch(url, { headers, redirect: "manual", signal: AbortSignal.timeout(20000) });
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
    for (const [path, sharedPath] of [
      ["/", "/"], ["/resume", "/resume"], ["/portfolio", "/portfolio"],
      ["/portfolio/ai-backend-workflow-standardization", "/portfolio/ai-backend-workflow-standardization"],
      ["/portfolio/redisson-async-processing-recovery", "/portfolio/redisson-async-processing-recovery"],
      ["/brain", "/brain"], ["/brain/operable-backend", "/brain/operable-backend"],
      ["/blog", "/blog"], ["/blog?page=2", "/blog?page=2"], ["/blog?page=99&utm_source=test", "/blog?page=2"],
      ["/blog?q=%20PostgreSQL%20&tag=PostgreSQL&page=2&utm_source=test", "/blog?q=PostgreSQL&tag=PostgreSQL&page=2"],
      ["/blog/seo-public-1", "/blog/seo-public-1"], ["/blog/seo-public-2", "/blog/seo-public-2"],
    ]) await t.test(`page-specific social metadata: ${path}`, async () => {
      for (const userAgent of ["Mozilla/5.0", "Twitterbot/1.0"]) {
        const { body, status } = await get(path, { "user-agent": userAgent });
        assert.equal(status, 200);
        assert.match(body, /<html[^>]*lang="ko"/);
        const title = decodeHtml(body.match(/<title>([^<]*)<\/title>/)[1]);
        const description = meta(body, "description");
        assert.equal(description.length, 1);
        for (const field of ["og:title", "twitter:title"]) {
          const actual = meta(body, field);
          assert.equal(actual.length, 1, field);
          assert([title, title.replace(/ \| 손홍백$/, ""), title.replace(/ \| (?:블로그|포트폴리오) \| 손홍백$/, "")].includes(actual[0]), `${field} must describe the page: ${actual[0]}`);
        }
        assert.deepEqual(meta(body, "og:description"), description);
        assert.deepEqual(meta(body, "twitter:description"), description);
        assert.deepEqual(meta(body, "og:url").map(url => new URL(url).href), [new URL(sharedPath, canonical).href]);
        assert.deepEqual(meta(body, "twitter:card"), ["summary_large_image"]);
        assert.deepEqual(meta(body, "og:type"), [/^\/(?:blog|portfolio)\//.test(path) ? "article" : "website"]);
        for (const field of ["og:image", "twitter:image"]) {
          const images = meta(body, field);
          assert.equal(images.length, 1);
          const image = new URL(images[0]);
          // Next's file-convention Home OG image uses localhost in development.
          // Production and explicitly defined page images must use the public origin.
          const developmentHomeImage = process.env.HLOG_SEO_HTTP_DEVELOPMENT === "1" && path === "/" && field === "og:image";
          assert.equal(image.origin, developmentHomeImage ? `http://localhost:${origin.port}` : canonical.origin);
          assert.equal(image.pathname, "/opengraph-image");
        }
        if (userAgent === "Twitterbot/1.0") assert.deepEqual(meta(body.split("</head>")[0], "og:url"), meta(body, "og:url"));
        const schemas = structuredData(body);
        const person = schemas.find(item => item["@type"] === "Person");
        const website = schemas.find(item => item["@type"] === "WebSite");
        assert.equal(person.name, "손홍백");assert.equal(person.url, canonical.origin);
        assert.equal(website.url, canonical.origin);assert.equal(website.inLanguage, "ko-KR");
      }
    });
    await t.test("rendered BlogPosting preserves special characters and explicit publication/revision dates", async () => {
      for (const number of [1, 2]) {
        const title = `PostgreSQL <태그> & "합성 글 ${number}"`;
        const description = "</script><script>globalThis.__seoInjected=1</script> & '한글' \u2028\u2029";
        const content = createPostVersionContentFromMarkdown(`## 확인한 범위\n\n${title}의 합성 자료입니다.\n`);
        const editorial = number === 1 ? { verification: null, revisions: [{ revisedOn: "2026-11-03", summary: "합성 검수 문장을 정리했습니다." }] } : null;
        await pool.query("update post_versions set title=$1, description=$2, content_markdown=$3, content_html=$4, content_hash=$5, public_editorial=$6 where id=$7", [title, description, content.contentMarkdown, content.contentHtml, content.contentHash, editorial, `version-seo-public-${number}`]);
        await pool.query("update posts set updated_at='2026-11-04T00:00:00Z' where slug=$1", [`seo-public-${number}`]);
        for (const userAgent of ["Mozilla/5.0", "Twitterbot/1.0"]) {
          const { body, status } = await get(`/blog/seo-public-${number}`, { "user-agent": userAgent });
          assert.equal(status, 200);
          const schemas = structuredData(body);
          assert.equal(schemas.length, 3);
          const article = schemas.find(item => item["@type"] === "BlogPosting");
          assert.equal(article.headline, title);assert.equal(article.description, description);
          assert.equal(article.author.name, "손홍백");assert.equal(article.author.url, canonical.origin);
          assert.equal(article.url, `${canonical.origin}/blog/seo-public-${number}`);
          assert.equal(article.mainEntityOfPage, article.url);
          assert.equal(article.datePublished, "2026-11-01T00:00:00.000Z");
          assert.equal(article.dateModified, number === 1 ? "2026-11-03" : undefined);
          const visibleDates = [...body.matchAll(/<time\b[^>]*datetime="([^"]*)"/gi)].map(match => match[1]);
          assert(visibleDates.includes(article.datePublished));
          if (article.dateModified) assert(visibleDates.includes(article.dateModified));
          assert.equal(decodeHtml(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]), title);
          assert.deepEqual(meta(body, "og:description"), [description]);
          assert.deepEqual(meta(body, "twitter:description"), [description]);
          assert.doesNotMatch(body, /<script>globalThis\.__seoInjected/);
        }
      }
    });
    await t.test("missing and withdrawn documents expose no article or private metadata", async () => {
      for (const path of ["/blog/seo-draft", "/blog/seo-withdrawn", "/blog/seo-missing", "/brain/seo-missing", "/portfolio/seo-missing"]) {
        const result = await get(path, { "user-agent": "Twitterbot/1.0" });
        assert.equal(result.status, 404);assert.match(result.robots, /noindex/);
        assert.equal(structuredData(result.body).filter(item => item["@type"] === "BlogPosting").length, 0);
        assert.deepEqual(result.canonical, []);
      }
      const result = await get("/resume", { "x-forwarded-host": "admin.hlog.example.org", "x-forwarded-proto": "https" });
      assert.deepEqual(meta(result.body, "og:url"), [`${canonical.origin}/resume`]);
      assert.doesNotMatch(result.body, /https:\/\/admin\.hlog\.example\.org/);
      const image = await fetch(new URL("/opengraph-image", origin), { redirect: "manual", signal: AbortSignal.timeout(20000) });
      assert.equal(image.status, 200);assert.match(image.headers.get("content-type"), /image\/png/);
      const png = Buffer.from(await image.arrayBuffer());
      assert.equal(png.readUInt32BE(16), 1200);assert.equal(png.readUInt32BE(20), 630);
    });
  } finally { await pool.end(); }
});
