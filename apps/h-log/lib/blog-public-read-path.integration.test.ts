import assert from "node:assert/strict";
import test from "node:test";

import pg from "pg";

import {
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import { buildBlogCrawlerOutputs } from "./blog-crawler-output.ts";
import { createPostgresBlogRepository } from "./blog-postgres-repository.ts";
import {
  getPublicBlogIndex,
  getPublicBlogPostBySlug,
  getPublicBlogPostMarkdown,
} from "./blog-public.ts";
import { createBlogPublicContentLoader } from "./blog-public-source.ts";
import {
  createBlogSearchRuntimeState,
  handleBlogSearchApiRequest,
} from "./blog-search.ts";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";

const { Client, Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const timestamp = "2026-07-12T00:00:00.000Z";

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

        const loadStore = createBlogPublicContentLoader(repository);
        const store = await loadStore();
        const index = getPublicBlogIndex(store);
        const detail = getPublicBlogPostBySlug("database-only", store);
        const markdown = getPublicBlogPostMarkdown("database-only", store);
        const crawler = buildBlogCrawlerOutputs(store, {
          origin: "https://example.com",
        });
        const search = await handleBlogSearchApiRequest({
          clientId: "integration-test",
          query: "PostgreSQL",
          state: createBlogSearchRuntimeState(),
          store,
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
    "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1",
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
      "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1",
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
