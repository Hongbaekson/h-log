import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { runBlogMigrations } from "../scripts/blog-migrations.mjs";
import { createBrainRepository } from "./brain-postgres-repository.ts";

const meta = (commandRevision: number) => ({ commandId: randomUUID(), commandRevision });
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
    const command = { commandId: randomUUID(), commandRevision: 0 };
    const duplicates = await Promise.all([
      repository.saveDraft(draft, undefined, 0, command),
      repository.saveDraft(draft, undefined, 0, command),
    ]);
    assert.deepEqual(duplicates[0], duplicates[1], "Concurrent retries must return the same saved note and receipt");
    assert.equal((await pool.query("select count(*)::int as count from brain_notes")).rows[0].count, 1);
    const first = duplicates[0];
    assert.equal(first.commandRevision, 1);
    await assert.rejects(repository.saveDraft({ ...draft, title: "changed" }, undefined, 0, command), /command_conflict/);
    assert.deepEqual(await repository.saveDraft(Object.fromEntries(Object.entries(draft).reverse()), undefined, 0, command), first);
    assert.equal(first.revision, 1);
    assert.equal((await repository.getOwnerNote(first.id))?.draft.originalText, draft.originalText);
    assert.equal((await repository.listOwnerNotes())[0].title, draft.title);
    assert.deepEqual((await repository.findPublicGraph()).nodes, []);
    await assert.rejects(repository.publish(first.id, 1, false, meta(1)), /publication_confirmation_required/);
    await repository.publish(first.id, 1, true, meta(1));
    const publicBefore = (await repository.findPublicGraph()).nodes;
    assert.equal(publicBefore[0].title, draft.publicTitle);
    assert.doesNotMatch(JSON.stringify(publicBefore), /PRIVATE_|originalText|history/);

    const changed = { ...draft, originalText: "PRIVATE_EDIT_SENTINEL", publicBody: "아직 공개하지 않은 수정" };
    await repository.saveDraft(changed, first.id, 1, meta(2));
    assert.deepEqual((await repository.findPublicGraph()).nodes, publicBefore);
    await assert.rejects(repository.saveDraft(draft, first.id, 1, meta(2)), /revision_conflict/);
    await assert.rejects(repository.publish(first.id, 1, true, meta(1)), /revision_conflict/);
    const history = (await repository.getOwnerNote(first.id))!.history;
    assert.deepEqual(history.map(version => version.revision), [2, 1]);
    assert.equal(history[1].draft.originalText, draft.originalText);
    await assert.rejects(pool.query("update brain_note_versions set draft = '{}' where note_id = $1", [first.id]), /brain_history_is_immutable/);
    await assert.rejects(pool.query("delete from brain_note_versions where note_id = $1", [first.id]), /brain_history_is_immutable/);

    await pool.query("alter table brain_note_versions add constraint test_reject check (draft->>'title' <> 'reject')");
    await assert.rejects(repository.saveDraft({ ...draft, title: "reject" }, first.id, 2, meta(3)));
    assert.equal((await repository.getOwnerNote(first.id))?.revision, 2);
    assert.equal((await repository.getOwnerNote(first.id))?.history.length, 2);

    const attempts = await Promise.allSettled([
      repository.saveDraft({ ...draft, title: "동시 수정 A" }, first.id, 2, meta(3)),
      repository.saveDraft({ ...draft, title: "동시 수정 B" }, first.id, 2, meta(3)),
    ]);
    assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(attempts.filter(result => result.status === "rejected").length, 1);
    assert.equal((await repository.getOwnerNote(first.id))?.revision, 3);
    const restricted = createBrainRepository(pool, { restrictedTerms: [{ category: "organization_name", value: draft.publicTitle }] });
    assert.deepEqual((await restricted.findPublicGraph()).nodes, []);
    await repository.unpublish(first.id, 3, meta(4));
    assert.deepEqual((await repository.findPublicGraph()).nodes, []);
    assert.equal((await repository.getOwnerNote(first.id))?.history.length, 3);
    assert.equal((await repository.getOwnerNote(first.id))?.publishedRevision, null);

    const risky = await repository.saveDraft({ ...draft, publicBody: "http://service.internal/private" }, undefined, 0, meta(0));
    await assert.rejects(repository.publish(risky.id, 1, true, meta(1)), /public_copy_blocked/);
    assert.deepEqual((await repository.findPublicGraph()).nodes, []);

    const reflection = await repository.saveDraft({ ...draft, originalText: "새로 적은 회고", occurredOn: "2025-04-03", shareOccurredOn: true,
      links: [{ target: first.id, relation: "revises", reason: "당시 판단을 다시 살펴봤다." }] }, undefined, 0, meta(0));
    await repository.publish(reflection.id, 1, true, meta(1));
    assert.equal((await repository.findPublicGraph()).edges.length, 0);
    await repository.publish(first.id, 3, true, meta(5));
    assert.deepEqual((await repository.findPublicGraph()).edges, [{ from: reflection.id, to: first.id, relation: "revises", reason: "당시 판단을 다시 살펴봤다." }]);
    assert.equal((await repository.getOwnerNote(first.id))?.history[2].draft.originalText, draft.originalText);
    assert.equal((await repository.listOwnerNotes()).find(n => n.id === reflection.id)?.occurredOn, "2025-04-03");
    await assert.rejects(repository.saveDraft({ ...draft, links: [{ target: "missing-record", relation: "extends", reason: "이유" }] }, undefined, 0, meta(0)), /invalid_link/);
    await assert.rejects(repository.saveDraft({ ...draft, links: [{ target: reflection.id, relation: "revises", reason: "이유" }] }, reflection.id, 1, meta(2)), /invalid_link/);
    await repository.unpublish(first.id, 3, meta(6));
    assert.equal((await repository.findPublicGraph()).edges.length, 0);

    const beforeRace = (await repository.getOwnerNote(first.id))!;
    const race = await Promise.allSettled([
      repository.publish(first.id, 3, true, meta(beforeRace.commandRevision)),
      repository.unpublish(first.id, 3, meta(beforeRace.commandRevision)),
    ]);
    assert.equal(race.filter(result => result.status === "fulfilled").length, 1);
    assert.match((race.find(result => result.status === "rejected") as PromiseRejectedResult).reason.message, /command_revision_conflict/);
    const afterRace = (await repository.getOwnerNote(first.id))!;
    assert.equal(afterRace.revision, 3);
    assert.equal(afterRace.commandRevision, beforeRace.commandRevision + 1);
    assert.equal(afterRace.actions.length, afterRace.commandRevision);
    assert.deepEqual(afterRace.actions.map(item => item.commandRevision), Array.from({ length: afterRace.commandRevision }, (_, i) => afterRace.commandRevision - i));
    // Original receipts remain valid after later edits and publication changes.
    assert.deepEqual(await repository.saveDraft(draft, undefined, 0, command), first);
    const audit = await pool.query("select * from admin_actions where target_type = 'brain_note'");
    assert.doesNotMatch(JSON.stringify(audit.rows), /PRIVATE_|originalText|公開|공개용으로 따로 쓴 메모/);
    const count = audit.rowCount;
    const failedCommand = meta(afterRace.commandRevision);
    // A deferred audit failure happens at commit, after the note/version updates.
    await pool.query(`create function reject_test_audit() returns trigger language plpgsql as $$ begin raise exception 'audit_write_failed'; end $$;
      create constraint trigger reject_test_audit after insert on admin_actions deferrable initially deferred
      for each row execute function reject_test_audit()`);
    await assert.rejects(repository.saveDraft(changed, first.id, 3, failedCommand), /audit_write_failed/);
    await assert.rejects(repository.unpublish(first.id, 3, meta(afterRace.commandRevision)), /audit_write_failed/);
    assert.deepEqual(await repository.getOwnerNote(first.id), afterRace);
    assert.equal((await pool.query("select count(*)::int as count from admin_actions")).rows[0].count, count);
    await pool.query("drop trigger reject_test_audit on admin_actions; drop function reject_test_audit()");
    assert.equal((await repository.saveDraft(changed, first.id, 3, failedCommand)).revision, 4);
  } finally {
    await pool.end();
    await admin.query(`drop database ${name}`);
    await admin.end();
  }
});
