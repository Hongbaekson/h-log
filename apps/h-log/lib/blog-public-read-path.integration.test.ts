import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import pg from "pg";

import {
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import { buildBlogCrawlerOutputs } from "./blog-crawler-output.ts";
import { createPostgresBlogRepository } from "./blog-postgres-repository.ts";
import { getPublicProjectPostConnections } from "./portfolio-posts.ts";
import {
  getPublicBlogIndex,
  getPublicBlogPostBySlug,
  getPublicBlogPostMarkdown,
} from "./blog-public.ts";
import {
  createBlogSearchRuntimeState,
  handleBlogSearchApiRequest,
} from "./blog-search.ts";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { createBrainRepository } from "./brain-postgres-repository.ts";
import { resolveBrainBlogSources, getPublicPostBrainLinks } from "./brain-blog-sources.ts";

const { Client, Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const timestamp = "2026-07-12T00:00:00.000Z";

test("managed Brain sources follow current Blog and Brain publication without rewriting snapshots", { skip: !databaseUrl && "DATABASE_URL is required" }, async () => {
  await withTestDatabase("hlog_brain_blog_read_test", async testUrl => {
    const pool = new Pool({ connectionString: testUrl });
    try {
      const blog = createPostgresBlogRepository(pool), brain = createBrainRepository(pool);
      const article = createAggregate("connected-article", "published");
      await blog.savePost(article);
      const meta = (commandRevision: number) => ({ commandId: randomUUID(), commandRevision });
      const draft = { title: "PRIVATE_TITLE", originalText: "PRIVATE_ORIGINAL", publicTitle: "연결된 공개 생각",
        publicSummary: "구현을 돌아보는 질문", publicBody: "다음에도 확인할 기준입니다.",
        kind: "question", basis: "question", topic: "tools", tags: [],
        sources: [{ label: "STALE_SOURCE_TITLE", href: "/blog/connected-article" },
          { label: "ABSOLUTE_SOURCE_TITLE", href: "https://hlog.example.org/blog/connected-article#old" }] };
      const receipt = await brain.saveDraft(draft, undefined, 0, meta(0));
      await brain.publish(receipt.id, 1, true, meta(1));
      const snapshot = async () => (await pool.query("select public_node::text as value from brain_notes where id=$1", [receipt.id])).rows[0].value;
      const before = await snapshot();
      await brain.saveDraft({ ...draft, publicTitle: "PRIVATE_UNSELECTED_TITLE", sources: [] }, receipt.id, 1, meta(2));
      const load = async () => resolveBrainBlogSources(await brain.findPublicGraph(), () => blog.findPublicBlogContent(), "https://hlog.example.org");
      const graph = await load();
      assert.equal(graph.nodes[0].sources[0].href, "/blog/connected-article");
      assert.doesNotMatch(JSON.stringify(graph), /PRIVATE_|STALE_SOURCE|ABSOLUTE_SOURCE/);
      assert.deepEqual(getPublicPostBrainLinks("connected-article", await blog.findPublicBlogContent(), graph), [{ href: `/brain/${receipt.id}`, title: "연결된 공개 생각" }]);
      for (const status of ["retracted", "unpublished", "drafted"]) {
        await pool.query("update posts set status=$1 where id=$2", [status, article.post.id]);
        const hidden = await load();
        assert.deepEqual(hidden.nodes[0].sources, [{ label: "블로그 기록" }, { label: "블로그 기록" }]);
        assert.deepEqual(getPublicPostBrainLinks("connected-article", await blog.findPublicBlogContent(), hidden), []);
        assert.equal(await snapshot(), before);
      }
      await pool.query("update posts set status='published' where id=$1", [article.post.id]);
      await pool.query("alter table posts rename to unavailable_posts");
      try {
        const failed = await load();
        assert.equal(failed.nodes[0].sourcesUnavailable, true);
        assert.doesNotMatch(JSON.stringify(failed), /connected-article|STALE_SOURCE|ABSOLUTE_SOURCE/);
      } finally { await pool.query("alter table unavailable_posts rename to posts"); }
      assert.equal((await load()).nodes[0].sources[0].href, "/blog/connected-article");
      assert.equal(await snapshot(), before);
      assert.equal((await brain.getOwnerNote(receipt.id))!.history.length, 2);
      await brain.unpublish(receipt.id, 2, meta(3));
      assert.deepEqual(getPublicPostBrainLinks("connected-article", await blog.findPublicBlogContent(), await load()), []);
    } finally { await pool.end(); }
  });
});

test(
  "reads DB-only published content across public, crawler, and search surfaces",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_public_read_path_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const repository = createPostgresBlogRepository(pool);

      try {
        await repository.savePost(createAggregate("database-only", "published"));
        await repository.savePost(createAggregate("draft", "ready_to_publish"));
        await repository.savePost(createAggregate("failed", "failed_verification"));
        await repository.savePost(createAggregate("corrected", "corrected"));
        await repository.savePost(createAggregate("retracted", "retracted"));

        const store = await repository.findPublicBlogContent();
        const index = getPublicBlogIndex(store);
        const detail = getPublicBlogPostBySlug("database-only", store);
        const markdown = getPublicBlogPostMarkdown("database-only", store);
        const crawler = buildBlogCrawlerOutputs(store, {
          origin: "https://example.com",
        });
        const search = await handleBlogSearchApiRequest({
          clientId: "integration-test",
          loadStore: async () => store,
          query: "PostgreSQL",
          state: createBlogSearchRuntimeState(),
        });

        assert.deepEqual(index.posts.map(({ slug }) => slug), ["database-only"]);
        assert.equal(detail?.title, "PostgreSQL database-only");
        assert.match(markdown ?? "", /database-only body/);
        assert.match(crawler.sitemapXml, /\/blog\/database-only/);
        assert.match(crawler.feedXml, /PostgreSQL database-only/);
        assert.match(crawler.llmsTxt, /database-only/);
        assert.match(crawler.llmsFullTxt, /database-only body/);
        assert.deepEqual(search.results.map(({ slug }) => slug), [
          "database-only",
        ]);

        for (const hiddenSlug of ["draft", "failed", "corrected", "retracted"]) {
          assert.equal(getPublicBlogPostBySlug(hiddenSlug, store), undefined);
          assert.doesNotMatch(crawler.llmsFullTxt, new RegExp(hiddenSlug));
        }

        const connected = createAggregate("home-recent-posts", "published");
        connected.version.title = "Current project article";
        await repository.savePost(connected);
        const [connection] = getPublicProjectPostConnections(await repository.findPublicBlogContent());
        assert.equal(connection.projectHref, "/portfolio/h-log-public-reading");
        assert.equal(connection.postHref, "/blog/home-recent-posts");
        assert.equal(connection.postTitle, "Current project article");

        await pool.query("update posts set status = 'retracted' where id = $1", [connected.post.id]);
        assert.deepEqual(getPublicProjectPostConnections(await repository.findPublicBlogContent()), []);
        await pool.query("update posts set status = 'published', current_version_id = null where id = $1", [connected.post.id]);
        assert.deepEqual(getPublicProjectPostConnections(await repository.findPublicBlogContent()), []);
        await pool.query("update posts set current_version_id = $1 where id = $2", [connected.version.id, connected.post.id]);
        await pool.query("update post_versions set description = $1 where id = $2", ["Contact private.person@example.com", connected.version.id]);
        assert.deepEqual(getPublicProjectPostConnections(await repository.findPublicBlogContent()), []);
      } finally {
        await pool.end();
      }
    });
  },
);

async function withTestDatabase(
  databaseName: string,
  run: (testUrl: string) => Promise<void>,
): Promise<void> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(
    "select pg_terminate_backend(pid, 5000) from pg_stat_activity where datname = $1",
    [databaseName],
  );
  await admin.query(`drop database if exists ${databaseName}`);
  await admin.query(`create database ${databaseName}`);

  const testUrl = new URL(databaseUrl);
  testUrl.pathname = `/${databaseName}`;

  try {
    await runBlogMigrations(testUrl.toString());
    await run(testUrl.toString());
  } finally {
    await admin.query(
      "select pg_terminate_backend(pid, 5000) from pg_stat_activity where datname = $1",
      [databaseName],
    );
    await admin.query(`drop database if exists ${databaseName}`);
    await admin.end();
  }
}

function createAggregate(suffix: string, status: PostRecord["status"]) {
  const postId = `post-${suffix}`;
  const versionId = `version-${suffix}`;
  const content = createPostVersionContentFromMarkdown(
    `# PostgreSQL ${suffix}\n\n${suffix} body.\n`,
  );
  const post: PostRecord = {
    articleMode: "project_record",
    createdAt: timestamp,
    currentVersionId: versionId,
    description: `${suffix} description`,
    id: postId,
    publishedAt: status === "published" ? timestamp : null,
    retractedAt: status === "retracted" ? timestamp : null,
    slug: suffix,
    status,
    title: `PostgreSQL ${suffix}`,
    unpublishedAt: null,
    updatedAt: timestamp,
  };
  const version: PostVersionRecord = {
    ...content,
    createdAt: timestamp,
    createdBy: "system",
    description: post.description,
    id: versionId,
    personaVersionId: null,
    postId,
    researchPackId: null,
    title: post.title,
    versionNo: 1,
  };

  return {
    assets: [],
    post,
    publishJobs: [],
    sources: [],
    tags: [
      {
        createdAt: timestamp,
        id: `tag-${suffix}`,
        postId,
        tag: "PostgreSQL",
      },
    ],
    version,
  };
}
