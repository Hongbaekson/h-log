import assert from "node:assert/strict";
import test from "node:test";

import pg from "pg";

import {
  createPublishJobIdempotencyKey,
  createPostVersionContentFromMarkdown,
  type PostAssetRecord,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionRecord,
  type PublishJobRecord,
} from "./blog-content-model.ts";
import { createPostgresBlogRepository } from "./blog-postgres-repository.ts";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";

const { Client, Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const timestamp = "2026-07-12T00:00:00.000Z";

test(
  "returns only published current versions with their public relations",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_repository_public_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const repository = createPostgresBlogRepository(pool, {
        privacyScanPolicy: {
          restrictedTerms: [
            {
              category: "organization_name",
              value: "Example Confidential Customer",
            },
          ],
        },
      });

      try {
        await repository.savePost(createAggregate("published", "published"));
        const privacyRisk = createAggregate("privacy-risk", "published");
        privacyRisk.tags = [
          {
            ...privacyRisk.tags[0],
            tag: "Example Confidential Customer",
          },
        ];
        await repository.savePost(privacyRisk);
        await repository.savePost(
          createAggregate("draft", "ready_to_publish"),
        );
        await repository.savePost(
          createAggregate("failed", "failed_verification"),
        );

        const store = await repository.findPublicBlogContent();

        assert.deepEqual(store.posts.map(({ id }) => id), ["post-published"]);
        assert.deepEqual(store.versions.map(({ id }) => id), [
          "version-published",
        ]);
        assert.deepEqual(store.tags.map(({ tag }) => tag), ["PostgreSQL"]);
        assert.deepEqual(store.sources.map(({ id }) => id), [
          "source-published",
        ]);
        assert.deepEqual(store.assets?.map(({ id }) => id), [
          "asset-published",
        ]);

        const jobs = await pool.query("select id from publish_jobs order by id");
        assert.deepEqual(
          jobs.rows.map(({ id }) => id),
          ["job-draft", "job-failed", "job-privacy-risk", "job-published"],
        );
      } finally {
        await pool.end();
      }
    });
  },
);

test(
  "returns the existing persisted job for the same logical request",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_repository_idempotency_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const repository = createPostgresBlogRepository(pool);

      try {
        const aggregate = createAggregate("idempotent", "publishing");
        aggregate.publishJobs = [];
        await repository.savePost(aggregate);

        const job = createPublishJob(aggregate, "job-idempotent-first");
        const first = await repository.savePublishJob(job);
        const second = await repository.savePublishJob({
          ...job,
          id: "job-idempotent-duplicate",
        });

        assert.deepEqual(second, first);
        await assert.rejects(
          repository.savePublishJob({
            ...job,
            id: "job-idempotent-invalid-key",
            idempotencyKey: "different-key-for-the-same-logical-job",
          }),
          /expected idempotency key/,
        );

        const persisted = await pool.query(
          "select id, idempotency_key from publish_jobs order by id",
        );
        assert.deepEqual(persisted.rows, [
          {
            id: "job-idempotent-first",
            idempotency_key: job.idempotencyKey,
          },
        ]);

        const next = createAggregate("idempotent", "publishing", 2);
        next.assets = [];
        next.publishJobs = [];
        next.sources = [];
        next.tags = [];
        await repository.savePost(next);

        const nextJob = createPublishJob(next, "job-idempotent-v2");
        const savedNext = await repository.savePublishJob(nextJob);

        assert.notEqual(savedNext.idempotencyKey, first.idempotencyKey);
        const persistedCount = await pool.query(
          "select count(*)::int as count from publish_jobs",
        );
        assert.equal(persistedCount.rows[0].count, 2);
      } finally {
        await pool.end();
      }
    });
  },
);

test(
  "rolls back the current version update when a related write fails",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_repository_transaction_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const repository = createPostgresBlogRepository(pool);

      try {
        await repository.savePost(createAggregate("atomic", "published"));

        const next = createAggregate("atomic", "published", 2);
        next.publishJobs[0] = {
          ...next.publishJobs[0],
          id: "job-atomic",
        };

        await assert.rejects(
          repository.savePost(next),
          (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505",
        );

        const post = await pool.query(
          "select current_version_id from posts where id = $1",
          ["post-atomic"],
        );
        const nextVersion = await pool.query(
          "select id from post_versions where id = $1",
          ["version-atomic-v2"],
        );

        assert.equal(post.rows[0]?.current_version_id, "version-atomic");
        assert.equal(nextVersion.rowCount, 0);
      } finally {
        await pool.end();
      }
    });
  },
);

test(
  "rolls back a retraction when its admin audit write fails",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_repository_retract_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const repository = createPostgresBlogRepository(pool);
      const aggregate = createAggregate("retract-atomic", "published");

      try {
        await repository.savePost(aggregate);
        await pool.query(
          `insert into admin_actions (
             id, action_type, actor_type, actor_id, target_type,
             target_id, reason, created_at
           ) values ($1, 'retract', 'cli', 'existing-audit', 'post', $2, $3, $4)`,
          [
            `retract:post:${aggregate.post.id}:${timestamp}`,
            aggregate.post.id,
            "Existing rollback audit",
            timestamp,
          ],
        );

        await assert.rejects(
          repository.retractPost({
            actorId: "step-4-canary",
            actorType: "cli",
            createdAt: timestamp,
            postId: aggregate.post.id,
            reason: "Step 4 rollback smoke",
          }),
          (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505",
        );

        const post = await pool.query(
          "select status, retracted_at from posts where id = $1",
          [aggregate.post.id],
        );

        assert.deepEqual(post.rows, [
          { retracted_at: null, status: "published" },
        ]);
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

function createAggregate(
  suffix: string,
  status: PostRecord["status"],
  versionNo = 1,
) {
  const postId = `post-${suffix}`;
  const versionId =
    versionNo === 1 ? `version-${suffix}` : `version-${suffix}-v${versionNo}`;
  const content = createPostVersionContentFromMarkdown(
    `# ${suffix}\n\nRepository integration body.\n`,
  );
  const post: PostRecord = {
    articleMode: "project_record",
    createdAt: timestamp,
    currentVersionId: versionId,
    description: `${suffix} description`,
    id: postId,
    publishedAt: status === "published" ? timestamp : null,
    retractedAt: null,
    slug: suffix,
    status,
    title: suffix,
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
    versionNo,
  };
  const tags: PostTagRecord[] = [
    {
      createdAt: timestamp,
      id: `tag-${suffix}-postgresql`,
      postId,
      tag: "PostgreSQL",
    },
  ];
  const sources: PostSourceRecord[] = [
    {
      fetchedAt: timestamp,
      id: `source-${suffix}`,
      postId,
      publisher: "PostgreSQL",
      researchPackId: null,
      snapshotHash: "a".repeat(64),
      sourceRole: "official",
      summary: "Repository reference",
      title: "PostgreSQL documentation",
      url: "https://www.postgresql.org/docs/",
    },
  ];
  const assets: PostAssetRecord[] = [
    {
      alt: "Repository flow",
      assetHash: "b".repeat(64),
      createdAt: timestamp,
      generatedBy: "integration-test",
      id: `asset-${suffix}`,
      path: `/blog-assets/${suffix}.svg`,
      postId,
      postVersionId: versionId,
      status: "ready",
      type: "diagram",
      verifiedAt: timestamp,
    },
  ];
  const publishJobs: PublishJobRecord[] = [
    {
      error: null,
      finishedAt: null,
      id: versionNo === 1 ? `job-${suffix}` : `job-${suffix}-v${versionNo}`,
      idempotencyKey: createPublishJobIdempotencyKey("public_url", version),
      importance: "required",
      postId,
      postVersionId: versionId,
      retryCount: 0,
      startedAt: null,
      status: "queued",
      type: "public_url",
    },
  ];

  return { assets, post, publishJobs, sources, tags, version };
}

function createPublishJob(
  aggregate: ReturnType<typeof createAggregate>,
  id: string,
): PublishJobRecord {
  return {
    error: null,
    finishedAt: null,
    id,
    idempotencyKey: createPublishJobIdempotencyKey(
      "public_url",
      aggregate.version,
    ),
    importance: "required",
    postId: aggregate.post.id,
    postVersionId: aggregate.version.id,
    retryCount: 0,
    startedAt: null,
    status: "queued",
    type: "public_url",
  };
}
