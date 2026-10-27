import { readFile } from "node:fs/promises";

import pg from "pg";

import { createHermesArticleGenerator } from "../lib/blog-hermes-article-provider.ts";
import { runDraftRequestOnce } from "../lib/blog-draft-requests.ts";
import { runDailyAutomationOnce } from "../lib/blog-automation-runner.ts";
import {
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

const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000, statement_timeout: 10000, query_timeout: 11000 });
try {
  const output = mode === "--draft-once"
    ? await runDraftRequestOnce({ pool, enabled: true, generateArticle: createHermesArticleGenerator(), policy: resolveUsageBudgetPolicy(process.env) })
    : await runDailyAutomationOnce({ pool, loadInput: async () => {
      if (!inputFile) throw new Error("HLOG_AUTO_PUBLISH_INPUT_FILE is required");
      return JSON.parse(await readFile(inputFile, "utf8"));
    }, generateArticle: createHermesArticleGenerator() });
  console.log(JSON.stringify(output));
} finally {
  await pool.end();
}
