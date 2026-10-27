import { readFile } from "node:fs/promises";

import pg from "pg";

import {
  createDailyAutoPublishOutput,
  createDailyAutoPublishPostId,
  parseDailyAutoPublishInput,
  runDailyAutoPublishOnce,
} from "../lib/blog-auto-publish-runner.ts";
import { createHermesArticleGenerator } from "../lib/blog-hermes-article-provider.ts";
import { createPostgresBlogRepository } from "../lib/blog-postgres-repository.ts";
import { generationLockKey, runDraftRequestOnce } from "../lib/blog-draft-requests.ts";
import {
  createPostgresBlogUsageLedger,
  resolveUsageBudgetPolicy,
} from "../lib/blog-usage-ledger.ts";

const mode = process.argv.slice(2).join(" ");
if (!["--once", "--draft-once"].includes(mode)) {
  throw new Error("blog auto publish runner requires --once or --draft-once");
}
if (mode === "--draft-once" && process.env.HLOG_BLOG_DRAFT_GENERATION_ENABLED !== "1") {
  console.log(JSON.stringify({ status: "disabled" }));
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
const inputFile = process.env.HLOG_AUTO_PUBLISH_INPUT_FILE;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (mode === "--once" && !inputFile) {
  throw new Error("HLOG_AUTO_PUBLISH_INPUT_FILE is required");
}

const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000, statement_timeout: 10000, query_timeout: 11000 });
try {
  const output = mode === "--draft-once"
    ? await runDraftRequestOnce({ pool, enabled: true, generateArticle: createHermesArticleGenerator(), policy: resolveUsageBudgetPolicy(process.env) })
    : await runDaily();
  console.log(JSON.stringify(output));
} finally {
  await pool.end();
}

async function runDaily() {
  const runAt = new Date().toISOString();
  const postId = createDailyAutoPublishPostId(runAt);
  const releaseGeneration = await createDailyRunLock(pool)(generationLockKey);
  if (!releaseGeneration) return { status: "busy", postId };
  try {
    const uncertain = await pool.query("select 1 from blog_draft_requests where status in ('running','needs_review') limit 1");
    if (uncertain.rowCount) return { status: "attention_required", postId };
    const dailyInput = parseDailyAutoPublishInput(JSON.parse(await readFile(inputFile, "utf8")));
    const repository = createPostgresBlogRepository(pool);
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
      hasPersistedPostSlug: async (slug) => {
        const query = await pool.query(
          "select exists(select 1 from posts where slug = $1) as value",
          [slug],
        );
        return query.rows[0]?.value === true;
      },
      persistPublishingArticle: (aggregate) =>
        repository.savePost({ assets: [], ...aggregate }),
      policy: resolveUsageBudgetPolicy(process.env),
      runAt,
      usageLedger: createPostgresBlogUsageLedger(pool),
    });
    return createDailyAutoPublishOutput(result, runAt);
  } finally { await releaseGeneration(); }
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
