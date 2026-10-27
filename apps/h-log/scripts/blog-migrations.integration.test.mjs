import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

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
      "select pg_terminate_backend(pid, 5000) from pg_stat_activity where datname = $1",
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
      assert.deepEqual(firstRun.appliedVersions, [
        "001_blog_core",
        "002_publish_job_leases",
        "003_publish_rollback_audit",
        "004_brain_capture",
        "005_blog_public_editorial",
        "006_brain_admin_commands",
        "007_resume_pdf_storage",
        "008_blog_editorial_commands",
      ]);

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

      const leaseColumns = await database.query(
        `select column_name, is_nullable
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'publish_jobs'
           and column_name in ('lease_owner', 'lease_expires_at')
         order by column_name`,
      );
      assert.deepEqual(leaseColumns.rows, [
        { column_name: "lease_expires_at", is_nullable: "YES" },
        { column_name: "lease_owner", is_nullable: "YES" },
      ]);

      const secondRun = await runBlogMigrations(testUrl.toString());
      assert.deepEqual(secondRun.appliedVersions, []);
      assert.equal(secondRun.currentVersion, "008_blog_editorial_commands");

      const versions = await database.query(
        "select version from schema_migrations order by version",
      );
      assert.deepEqual(versions.rows, [
        { version: "001_blog_core" },
        { version: "002_publish_job_leases" },
        { version: "003_publish_rollback_audit" },
        { version: "004_brain_capture" },
        { version: "005_blog_public_editorial" },
        { version: "006_brain_admin_commands" },
        { version: "007_resume_pdf_storage" },
        { version: "008_blog_editorial_commands" },
      ]);
    } finally {
      await database.end();
      await admin.query(
        "select pg_terminate_backend(pid, 5000) from pg_stat_activity where datname = $1",
        [testDatabaseName],
      );
      await admin.query(`drop database if exists ${testDatabaseName}`);
      await admin.end();
    }
  },
);

test("Brain command migration preserves legacy versions, public snapshots and audit rows", { skip: !databaseUrl && "DATABASE_URL is required" }, async () => {
  const url = new URL(databaseUrl);
  const name = `hlog_upgrade_${randomUUID().replaceAll("-", "")}`;
  url.pathname = "/postgres";
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query(`create database ${name}`);
  url.pathname = `/${name}`;
  const database = new Client({ connectionString: url.toString() });
  try {
    await database.connect();
    await database.query("create table schema_migrations (version text primary key, applied_at timestamptz not null default now())");
    for (const version of ["001_blog_core", "002_publish_job_leases", "003_publish_rollback_audit", "004_brain_capture", "005_blog_public_editorial"]) {
      await database.query(await readFile(new URL(`../migrations/${version}.sql`, import.meta.url), "utf8"));
      await database.query("insert into schema_migrations (version) values ($1)", [version]);
    }
    const id = `note-${randomUUID()}`;
    await database.query("begin");
    await database.query("insert into brain_notes (id) values ($1)", [id]);
    await database.query("insert into brain_note_versions (note_id, revision, draft) values ($1, 1, $2)", [id, JSON.stringify({ originalText: "  PRIVATE_ORIGINAL\n unchanged  " })]);
    await database.query("update brain_notes set current_revision = 1, published_revision = 1, public_node = $2 where id = $1", [id, JSON.stringify({ id, title: "Reviewed legacy snapshot" })]);
    await database.query("insert into admin_actions values ('legacy', 'unpublish', 'admin', 'owner', 'post', 'synthetic-post', 'legacy reason', now())");
    await database.query("commit");
    const versions = await database.query("select * from brain_note_versions");
    const notes = await database.query("select * from brain_notes");
    const audit = await database.query("select * from admin_actions");
    await database.query(await readFile(new URL("../migrations/006_brain_admin_commands.sql", import.meta.url), "utf8"));
    await database.query("insert into schema_migrations (version) values ('006_brain_admin_commands')");
    assert.deepEqual((await database.query("select * from brain_note_versions")).rows, versions.rows);
    assert.deepEqual((await database.query("select * from brain_notes")).rows, notes.rows.map(note => ({ ...note, command_revision: 0 })));
    assert.deepEqual((await database.query("select * from admin_actions")).rows, audit.rows.map(row => ({ ...row, command_id: null, request_fingerprint: null, command_receipt: null })));
    await database.query("update brain_notes set command_revision = 2 where id = $1", [id]);
    await database.query(`insert into admin_actions
      (id, action_type, actor_type, actor_id, target_type, target_id, reason, created_at, command_id, request_fingerprint, command_receipt)
      values ('brain-command', 'save', 'admin', 'owner', 'brain_note', $1, 'brain_saved', now(), $2, $3, $4)`,
    [id, randomUUID(), "b".repeat(64), JSON.stringify({ action: "save", noteId: id, commandRevision: 2 })]);
    const beforePdfNotes = await database.query("select * from brain_notes");
    const beforePdfAudit = await database.query("select * from admin_actions order by id");
    assert.deepEqual((await runBlogMigrations(url.toString())).appliedVersions, ["007_resume_pdf_storage", "008_blog_editorial_commands"]);
    assert.deepEqual((await database.query("select * from brain_note_versions")).rows, versions.rows);
    assert.deepEqual((await database.query("select * from brain_notes")).rows, beforePdfNotes.rows);
    assert.deepEqual((await database.query("select * from admin_actions order by id")).rows, beforePdfAudit.rows);
    assert.deepEqual((await runBlogMigrations(url.toString())).appliedVersions, []);
  } finally {
    await database.end();
    await admin.query(`drop database ${name}`);
    await admin.end();
  }
});
