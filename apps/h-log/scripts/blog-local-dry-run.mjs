import pg from "pg";

import { runLocalBlogDryRun } from "../lib/blog-local-dry-run.ts";
import { runBlogMigrations } from "./blog-migrations.mjs";

const databaseUrl = process.env.DATABASE_URL;
const baseUrl = process.env.HLOG_DRY_RUN_BASE_URL ?? "http://127.0.0.1:8080";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

await runBlogMigrations(databaseUrl);

const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  const result = await runLocalBlogDryRun({
    pool,
    runAt: new Date().toISOString(),
  });
  const successPath = `/blog/${result.success.slug}`;
  const failurePath = `/blog/${result.failure.slug}`;

  await assertResponse(successPath, {
    includes: "Fake provider local dry-run",
    status: 200,
  });
  await assertResponse(`${successPath}.md`, {
    includes: "Fake provider local dry-run content.",
    status: 200,
  });
  await assertResponse(failurePath, { status: 404 });

  for (const path of ["/sitemap.xml", "/feed.xml", "/llms.txt", "/llms-full.txt"]) {
    await assertResponse(path, {
      excludes: result.failure.slug,
      includes: result.success.slug,
      status: 200,
    });
  }

  console.log(JSON.stringify({ baseUrl, ...result }));
} finally {
  await pool.end();
}

async function assertResponse(path, { excludes, includes, status }) {
  const response = await fetch(new URL(path, baseUrl));
  const body = await response.text();

  if (response.status !== status) {
    throw new Error(`${path}: expected HTTP ${status}, received ${response.status}`);
  }

  if (includes && !body.includes(includes)) {
    throw new Error(`${path}: expected response to include ${includes}`);
  }

  if (excludes && body.includes(excludes)) {
    throw new Error(`${path}: expected response to exclude ${excludes}`);
  }
}
