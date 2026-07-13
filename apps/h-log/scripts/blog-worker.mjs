import pg from "pg";

import { runPersistentWorkerOnce } from "../lib/blog-persistent-worker.ts";

if (process.argv.slice(2).join(" ") !== "--once") {
  throw new Error("blog worker requires --once");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await runPersistentWorkerOnce({
    adapter: {
      async run(job) {
        return {
          error: `publish job ${job.type} adapter is disabled`,
          status: "failed",
        };
      },
    },
    pool,
    runAt: new Date().toISOString(),
  });

  console.log(
    JSON.stringify({
      jobId: "job" in result ? result.job.id : null,
      status: result.status,
    }),
  );
  process.exitCode =
    result.status === "idle" || result.status === "succeeded" ? 0 : 1;
} finally {
  await pool.end();
}
