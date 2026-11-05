import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
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

test("provenance versions retain selected snapshots and replay pre-provenance command receipts", { skip: !databaseUrl && "DATABASE_URL is required" }, async () => {
  const url = new URL(databaseUrl!);
  const name = `hlog_brain_${randomUUID().replaceAll("-", "")}`;
  const adminUrl = new URL(url); adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect(); await admin.query(`create database ${name}`);
  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString() });
  try {
    await runBlogMigrations(url.toString());
    const repository = createBrainRepository(pool);
    // Seed the old wire payload independently of the new parser/canonicalizer.
    const oldPayload = { action: "save", commandRevision: 0, draft: {
      basis: draft.basis, kind: draft.kind, originalText: draft.originalText, publicBody: draft.publicBody,
      publicSummary: draft.publicSummary, publicTitle: draft.publicTitle, tags: draft.tags, title: draft.title, topic: draft.topic,
    }, id: null, revision: 0 };
    const oldCommand = meta(0), oldReceipt = { id: `note-${randomUUID()}`, revision: 1, commandRevision: 1 };
    const fingerprint = createHash("sha256").update(JSON.stringify(oldPayload)).digest("hex");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("insert into brain_notes(id) values($1)", [oldReceipt.id]);
      await client.query("insert into brain_note_versions(note_id,revision,draft) values($1,1,$2)", [oldReceipt.id, JSON.stringify(draft)]);
      await client.query("update brain_notes set current_revision=1, command_revision=1 where id=$1", [oldReceipt.id]);
      await client.query(`insert into admin_actions(id,action_type,actor_type,actor_id,target_type,target_id,reason,command_id,request_fingerprint,command_receipt,created_at)
        values($1,'save','admin','owner','brain_note',$2,'private_note_saved',$3,$4,$5,now())`,
      [randomUUID(), oldReceipt.id, oldCommand.commandId, fingerprint, JSON.stringify(oldReceipt)]);
      await client.query("commit");
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
    assert.deepEqual(await repository.saveDraft(draft, undefined, 0, oldCommand), oldReceipt);
    assert.deepEqual((await repository.getOwnerNote(oldReceipt.id))!.draft, draft);
    await repository.publish(oldReceipt.id, 1, true, meta(1));
    await pool.query("update brain_notes set public_node=public_node-'sources'-'questions' where id=$1", [oldReceipt.id]);
    const stored = async () => (await pool.query("select public_node::text as value from brain_notes where id=$1", [oldReceipt.id])).rows[0].value;
    const oldSnapshot = await stored();
    const legacy = (await repository.findPublicGraph()).nodes[0];
    assert.deepEqual(legacy.sources, [{ label: "작성자가 직접 정리한 공개 메모", href: undefined }]);
    assert.deepEqual(legacy.questions, []); assert.equal(await stored(), oldSnapshot);

    const version2 = { ...draft, sources: [{ label: "  문서  ", href: " https://example.com/reference " }, { label: "이력서", href: "/resume" }], questions: ["  다시 확인할 조건은?  ", "장애 후\n어디서 재개할까?"] };
    const save = meta(2);
    const receipts = await Promise.all([repository.saveDraft(version2, oldReceipt.id, 1, save), repository.saveDraft(version2, oldReceipt.id, 1, save)]);
    assert.deepEqual(receipts[0], receipts[1]); assert.equal(receipts[0].revision, 2);
    assert.equal(await stored(), oldSnapshot);
    assert.deepEqual((await repository.getOwnerNote(oldReceipt.id))!.draft, version2);
    for (const patch of [{ questions: ["다른 질문"] }, { sources: [...version2.sources].reverse() }, { sources: [] }, { questions: ["다시 확인할 조건은?", version2.questions[1]] }]) {
      await assert.rejects(repository.saveDraft({ ...version2, ...patch }, oldReceipt.id, 1, save), /command_conflict/);
    }
    await assert.rejects(repository.publish(oldReceipt.id, 1, true, meta(3)), /revision_conflict/);
    await repository.publish(oldReceipt.id, 2, true, meta(3));
    const public2 = await stored();
    const node = (await repository.findPublicGraph()).nodes[0];
    assert.deepEqual(node.sources, [{ label: "문서", href: "https://example.com/reference" }, { label: "이력서", href: "/resume" }]);
    assert.deepEqual(node.questions, version2.questions.map(question => question.trim()));
    await assert.rejects(repository.unpublish(oldReceipt.id, 2, meta(3)), /command_revision_conflict/);

    const version3 = { ...version2, sources: [{ label: "someone@example.com" }], questions: ["PRIVATE_PENDING_QUESTION"] };
    await repository.saveDraft(version3, oldReceipt.id, 2, meta(4));
    const beforeBlocked = await repository.getOwnerNote(oldReceipt.id);
    await assert.rejects(repository.publish(oldReceipt.id, 3, true, meta(5)), /public_copy_blocked/);
    assert.deepEqual(await repository.getOwnerNote(oldReceipt.id), beforeBlocked);
    assert.equal(await stored(), public2);
    const version4 = { ...version2, sources: [], questions: [] };
    await pool.query(`create function reject_provenance_audit() returns trigger language plpgsql as $$ begin raise exception 'audit_write_failed'; end $$;
      create constraint trigger reject_provenance_audit after insert on admin_actions deferrable initially deferred for each row execute function reject_provenance_audit()`);
    const retry = meta(5);
    await assert.rejects(repository.saveDraft(version4, oldReceipt.id, 3, retry), /audit_write_failed/);
    assert.deepEqual(await repository.getOwnerNote(oldReceipt.id), beforeBlocked); assert.equal(await stored(), public2);
    await pool.query("drop trigger reject_provenance_audit on admin_actions; drop function reject_provenance_audit()");
    await repository.saveDraft(version4, oldReceipt.id, 3, retry);
    await repository.publish(oldReceipt.id, 4, true, meta(6));
    const cleared = (await repository.findPublicGraph()).nodes[0];
    assert.deepEqual(cleared.sources, []); assert.deepEqual(cleared.questions, []);
    assert.deepEqual((await repository.getOwnerNote(oldReceipt.id))!.history.map(item => item.draft), [version4, version3, version2, draft]);
    assert.deepEqual(await repository.saveDraft(draft, undefined, 0, oldCommand), oldReceipt);
    const audit = await pool.query("select * from admin_actions where target_id=$1", [oldReceipt.id]);
    assert.equal(audit.rowCount, 7); assert.doesNotMatch(JSON.stringify(audit.rows), /PRIVATE_|someone@example|reference|다시 확인/);
    await repository.unpublish(oldReceipt.id, 4, meta(7));
    assert.deepEqual((await repository.findPublicGraph()).nodes, []);
    assert.equal((await repository.getOwnerNote(oldReceipt.id))!.history.length, 4);
  } finally {
    await pool.end(); await admin.query(`drop database ${name}`); await admin.end();
  }
});

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
