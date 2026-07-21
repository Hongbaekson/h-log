import assert from "node:assert/strict";
import test from "node:test";

import pg from "pg";

import { buildBlogCrawlerOutputs } from "./blog-crawler-output.ts";
import {
  searchPublishedBlogPosts,
  selectPublishedRelatedPostCandidates,
} from "./blog-search.ts";
import { runLocalBlogDryRun } from "./blog-local-dry-run.ts";
import { createPostgresBlogRepository } from "./blog-postgres-repository.ts";
import {
  getPublicBlogPostBySlug,
  getPublicBlogPostMarkdown,
} from "./blog-public.ts";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";

const { Client, Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const runAt = "2026-07-13T12:00:00.000Z";

test(
  "persists one fake-provider success and keeps the failed fixture private",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_local_dry_run_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const repository = createPostgresBlogRepository(pool);

      try {
        const result = await runLocalBlogDryRun({ pool, runAt });
        const posts = await pool.query(
          "select slug, status from posts order by slug",
        );
        const jobs = await pool.query(
          "select post_id, status, error from publish_jobs order by post_id",
        );
        const store = await repository.findPublicBlogContent();
        const crawler = buildBlogCrawlerOutputs(store, {
          origin: "https://example.com",
        });

        assert.deepEqual(posts.rows, [
          { slug: result.failure.slug, status: "failed_publish" },
          { slug: result.success.slug, status: "published" },
        ]);
        assert.deepEqual(jobs.rows, [
          {
            error: "fake required provider failed",
            post_id: result.failure.postId,
            status: "failed",
          },
          {
            error: null,
            post_id: result.success.postId,
            status: "succeeded",
          },
        ]);

        assert.equal(
          store.versions.find(({ id }) => id === result.success.versionId)
            ?.contentHash,
          result.success.contentHash,
        );
        assert.match(
          getPublicBlogPostMarkdown(result.success.slug, store) ?? "",
          /Fake provider local dry-run/,
        );
        assert.match(crawler.sitemapXml, new RegExp(result.success.slug));
        assert.match(crawler.feedXml, new RegExp(result.success.slug));
        assert.match(crawler.llmsTxt, new RegExp(result.success.slug));
        assert.match(crawler.llmsFullTxt, /Fake provider local dry-run/);

        assert.equal(
          getPublicBlogPostBySlug(result.failure.slug, store),
          undefined,
        );
        assert.doesNotMatch(crawler.llmsFullTxt, new RegExp(result.failure.slug));

        const rollbackAt = "2026-07-13T12:05:00.000Z";
        const rollback = await repository.retractPost({
          actorId: "step-4-canary",
          actorType: "cli",
          createdAt: rollbackAt,
          postId: result.success.postId,
          reason: "Step 4 rollback smoke",
        });
        const retractedStore = await repository.findPublicBlogContent();
        const retractedCrawler = buildBlogCrawlerOutputs(retractedStore, {
          origin: "https://example.com",
        });

        assert.equal(rollback.post.status, "retracted");
        assert.equal(
          getPublicBlogPostBySlug(result.success.slug, retractedStore),
          undefined,
        );
        assert.equal(
          getPublicBlogPostMarkdown(result.success.slug, retractedStore),
          undefined,
        );
        assert.doesNotMatch(
          retractedCrawler.sitemapXml,
          new RegExp(result.success.slug),
        );
        assert.doesNotMatch(
          retractedCrawler.feedXml,
          new RegExp(result.success.slug),
        );
        assert.doesNotMatch(
          retractedCrawler.llmsTxt,
          new RegExp(result.success.slug),
        );
        assert.doesNotMatch(
          retractedCrawler.llmsFullTxt,
          new RegExp(result.success.slug),
        );
        assert.deepEqual(
          searchPublishedBlogPosts(retractedStore, {
            query: "fake provider",
          }),
          [],
        );
        assert.deepEqual(
          selectPublishedRelatedPostCandidates(retractedStore, {
            similarities: [
              {
                score: 0.9,
                targetPostId: result.failure.postId,
              },
            ],
            sourcePostId: result.success.postId,
          }),
          [],
        );

        for (const checkType of [
          "public_url",
          "md_url",
          "sitemap",
          "feed",
          "llms",
          "search_index",
          "related_posts",
          "content_version_match",
        ] as const) {
          await repository.savePublishVerification({
            checkedAt: rollbackAt,
            checkType,
            id: `rollback:${result.success.postId}:${checkType}`,
            postId: result.success.postId,
            postVersionId: result.success.versionId,
            responseCode: null,
            result: "absent_after_retract",
            status: "passed",
          });
        }

        const adminActions = await pool.query(
          `select action_type, actor_type, actor_id, reason
           from admin_actions
           where target_id = $1`,
          [result.success.postId],
        );
        const verifications = await pool.query(
          `select check_type, status, result
           from publish_verifications
           where post_id = $1
           order by check_type`,
          [result.success.postId],
        );

        assert.deepEqual(adminActions.rows, [
          {
            action_type: "retract",
            actor_id: "step-4-canary",
            actor_type: "cli",
            reason: "Step 4 rollback smoke",
          },
        ]);
        assert.equal(verifications.rowCount, 8);
        assert.ok(
          verifications.rows.every(
            ({ result, status }) =>
              result === "absent_after_retract" && status === "passed",
          ),
        );
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
