import assert from "node:assert/strict";
import test from "node:test";

import pg from "pg";

import { runPersistentWorkerOnce } from "./blog-persistent-worker.ts";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";

const { Client, Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const runAt = "2026-07-13T00:00:00.000Z";

test(
  "processes at most one queued job and exits",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_worker_once_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const processedJobIds: string[] = [];

      try {
        await seedPostWithJobs(pool, ["job-a", "job-b"]);

        const result = await runPersistentWorkerOnce({
          adapter: {
            async run(job) {
              processedJobIds.push(job.id);
              return { status: "succeeded" };
            },
          },
          pool,
          runAt,
          workerId: "worker-once",
        });

        assert.equal(result.status, "succeeded");
        assert.deepEqual(processedJobIds, ["job-a"]);

        const jobs = await pool.query(
          "select id, status, started_at, finished_at from publish_jobs order by id",
        );
        assert.deepEqual(
          jobs.rows.map(({ id, status }) => ({ id, status })),
          [
            { id: "job-a", status: "succeeded" },
            { id: "job-b", status: "queued" },
          ],
        );
        assert.equal(jobs.rows[0]?.started_at.toISOString(), runAt);
        assert.equal(jobs.rows[0]?.finished_at.toISOString(), runAt);
        assert.equal(jobs.rows[1]?.started_at, null);
        assert.equal(jobs.rows[1]?.finished_at, null);
      } finally {
        await pool.end();
      }
    });
  },
);

test(
  "persists a required job failure and the related post state",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_worker_required_failure_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });

      try {
        await seedPostWithJobs(pool, ["job-required"]);

        const result = await runPersistentWorkerOnce({
          adapter: {
            async run() {
              throw new Error("required adapter failed");
            },
          },
          pool,
          runAt,
          workerId: "worker-required",
        });

        assert.equal(result.status, "failed");

        const job = await pool.query(
          "select status, retry_count, error, finished_at from publish_jobs where id = $1",
          ["job-required"],
        );
        assert.deepEqual(
          {
            error: job.rows[0]?.error,
            retryCount: job.rows[0]?.retry_count,
            status: job.rows[0]?.status,
          },
          {
            error: "required adapter failed",
            retryCount: 0,
            status: "failed",
          },
        );
        assert.equal(job.rows[0]?.finished_at.toISOString(), runAt);

        const post = await pool.query("select status from posts where id = $1", [
          "post-worker",
        ]);
        assert.equal(post.rows[0]?.status, "failed_publish");
      } finally {
        await pool.end();
      }
    });
  },
);

test(
  "publishes the post only after every required job succeeds",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_worker_publish_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const adapter = {
        async run() {
          return { status: "succeeded" as const };
        },
      };

      try {
        await seedPostWithJobs(pool, ["job-first", "job-last"]);

        await runPersistentWorkerOnce({
          adapter,
          pool,
          runAt,
          workerId: "worker-publish",
        });

        const publishing = await pool.query(
          "select status, published_at from posts where id = $1",
          ["post-worker"],
        );
        assert.deepEqual(publishing.rows[0], {
          published_at: null,
          status: "publishing",
        });

        const result = await runPersistentWorkerOnce({
          adapter,
          pool,
          runAt,
          workerId: "worker-publish",
        });
        const published = await pool.query(
          "select status, published_at from posts where id = $1",
          ["post-worker"],
        );

        assert.equal(result.status, "succeeded");
        assert.equal(result.postStatus, "published");
        assert.equal(published.rows[0]?.status, "published");
        assert.equal(published.rows[0]?.published_at.toISOString(), runAt);
      } finally {
        await pool.end();
      }
    });
  },
);

test(
  "leases one job, reclaims it only after timeout, and rejects the stale owner",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_worker_lease_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const processedBy: string[] = [];
      let releaseWorkerA = () => {};
      let signalWorkerAStarted = () => {};
      const workerAHold = new Promise<void>((resolve) => {
        releaseWorkerA = resolve;
      });
      const workerAStarted = new Promise<void>((resolve) => {
        signalWorkerAStarted = resolve;
      });
      let firstRun: ReturnType<typeof runPersistentWorkerOnce> | undefined;

      try {
        await seedPostWithJobs(pool, ["job-lease"]);

        firstRun = runPersistentWorkerOnce({
          adapter: {
            async run() {
              processedBy.push("worker-a");
              signalWorkerAStarted();
              await workerAHold;
              return { error: "stale worker failed", status: "failed" };
            },
          },
          pool,
          runAt,
          workerId: "worker-a",
        });
        await workerAStarted;

        const leased = await pool.query(
          `select status, lease_owner, lease_expires_at
           from publish_jobs
           where id = $1`,
          ["job-lease"],
        );
        assert.deepEqual(
          {
            leaseExpiresAt: leased.rows[0]?.lease_expires_at.toISOString(),
            leaseOwner: leased.rows[0]?.lease_owner,
            status: leased.rows[0]?.status,
          },
          {
            leaseExpiresAt: "2026-07-13T00:05:00.000Z",
            leaseOwner: "worker-a",
            status: "running",
          },
        );

        const beforeTimeout = await runPersistentWorkerOnce({
          adapter: {
            async run() {
              processedBy.push("worker-b-before-timeout");
              return { status: "succeeded" };
            },
          },
          pool,
          runAt: "2026-07-13T00:04:59.000Z",
          workerId: "worker-b",
        });
        assert.deepEqual(beforeTimeout, { status: "idle" });

        const afterTimeout = await runPersistentWorkerOnce({
          adapter: {
            async run() {
              processedBy.push("worker-b-after-timeout");
              return { status: "succeeded" };
            },
          },
          pool,
          runAt: "2026-07-13T00:05:00.000Z",
          workerId: "worker-b",
        });
        assert.equal(afterTimeout.status, "succeeded");

        releaseWorkerA();
        await assert.rejects(firstRun, /lease lost by worker worker-a/);
        assert.deepEqual(processedBy, ["worker-a", "worker-b-after-timeout"]);

        const finished = await pool.query(
          `select status, lease_owner, lease_expires_at
           from publish_jobs
           where id = $1`,
          ["job-lease"],
        );
        assert.deepEqual(finished.rows[0], {
          lease_expires_at: null,
          lease_owner: null,
          status: "succeeded",
        });
      } finally {
        releaseWorkerA();
        await firstRun?.catch(() => {});
        await pool.end();
      }
    });
  },
);

test(
  "stops a retryable job after the same failure repeats twice",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    await withTestDatabase("hlog_worker_retry_failure_test", async (testUrl) => {
      const pool = new Pool({ connectionString: testUrl });
      const adapter = {
        async run() {
          return { error: "retryable adapter failed", status: "failed" as const };
        },
      };

      try {
        await seedPostWithJobs(pool, ["job-retry"], {
          importance: "retryable",
          postStatus: "published",
          type: "discord",
        });

        const first = await runPersistentWorkerOnce({
          adapter,
          pool,
          runAt,
          workerId: "worker-retry",
        });
        const second = await runPersistentWorkerOnce({
          adapter,
          pool,
          runAt,
          workerId: "worker-retry",
        });
        const third = await runPersistentWorkerOnce({
          adapter,
          pool,
          runAt,
          workerId: "worker-retry",
        });

        assert.equal(first.status, "retrying");
        assert.equal(second.status, "failed");
        assert.deepEqual(third, { status: "idle" });
        assert.deepEqual(second.operatorAlert, {
          createdAt: runAt,
          idempotencyKey: "post-worker:version-worker:job-retry",
          jobId: "job-retry",
          jobType: "discord",
          postId: "post-worker",
          reason:
            "discord retry stopped after the same failure repeated twice: retryable adapter failed",
        });

        const job = await pool.query(
          "select status, retry_count, error from publish_jobs where id = $1",
          ["job-retry"],
        );
        assert.deepEqual(job.rows[0], {
          error: "retryable adapter failed",
          retry_count: 2,
          status: "failed",
        });

        const usageEvents = await pool.query(
          `select id, run_id, event_type, provider, model, input_tokens,
                  output_tokens, estimated_cost, status, created_at
           from usage_events
           order by id`,
        );
        assert.deepEqual(
          usageEvents.rows.map(({ created_at, ...event }) => ({
            ...event,
            created_at: created_at.toISOString(),
          })),
          [
            {
              created_at: runAt,
              estimated_cost: null,
              event_type: "discord",
              id: "job-retry:retry-stop:2",
              input_tokens: null,
              model: null,
              output_tokens: null,
              provider: "discord",
              run_id: "job-retry",
              status: "retry_stopped",
            },
          ],
        );

        const post = await pool.query("select status from posts where id = $1", [
          "post-worker",
        ]);
        assert.equal(post.rows[0]?.status, "published");
      } finally {
        await pool.end();
      }
    });
  },
);

async function seedPostWithJobs(
  pool: pg.Pool,
  jobIds: readonly string[],
  {
    importance = "required",
    postStatus = "publishing",
    type = "render",
  }: {
    importance?: "required" | "retryable";
    postStatus?: "published" | "publishing";
    type?: "discord" | "render";
  } = {},
): Promise<void> {
  await pool.query(
    `insert into posts (
       id, slug, title, description, article_mode, status,
       created_at, updated_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $7)`,
    [
      "post-worker",
      "worker-post",
      "Worker post",
      "Worker integration test",
      "project_record",
      postStatus,
      runAt,
    ],
  );
  await pool.query(
    `insert into post_versions (
       id, post_id, version_no, title, description, content_markdown,
       content_html, content_hash, created_by, created_at
     ) values ($1, $2, 1, $3, $4, $5, $6, $7, 'system', $8)`,
    [
      "version-worker",
      "post-worker",
      "Worker post",
      "Worker integration test",
      "# Worker post\n",
      "<h1>Worker post</h1>",
      "a".repeat(64),
      runAt,
    ],
  );
  await pool.query(
    "update posts set current_version_id = $2 where id = $1",
    ["post-worker", "version-worker"],
  );

  for (const [index, jobId] of jobIds.entries()) {
    await pool.query(
      `insert into publish_jobs (
         id, post_id, post_version_id, type, importance, idempotency_key,
         status, retry_count
       ) values ($1, $2, $3, $4, $5, $6, 'queued', 0)`,
      [
        jobId,
        "post-worker",
        "version-worker",
        index === 0 ? type : "privacy_scan",
        importance,
        `post-worker:version-worker:${jobId}`,
      ],
    );
  }
}

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
