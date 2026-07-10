import assert from "node:assert/strict";
import test from "node:test";

import pg from "pg";

import {
  BLOG_MIGRATION_TABLES,
  runBlogMigrations,
} from "./blog-migrations.mjs";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

test(
  "applies the blog schema once and reports the current migration version",
  { skip: databaseUrl ? false : "DATABASE_URL is required" },
  async () => {
    const adminUrl = new URL(databaseUrl);
    const testDatabaseName = "hlog_migration_test";
    adminUrl.pathname = "/postgres";

    const admin = new Client({ connectionString: adminUrl.toString() });
    await admin.connect();
    await admin.query(
      "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1",
      [testDatabaseName],
    );
    await admin.query(`drop database if exists ${testDatabaseName}`);
    await admin.query(`create database ${testDatabaseName}`);

    const testUrl = new URL(databaseUrl);
    testUrl.pathname = `/${testDatabaseName}`;
    const database = new Client({ connectionString: testUrl.toString() });

    try {
      await database.connect();
      await assert.rejects(database.query("select count(*) from posts"), /posts/);

      const firstRun = await runBlogMigrations(testUrl.toString());
      assert.deepEqual(firstRun.appliedVersions, ["001_blog_core"]);

      const extension = await database.query(
        "select extname from pg_extension where extname = 'vector'",
      );
      assert.equal(extension.rows[0]?.extname, "vector");

      const tables = await database.query(
        "select tablename from pg_tables where schemaname = 'public' order by tablename",
      );
      assert.deepEqual(
        tables.rows.map(({ tablename }) => tablename),
        ["schema_migrations", ...BLOG_MIGRATION_TABLES].sort(),
      );

      const secondRun = await runBlogMigrations(testUrl.toString());
      assert.deepEqual(secondRun.appliedVersions, []);
      assert.equal(secondRun.currentVersion, "001_blog_core");

      const versions = await database.query(
        "select version from schema_migrations order by version",
      );
      assert.deepEqual(versions.rows, [{ version: "001_blog_core" }]);
    } finally {
      await database.end();
      await admin.query(
        "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1",
        [testDatabaseName],
      );
      await admin.query(`drop database if exists ${testDatabaseName}`);
      await admin.end();
    }
  },
);
