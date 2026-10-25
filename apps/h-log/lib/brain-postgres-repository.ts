import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { BrainGraph } from "./brain.ts";
import { mergePublishedBrain } from "./brain-curation.ts";
import { parseBrainCommand, parseBrainDraft, toPublicBrainNode, type BrainAction, type BrainCommand, type BrainCommandReceipt, type BrainDraft, type BrainNoteSummary, type BrainOwnerNote, type BrainSnapshot } from "./brain-capture.ts";
import type { BlogPrivacyScanPolicy } from "./blog-privacy-scanner.ts";

type LockedNote = { id: string; current_revision: number; command_revision: number; created_at: Date };
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
  return value;
}
export function assertBrainNoteId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^note-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id)) throw new Error("invalid_note_id");
}

export function createBrainRepository(pool: Pool, policy: BlogPrivacyScanPolicy = {}, catalog: BrainGraph = { nodes: [], edges: [] }) {
  async function withNote(action: BrainAction["action"], id: string | undefined, revision: number, input: BrainCommand, draft: BrainDraft | null, change: (client: PoolClient, note: LockedNote) => Promise<void>): Promise<BrainCommandReceipt> {
    if (id !== undefined) assertBrainNoteId(id);
    if (!Number.isSafeInteger(revision) || (id ? revision < 1 : revision !== 0)) throw new Error("invalid_revision");
    const command = parseBrainCommand(input);
    const fingerprint = createHash("sha256").update(JSON.stringify(canonical({ action, id: id ?? null, revision, commandRevision: command.commandRevision, draft }))).digest("hex");
    const receipt = { id: id ?? `note-${randomUUID()}`, revision: revision + (action === "save" ? 1 : 0), commandRevision: command.commandRevision + 1 };
    const client = await pool.connect();
    try {
      await client.query("begin");
      // The unique key waits for a concurrent retry. The reservation and mutation commit together.
      const reserved = await client.query(`insert into admin_actions
        (id, action_type, actor_type, actor_id, target_type, target_id, reason, created_at, command_id, request_fingerprint, command_receipt)
        values ($1, $2, 'admin', 'owner', 'brain_note', $3, $4, now(), $5, $6, $7)
        on conflict (actor_type, actor_id, command_id) where command_id is not null do nothing returning id`,
      [randomUUID(), action, receipt.id, { save: "private_note_saved", publish: "reviewed_public_copy", unpublish: "public_copy_removed" }[action], command.commandId, fingerprint, JSON.stringify(receipt)]);
      if (!reserved.rowCount) {
        const previous = await client.query<{ request_fingerprint: string; command_receipt: BrainCommandReceipt }>("select request_fingerprint, command_receipt from admin_actions where actor_type = 'admin' and actor_id = 'owner' and command_id = $1", [command.commandId]);
        if (previous.rows[0].request_fingerprint !== fingerprint) throw new Error("command_conflict");
        await client.query("commit");
        return previous.rows[0].command_receipt;
      }
      const result = id
        ? await client.query<LockedNote>("select id, current_revision, command_revision, created_at from brain_notes where id = $1 for update", [id])
        : await client.query<LockedNote>("insert into brain_notes (id) values ($1) returning id, current_revision, command_revision, created_at", [receipt.id]);
      const note = result.rows[0];
      if (!note) throw new Error("note_not_found");
      if (note.current_revision !== revision) throw new Error("revision_conflict");
      if (note.command_revision !== command.commandRevision) throw new Error("command_revision_conflict");
      await change(client, note);
      await client.query("update brain_notes set command_revision = command_revision + 1 where id = $1", [note.id]);
      await client.query("commit");
      return receipt;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally { client.release(); }
  }
  return {
    async saveDraft(input: unknown, id: string | undefined, revision: number, command: BrainCommand) {
      const draft = parseBrainDraft(input);
      return withNote("save", id, revision, command, draft, async (client, note) => {
        const targets = (draft.links ?? []).map(link => link.target);
        if (targets.length) {
          const records = await client.query<{ id: string }>("select id from brain_notes where id = any($1::text[])", [targets]);
          const known = new Set([...catalog.nodes.map(node => node.id), ...records.rows.map(row => row.id)]);
          if (targets.some(target => target === note.id || !known.has(target))) throw new Error("invalid_link");
        }
        const next = note.current_revision + 1;
        await client.query("insert into brain_note_versions (note_id, revision, draft) values ($1, $2, $3)", [note.id, next, JSON.stringify(draft)]);
        await client.query("update brain_notes set current_revision = $2, updated_at = now() where id = $1", [note.id, next]);
      });
    },
    async publish(id: string, revision: number, confirmed: boolean, command: BrainCommand) {
      if (confirmed !== true) throw new Error("publication_confirmation_required");
      return withNote("publish", id, revision, command, null, async (client, note) => {
        const version = await client.query<{ draft: BrainDraft }>("select draft from brain_note_versions where note_id = $1 and revision = $2", [id, revision]);
        const recordedAt = note.created_at.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
        const publicNode = toPublicBrainNode(version.rows[0].draft, id, recordedAt, policy);
        await client.query("update brain_notes set public_node = $2, published_revision = $3, updated_at = now() where id = $1", [id, JSON.stringify(publicNode), revision]);
      });
    },
    async unpublish(id: string, revision: number, command: BrainCommand) {
      return withNote("unpublish", id, revision, command, null, async (client) => {
        await client.query("update brain_notes set public_node = null, published_revision = null, updated_at = now() where id = $1", [id]);
      });
    },
    async getOwnerNote(id: string): Promise<BrainOwnerNote | null> {
      assertBrainNoteId(id);
      const result = await pool.query<{
        current_revision: number; command_revision: number; published_revision: number | null; revision: number; draft: BrainDraft; created_at: Date;
      }>(`select n.current_revision, n.command_revision, n.published_revision, v.revision, v.draft, v.created_at
          from brain_notes n join brain_note_versions v on v.note_id = n.id
          where n.id = $1 order by v.revision desc`, [id]);
      const current = result.rows[0];
      if (!current) return null;
      const actions = await pool.query(`select action_type as action, command_receipt->'revision' as revision,
        command_receipt->'commandRevision' as "commandRevision", created_at as "createdAt"
        from admin_actions where target_type = 'brain_note' and target_id = $1
        and (command_receipt->>'commandRevision')::integer <= $2
        order by (command_receipt->>'commandRevision')::integer desc limit 20`, [id, current.command_revision]);
      return {
        id, revision: current.current_revision, commandRevision: current.command_revision, publishedRevision: current.published_revision,
        title: current.draft.title, draft: current.draft,
        createdAt: result.rows.at(-1)!.created_at.toISOString(), occurredOn: current.draft.occurredOn,
        tags: current.draft.tags, topic: current.draft.topic, links: current.draft.links,
        history: result.rows.map(row => ({ revision: row.revision, draft: row.draft, createdAt: row.created_at.toISOString() })),
        actions: actions.rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
      };
    },
    async listOwnerNotes(): Promise<BrainNoteSummary[]> {
      const result = await pool.query(`select n.id, n.current_revision as revision, n.command_revision as "commandRevision", n.published_revision as "publishedRevision", v.draft->>'title' as title,
        n.created_at as "createdAt", v.draft->>'occurredOn' as "occurredOn", v.draft->'tags' as tags, v.draft->>'topic' as topic, v.draft->'links' as links
        from brain_notes n join brain_note_versions v on v.note_id = n.id and v.revision = n.current_revision
        order by n.updated_at desc, n.id`);
      return result.rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }));
    },
    async findPublicGraph(): Promise<BrainGraph> {
      const result = await pool.query<{ public_node: BrainSnapshot }>("select public_node from brain_notes where published_revision is not null order by created_at, id");
      return mergePublishedBrain(catalog, result.rows.map(row => row.public_node), policy);
    },
  };
}
