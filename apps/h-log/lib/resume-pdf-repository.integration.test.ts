import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { createResumeRepository } from "./resume-pdf-repository.ts";
import type { ResumeInspection } from "./resume-pdf.ts";

test("private PDF versions, receipts, revisions and audit commit atomically", { skip: !process.env.DATABASE_URL && "DATABASE_URL is required" }, async () => {
  const url = new URL(process.env.DATABASE_URL!);
  const database = `hlog_resume_${randomUUID().replaceAll("-", "")}`;
  const adminUrl = new URL(url); adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`create database ${database}`);
  url.pathname = `/${database}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 5 });
  const repository = createResumeRepository(pool);
  const inspection: ResumeInspection = { policy: "resume-pdf-v1", pages: 1, text: "Synthetic", metadata: "", links: [], tools: { qpdf: "12.3.2", poppler: "25.12.0" } };
  const bytes = Buffer.from("Synthetic validated PDF fixture");
  const command = { commandId: randomUUID(), expectedRevision: 0 };
  try {
    await runBlogMigrations(url.toString());
    const first = await repository.saveUpload(bytes, inspection, command);
    assert.equal(first.revision, 1); assert.equal(first.publicVersionId, null);
    assert.deepEqual(await repository.saveUpload(bytes, inspection, command), first);
    assert.equal((await repository.list()).versions.length, 1);
    const stored = await repository.file(first.targetId);
    assert.deepEqual(stored?.bytes, bytes);
    assert.equal(stored?.sha256, createHash("sha256").update(bytes).digest("hex"));
    await assert.rejects(repository.saveUpload(Buffer.from("changed"), inspection, command), /command_conflict/);
    await assert.rejects(repository.saveUpload(bytes, inspection, { commandId: randomUUID(), expectedRevision: 1 }), /duplicate_file/);
    await pool.query(`update resume_pdf_state set public_version_id = $1, public_sha256 = $2, publication_epoch = $3,
      reviewed_at = now(), reviewed_by = 'owner', review_checklist = '{"allPages":true,"metadataAndLinks":true,"privacyAndOrganizations":true,"hiddenContentAndSource":true}'`, [first.targetId, stored!.sha256, randomUUID()]);
    const edit = { action: "save_note" as const, commandId: randomUUID(), expectedRevision: 1, id: first.targetId, note: "PRIVATE_NOTE" };
    const edited = await repository.saveNote(edit);
    assert.equal(edited.revision, 2);
    assert.equal(edited.publicVersionId, first.targetId);
    assert.deepEqual(await repository.saveNote(edit), edited);
    assert.equal((await repository.detail(first.targetId))?.note, "PRIVATE_NOTE");
    assert.deepEqual((await repository.file(first.targetId))?.bytes, bytes);
    await assert.rejects(repository.saveNote({ ...edit, commandId: randomUUID() }), /revision_conflict/);
    const audit = await pool.query("select reason, command_receipt from admin_actions where target_type = 'resume_pdf_version'");
    assert.equal(audit.rowCount, 2); assert.ok(!JSON.stringify(audit.rows).includes("PRIVATE_NOTE"));
    await pool.query("create function resume_test_fail() returns trigger language plpgsql as $$ begin raise exception 'synthetic audit failure'; end $$");
    await pool.query("create trigger resume_test_fail before insert on admin_actions for each row execute function resume_test_fail()");
    await assert.rejects(repository.saveUpload(Buffer.from("second"), inspection, { commandId: randomUUID(), expectedRevision: 2 }), /synthetic audit failure/);
    assert.equal((await repository.list()).revision, 2);
    assert.equal((await repository.list()).versions.length, 1);
    await pool.query("drop trigger resume_test_fail on admin_actions; drop function resume_test_fail()");
    const concurrent = await Promise.allSettled(["A", "B"].map(note => repository.saveNote({ ...edit, commandId: randomUUID(), expectedRevision: 2, note })));
    assert.equal(concurrent.filter(result => result.status === "fulfilled").length, 1);
    await assert.rejects(pool.query("update resume_pdf_versions set bytes = $1, byte_size = $2 where id = $3", [Buffer.from("different"), 9, first.targetId]), /immutable/);
    await repository.withProcessingLock(async () => {
      await assert.rejects(repository.withProcessingLock(async () => true), /pdf_busy/);
    });
    await assert.rejects(repository.withProcessingLock(async () => { throw new Error("synthetic"); }), /synthetic/);
    assert.equal(await repository.withProcessingLock(async () => true), true);
    for (let i = 1; i < 20; i++) await repository.saveUpload(Buffer.from(`version ${i}`), inspection, { commandId: randomUUID(), expectedRevision: i + 2 });
    await assert.rejects(repository.saveUpload(Buffer.from("overflow"), inspection, { commandId: randomUUID(), expectedRevision: 22 }), /storage_full/);
    assert.equal((await repository.list()).versions.length, 20);
    assert.equal((await repository.list()).publicVersionId, first.targetId);
    const reconnected = new pg.Pool({ connectionString: url.toString() });
    try { assert.equal((await createResumeRepository(reconnected).list()).versions.length, 20); } finally { await reconnected.end(); }
  } finally {
    await pool.end();
    await admin.query(`drop database ${database}`);
    await admin.end();
  }
});
