import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { assertResumeId, parseResumeCommand, parseResumeMetadata, resumePdfLimits as limits, resumePdfPolicy,
  type ResumeCommand, type ResumeDetail, type ResumeInspection, type ResumeNoteCommand, type ResumeReceipt, type ResumeState, type ResumeVersion } from "./resume-pdf.ts";

const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const columns = 'id, sha256, byte_size as "byteSize", page_count as "pageCount", note, created_at as "createdAt"';
type VersionRow = Omit<ResumeVersion, "createdAt"> & { createdAt: Date };
const version = (row: VersionRow): ResumeVersion => ({ ...row, createdAt: row.createdAt.toISOString() });

export function createResumeRepository(pool: Pool) {
  async function mutate(command: ResumeCommand, action: ResumeReceipt["action"], targetId: string, fingerprint: string, change: (client: PoolClient) => Promise<void>): Promise<ResumeReceipt> {
    parseResumeMetadata(command);
    const client = await pool.connect();
    try {
      await client.query("begin");
      const receipt: ResumeReceipt = { commandId: command.commandId, action, targetId, revision: command.expectedRevision + 1, publicVersionId: null };
      const reserved = await client.query(`insert into admin_actions
        (id, action_type, actor_type, actor_id, target_type, target_id, reason, created_at, command_id, request_fingerprint, command_receipt)
        values ($1, 'save', 'admin', 'owner', 'resume_pdf_version', $2, $3, now(), $4, $5, $6)
        on conflict (actor_type, actor_id, command_id) where command_id is not null do nothing returning id`,
      [randomUUID(), targetId, action === "upload" ? "resume_uploaded" : "resume_note_changed", command.commandId, fingerprint, JSON.stringify(receipt)]);
      if (!reserved.rowCount) {
        const previous = await client.query<{ request_fingerprint: string; command_receipt: ResumeReceipt }>("select request_fingerprint, command_receipt from admin_actions where actor_type = 'admin' and actor_id = 'owner' and command_id = $1", [command.commandId]);
        if (previous.rows[0].request_fingerprint !== fingerprint) throw new Error("command_conflict");
        await client.query("commit");
        return previous.rows[0].command_receipt;
      }
      const state = await client.query<{ revision: number; public_version_id: string | null }>("select revision, public_version_id from resume_pdf_state where id = 1 for update");
      if (state.rows[0].revision !== command.expectedRevision) throw new Error("revision_conflict");
      receipt.publicVersionId = state.rows[0].public_version_id;
      await change(client);
      await client.query("update resume_pdf_state set revision = revision + 1, updated_at = now() where id = 1");
      await client.query("update admin_actions set command_receipt = $1 where actor_type = 'admin' and actor_id = 'owner' and command_id = $2", [JSON.stringify(receipt), command.commandId]);
      await client.query("commit");
      return receipt;
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  }
  return {
    async list(): Promise<ResumeState> {
      // One statement gives the list and its revision the same snapshot without loading file/report data.
      const rows = await pool.query(`select s.revision, s.public_version_id as "publicVersionId",
        coalesce((select jsonb_agg(v order by v."createdAt" desc, v.id) from
          (select ${columns} from resume_pdf_versions order by created_at desc, id limit 20) v), '[]') as versions
        from resume_pdf_state s where id = 1`);
      return rows.rows[0];
    },
    async detail(id: string): Promise<ResumeDetail | null> {
      assertResumeId(id);
      const result = await pool.query<VersionRow & { inspection: ResumeInspection }>(`select ${columns}, inspection from resume_pdf_versions where id = $1`, [id]);
      const row = result.rows[0];
      return row ? { ...version(row), inspection: row.inspection } : null;
    },
    async file(id: string) {
      assertResumeId(id);
      const result = await pool.query<{ bytes: Buffer; sha256: string; byte_size: number; inspection: ResumeInspection }>("select bytes, sha256, byte_size, inspection from resume_pdf_versions where id = $1", [id]);
      const row = result.rows[0];
      if (row && (sha256(row.bytes) !== row.sha256 || row.bytes.length !== row.byte_size || row.inspection.policy !== resumePdfPolicy)) throw new Error("storage_unavailable");
      return row ?? null;
    },
    async saveUpload(bytes: Buffer, inspection: ResumeInspection, input: ResumeCommand) {
      const command = parseResumeMetadata(input);
      if (bytes.length < 1 || bytes.length > limits.bytes || inspection.policy !== resumePdfPolicy || !Number.isInteger(inspection.pages)
        || inspection.pages < 1 || inspection.pages > limits.pages || Buffer.byteLength(JSON.stringify(inspection)) > limits.report) throw new Error("invalid_request");
      const hash = sha256(bytes);
      const fingerprint = sha256(JSON.stringify(["resume_pdf_version", "upload", command.expectedRevision, hash, bytes.length]));
      const id = randomUUID();
      return mutate(command, "upload", id, fingerprint, async client => {
        const duplicate = await client.query<{ id: string }>("select id from resume_pdf_versions where sha256 = $1", [hash]);
        if (duplicate.rowCount) throw Object.assign(new Error("duplicate_file"), { existingId: duplicate.rows[0].id });
        const count = await client.query<{ count: string }>("select count(*) from resume_pdf_versions");
        if (Number(count.rows[0].count) >= limits.versions) throw new Error("storage_full");
        await client.query(`insert into resume_pdf_versions (id, bytes, sha256, byte_size, page_count, inspection, validation_policy, tool_versions)
          values ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, bytes, hash, bytes.length, inspection.pages, JSON.stringify(inspection), inspection.policy, JSON.stringify(inspection.tools)]);
      });
    },
    async saveNote(input: ResumeNoteCommand) {
      const command = parseResumeCommand(input);
      const fingerprint = sha256(JSON.stringify(["resume_pdf_version", "save_note", command.id, command.expectedRevision, sha256(command.note)]));
      return mutate(command, "save_note", command.id, fingerprint, async client => {
        const result = await client.query("update resume_pdf_versions set note = $2 where id = $1", [command.id, command.note]);
        if (!result.rowCount) throw new Error("file_not_found");
      });
    },
    async withProcessingLock<T>(action: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
      // ponytail: one PDF job for this single-owner site; split locks only if the storage budget grows.
      const client = await pool.connect();
      const lost = new AbortController();
      const onError = () => lost.abort();
      client.on("error", onError);
      let locked = false, releaseError = false;
      try {
        locked = (await client.query<{ locked: boolean }>("select pg_try_advisory_lock(710493708) as locked")).rows[0].locked;
        if (!locked) throw new Error("pdf_busy");
        return await action(AbortSignal.any([lost.signal, ...(signal ? [signal] : [])]));
      } finally {
        if (locked) await client.query("select pg_advisory_unlock(710493708)").catch(() => { releaseError = true; });
        client.off("error", onError); client.release(releaseError || lost.signal.aborted);
      }
    },
  };
}
