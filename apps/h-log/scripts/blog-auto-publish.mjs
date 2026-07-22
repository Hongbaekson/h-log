import { readFile } from "node:fs/promises";

import pg from "pg";

import {
  createDailyAutoPublishPostId,
  parseDailyAutoPublishInput,
  runDailyAutoPublishOnce,
} from "../lib/blog-auto-publish-runner.ts";
import { createHermesArticleGenerator } from "../lib/blog-hermes-article-provider.ts";
import { createPostgresBlogRepository } from "../lib/blog-postgres-repository.ts";
import {
  createPostgresBlogUsageLedger,
  resolveUsageBudgetPolicy,
} from "../lib/blog-usage-ledger.ts";

if (process.argv.slice(2).join(" ") !== "--once") {
  throw new Error("blog auto publish runner requires --once");
}

const databaseUrl = process.env.DATABASE_URL;
const inputFile = process.env.HLOG_AUTO_PUBLISH_INPUT_FILE;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (!inputFile) {
  throw new Error("HLOG_AUTO_PUBLISH_INPUT_FILE is required");
}

const dailyInput = parseDailyAutoPublishInput(
  JSON.parse(await readFile(inputFile, "utf8")),
);
const pool = new pg.Pool({ connectionString: databaseUrl });
const repository = createPostgresBlogRepository(pool);
const runAt = new Date().toISOString();

try {
  const result = await runDailyAutoPublishOnce({
    ...dailyInput,
    acquireDailyRunLock: createDailyRunLock(pool),
    generateArticle: createHermesArticleGenerator(),
    hasPersistedPost: async (postId) => {
      const query = await pool.query(
        "select exists(select 1 from posts where id = $1) as value",
        [postId],
      );

      return query.rows[0]?.value === true;
    },
    persistPublishingArticle: (aggregate) =>
      repository.savePost({ assets: [], ...aggregate }),
    policy: resolveUsageBudgetPolicy(process.env),
    runAt,
    usageLedger: createPostgresBlogUsageLedger(pool),
  });

  console.log(
    JSON.stringify({
      postId: result.post?.id ?? createDailyAutoPublishPostId(runAt),
      status: result.status,
      versionId: result.version?.id ?? null,
    }),
  );
} finally {
  await pool.end();
}

function createDailyRunLock(databasePool) {
  return async (lockKey) => {
    const client = await databasePool.connect();

    try {
      const result = await client.query(
        "select pg_try_advisory_lock(hashtext($1)) as acquired",
        [lockKey],
      );

      if (result.rows[0]?.acquired !== true) {
        client.release();
        return null;
      }

      return async () => {
        try {
          await client.query(
            "select pg_advisory_unlock(hashtext($1))",
            [lockKey],
          );
        } finally {
          client.release();
        }
      };
    } catch (error) {
      client.release();
      throw error;
    }
  };
}
