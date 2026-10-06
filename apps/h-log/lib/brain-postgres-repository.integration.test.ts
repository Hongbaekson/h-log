import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { createBrainRepository } from "./brain-postgres-repository.ts";

const databaseUrl = process.env.DATABASE_URL;
const draft = {
  title: "PRIVATE_TITLE_SENTINEL", originalText: "  PRIVATE_ORIGINAL_SENTINEL\n그때 적은 문장  ",
  publicTitle: "공개용 질문", publicSummary: "다시 확인할 내용", publicBody: "공개용으로 따로 쓴 메모",
  kind: "question", topic: "reliability", basis: "question", tags: ["복구"],
};

test("Brain capture preserves history, explicitly publishes snapshots and rejects stale edits", { skip: !databaseUrl && "DATABASE_URL is required" }, async () => {
  const url = new URL(databaseUrl!);
  const name = `hlog_brain_${randomUUID().replaceAll("-", "")}`;
  const adminUrl = new URL(url); adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`create database ${name}`);
  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString() });
  try {
    await runBlogMigrations(url.toString());
    const repository = createBrainRepository(pool);
    const first = await repository.saveDraft(draft);
    assert.equal(first.revision, 1);
    assert.equal((await repository.getOwnerNote(first.id))?.draft.originalText, draft.originalText);
    assert.equal((await repository.listOwnerNotes())[0].title, draft.title);
    assert.deepEqual(await repository.findPublicNodes(), []);
    await assert.rejects(repository.publish(first.id, 1, false), /publication_confirmation_required/);
    await repository.publish(first.id, 1, true);
    const publicBefore = await repository.findPublicNodes();
    assert.equal(publicBefore[0].title, draft.publicTitle);
    assert.doesNotMatch(JSON.stringify(publicBefore), /PRIVATE_|originalText|history/);

    const changed = { ...draft, originalText: "PRIVATE_EDIT_SENTINEL", publicBody: "아직 공개하지 않은 수정" };
    await repository.saveDraft(changed, first.id, 1);
    assert.deepEqual(await repository.findPublicNodes(), publicBefore);
    await assert.rejects(repository.saveDraft(draft, first.id, 1), /revision_conflict/);
    await assert.rejects(repository.publish(first.id, 1, true), /revision_conflict/);
    const history = (await repository.getOwnerNote(first.id))!.history;
    assert.deepEqual(history.map(version => version.revision), [2, 1]);
    assert.equal(history[1].draft.originalText, draft.originalText);
    await assert.rejects(pool.query("update brain_note_versions set draft = '{}' where note_id = $1", [first.id]), /brain_history_is_immutable/);
    await assert.rejects(pool.query("delete from brain_note_versions where note_id = $1", [first.id]), /brain_history_is_immutable/);

    await pool.query("alter table brain_note_versions add constraint test_reject check (draft->>'title' <> 'reject')");
    await assert.rejects(repository.saveDraft({ ...draft, title: "reject" }, first.id, 2));
    assert.equal((await repository.getOwnerNote(first.id))?.revision, 2);
    assert.equal((await repository.getOwnerNote(first.id))?.history.length, 2);

    const attempts = await Promise.allSettled([
      repository.saveDraft({ ...draft, title: "동시 수정 A" }, first.id, 2),
      repository.saveDraft({ ...draft, title: "동시 수정 B" }, first.id, 2),
    ]);
    assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(attempts.filter(result => result.status === "rejected").length, 1);
    assert.equal((await repository.getOwnerNote(first.id))?.revision, 3);
    const restricted = createBrainRepository(pool, { restrictedTerms: [{ category: "organization_name", value: draft.publicTitle }] });
    assert.deepEqual(await restricted.findPublicNodes(), []);
    await repository.unpublish(first.id, 3);
    assert.deepEqual(await repository.findPublicNodes(), []);
    assert.equal((await repository.getOwnerNote(first.id))?.history.length, 3);
    assert.equal((await repository.getOwnerNote(first.id))?.publishedRevision, null);

    const risky = await repository.saveDraft({ ...draft, publicBody: "http://service.internal/private" });
    await assert.rejects(repository.publish(risky.id, 1, true), /public_copy_blocked/);
    assert.deepEqual(await repository.findPublicNodes(), []);
  } finally {
    await pool.end();
    await admin.query(`drop database ${name}`);
    await admin.end();
  }
});
