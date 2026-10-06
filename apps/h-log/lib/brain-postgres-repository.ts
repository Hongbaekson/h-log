import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { selectPublicBrain, type BrainNode } from "./brain.ts";
import { assertSafeBrainPublication, parseBrainDraft, toPublicBrainNode, type BrainDraft, type BrainNoteSummary, type BrainOwnerNote } from "./brain-capture.ts";
import type { BlogPrivacyScanPolicy } from "./blog-privacy-scanner.ts";

type LockedNote = { id: string; current_revision: number; created_at: Date };
export function assertBrainNoteId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^note-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id)) throw new Error("invalid_note_id");
}

export function createBrainRepository(pool: Pool, policy: BlogPrivacyScanPolicy = {}) {
  async function withNote<T>(id: string | undefined, revision: number, change: (client: PoolClient, note: LockedNote) => Promise<T>): Promise<T> {
    if (id !== undefined) assertBrainNoteId(id);
    if (!Number.isSafeInteger(revision) || (id ? revision < 1 : revision !== 0)) throw new Error("invalid_revision");
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = id
        ? await client.query<LockedNote>("select id, current_revision, created_at from brain_notes where id = $1 for update", [id])
        : await client.query<LockedNote>("insert into brain_notes (id) values ($1) returning id, current_revision, created_at", [`note-${randomUUID()}`]);
      const note = result.rows[0];
      if (!note) throw new Error("note_not_found");
      if (note.current_revision !== revision) throw new Error("revision_conflict");
      const value = await change(client, note);
      await client.query("commit");
      return value;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally { client.release(); }
  }
  return {
    async saveDraft(input: unknown, id?: string, revision = 0) {
      const draft = parseBrainDraft(input);
      return withNote(id, revision, async (client, note) => {
        const next = note.current_revision + 1;
        await client.query("insert into brain_note_versions (note_id, revision, draft) values ($1, $2, $3)", [note.id, next, JSON.stringify(draft)]);
        await client.query("update brain_notes set current_revision = $2, updated_at = now() where id = $1", [note.id, next]);
        return { id: note.id, revision: next };
      });
    },
    async publish(id: string, revision: number, confirmed: boolean) {
      if (confirmed !== true) throw new Error("publication_confirmation_required");
      return withNote(id, revision, async (client, note) => {
        const version = await client.query<{ draft: BrainDraft }>("select draft from brain_note_versions where note_id = $1 and revision = $2", [id, revision]);
        const recordedAt = note.created_at.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
        const publicNode = toPublicBrainNode(version.rows[0].draft, id, recordedAt, policy);
        await client.query("update brain_notes set public_node = $2, published_revision = $3, updated_at = now() where id = $1", [id, JSON.stringify(publicNode), revision]);
      });
    },
    async unpublish(id: string, revision: number) {
      return withNote(id, revision, async (client) => {
        await client.query("update brain_notes set public_node = null, published_revision = null, updated_at = now() where id = $1", [id]);
      });
    },
    async getOwnerNote(id: string): Promise<BrainOwnerNote | null> {
      assertBrainNoteId(id);
      const result = await pool.query<{
        current_revision: number; published_revision: number | null; revision: number; draft: BrainDraft; created_at: Date;
      }>(`select n.current_revision, n.published_revision, v.revision, v.draft, v.created_at
          from brain_notes n join brain_note_versions v on v.note_id = n.id
          where n.id = $1 order by v.revision desc`, [id]);
      const current = result.rows[0];
      if (!current) return null;
      return {
        id, revision: current.current_revision, publishedRevision: current.published_revision,
        title: current.draft.title, draft: current.draft,
        history: result.rows.map(row => ({ revision: row.revision, draft: row.draft, createdAt: row.created_at.toISOString() })),
      };
    },
    async listOwnerNotes(): Promise<BrainNoteSummary[]> {
      const result = await pool.query(`select n.id, n.current_revision as revision, n.published_revision as "publishedRevision", v.draft->>'title' as title
        from brain_notes n join brain_note_versions v on v.note_id = n.id and v.revision = n.current_revision
        order by n.updated_at desc, n.id`);
      return result.rows;
    },
    async findPublicNodes(): Promise<BrainNode[]> {
      const result = await pool.query<{ public_node: BrainNode }>("select public_node from brain_notes where published_revision is not null order by created_at, id");
      const graph = selectPublicBrain({ nodes: result.rows.map(row => ({ ...row.public_node, visibility: "public" })), edges: [] });
      return graph.nodes.filter(node => {
        try { assertSafeBrainPublication(node, policy); return true; }
        catch (error) { if (error instanceof Error && error.message === "public_copy_blocked") return false; throw error; }
      });
    },
  };
}
