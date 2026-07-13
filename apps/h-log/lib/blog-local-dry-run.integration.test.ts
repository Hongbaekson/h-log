import assert from "node:assert/strict";
import test from "node:test";

import pg from "pg";

import { buildBlogCrawlerOutputs } from "./blog-crawler-output.ts";
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

      try {
        const result = await runLocalBlogDryRun({ pool, runAt });
        const posts = await pool.query(
          "select slug, status from posts order by slug",
        );
        const jobs = await pool.query(
          "select post_id, status, error from publish_jobs order by post_id",
        );
        const store = await createPostgresBlogRepository(
          pool,
        ).findPublicBlogContent();
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
