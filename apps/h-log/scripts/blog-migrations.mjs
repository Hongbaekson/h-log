import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

const { Client } = pg;
const migrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations",
);

export const BLOG_MIGRATION_TABLES = [
  "posts",
  "post_versions",
  "post_tags",
  "post_sources",
  "post_assets",
  "publish_jobs",
  "usage_events",
  "publish_verifications",
  "admin_actions",
];

export async function runBlogMigrations(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({ connectionString });
  const appliedVersions = [];

  await client.connect();

  try {
    await client.query("select pg_advisory_lock(710493707)");
    await client.query(`
      create table if not exists schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((file) => /^\d+_[a-z0-9_]+\.sql$/.test(file))
      .sort();

    for (const file of migrationFiles) {
      const version = file.slice(0, -4);
      const existing = await client.query(
        "select 1 from schema_migrations where version = $1",
        [version],
      );

      if (existing.rowCount) {
        continue;
      }

      await client.query("begin");

      try {
        await client.query(await readFile(join(migrationsDirectory, file), "utf8"));
        await client.query(
          "insert into schema_migrations (version) values ($1)",
          [version],
        );
        await client.query("commit");
        appliedVersions.push(version);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    const current = await client.query(
      "select version from schema_migrations order by version desc limit 1",
    );

    return {
      appliedVersions,
      currentVersion: current.rows[0]?.version ?? null,
    };
  } finally {
    await client.query("select pg_advisory_unlock(710493707)").catch(() => undefined);
    await client.end();
  }
}

const isCommandLine =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isCommandLine) {
  runBlogMigrations()
    .then(({ appliedVersions, currentVersion }) => {
      console.log(
        `blog migrations: current=${currentVersion ?? "none"} applied=${appliedVersions.length}`,
      );
    })
    .catch((error) => {
      console.error(`blog migrations failed: ${error.message}`);
      process.exitCode = 1;
    });
}
