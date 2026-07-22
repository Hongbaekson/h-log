import { randomUUID } from "node:crypto";

import pg from "pg";

import { runPersistentWorkerOnce } from "../lib/blog-persistent-worker.ts";
import { createBlogPrivacyScanPolicyFromEnvironment } from "../lib/blog-privacy-scanner.ts";
import { createPostgresRequiredPublishJobAdapter } from "../lib/blog-required-publish-job-adapter.ts";

if (process.argv.slice(2).join(" ") !== "--once") {
  throw new Error("blog worker requires --once");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const publicBaseUrl =
  process.env.HLOG_WORKER_PUBLIC_BASE_URL ?? process.env.HLOG_PUBLIC_BASE_URL;

if (!publicBaseUrl) {
  throw new Error("HLOG_WORKER_PUBLIC_BASE_URL or HLOG_PUBLIC_BASE_URL is required");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const postId = process.env.HLOG_WORKER_POST_ID?.trim() || undefined;

try {
  const result = await runPersistentWorkerOnce({
    adapter: createPostgresRequiredPublishJobAdapter({
      pool,
      privacyScanPolicy: createBlogPrivacyScanPolicyFromEnvironment(process.env),
      publicBaseUrl,
    }),
    importance: postId ? "required" : undefined,
    pool,
    postId,
    runAt: new Date().toISOString(),
    workerId: randomUUID(),
  });

  console.log(
    JSON.stringify({
      jobId: "job" in result ? result.job.id : null,
      postId: "job" in result ? result.job.postId : postId ?? null,
      status: result.status,
    }),
  );
  process.exitCode =
    result.status === "idle" || result.status === "succeeded" ? 0 : 1;
} finally {
  await pool.end();
}
