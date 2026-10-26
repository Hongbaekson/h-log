import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { assertResumeId, parseResumeCommand, parseResumeMetadata, resumePdfLimits as limits, resumePdfPolicy,
  type ResumeCommand, type ResumeDetail, type ResumeInspection, type ResumeNoteCommand, type ResumePublishCommand, type ResumeWithdrawCommand, type ResumeReceipt, type ResumeState, type ResumeVersion } from "./resume-pdf.ts";

const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const columns = 'id, sha256, byte_size as "byteSize", page_count as "pageCount", note, created_at as "createdAt"';
type VersionRow = Omit<ResumeVersion, "createdAt"> & { createdAt: Date };
const version = (row: VersionRow): ResumeVersion => ({ ...row, createdAt: row.createdAt.toISOString() });

export function createResumeRepository(pool: Pool) {
  async function mutate(command: ResumeCommand, action: ResumeReceipt["action"], targetId: string, fingerprint: string, change: (client: PoolClient) => Promise<void>, reason?: "resume_recovery_reset"): Promise<ResumeReceipt> {
    parseResumeMetadata(command);
    const client = await pool.connect();
    try {
      await client.query("begin");
      const receipt: ResumeReceipt = { commandId: command.commandId, action, targetId, revision: command.expectedRevision + 1, publicVersionId: null };
      const reasons = { upload: "resume_uploaded", save_note: "resume_note_changed", publish: "resume_reviewed_publication", unpublish: "resume_withdrawn" };
      const reserved = await client.query(`insert into admin_actions
        (id, action_type, actor_type, actor_id, target_type, target_id, reason, created_at, command_id, request_fingerprint, command_receipt)
        values ($1, $7, 'admin', 'owner', $8, $2, $3, now(), $4, $5, $6)
        on conflict (actor_type, actor_id, command_id) where command_id is not null do nothing returning id`,
      [randomUUID(), targetId, reason ?? reasons[action], command.commandId, fingerprint, JSON.stringify(receipt),
        action === "publish" || action === "unpublish" ? action : "save", action === "unpublish" ? "resume_pdf" : "resume_pdf_version"]);
      if (!reserved.rowCount) {
        const previous = await client.query<{ request_fingerprint: string; command_receipt: ResumeReceipt }>("select request_fingerprint, command_receipt from admin_actions where actor_type = 'admin' and actor_id = 'owner' and command_id = $1", [command.commandId]);
        if (previous.rows[0].request_fingerprint !== fingerprint) throw new Error("command_conflict");
        await client.query("commit");
        return previous.rows[0].command_receipt;
      }
      const state = await client.query<{ revision: number; public_version_id: string | null }>("select revision, public_version_id from resume_pdf_state where id = 1 for update");
      if (state.rows[0].revision !== command.expectedRevision) throw new Error("revision_conflict");
      await change(client);
      const updated = await client.query("update resume_pdf_state set revision = revision + 1, updated_at = now() where id = 1 returning public_version_id");
      receipt.publicVersionId = updated.rows[0].public_version_id;
      await client.query("update admin_actions set command_receipt = $1 where actor_type = 'admin' and actor_id = 'owner' and command_id = $2", [JSON.stringify(receipt), command.commandId]);
      await client.query("commit");
      return receipt;
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  }
  async function withdraw(command: ResumeCommand, recovery = false) {
    return mutate(command, "unpublish", "current", sha256(JSON.stringify(recovery ? ["resume_pdf", "recovery_reset", command] : ["resume_pdf", command])), async client => {
      await client.query(`update resume_pdf_state set public_version_id = null, public_sha256 = null, publication_epoch = null,
        reviewed_at = null, reviewed_by = null, review_checklist = null where id = 1`);
    }, recovery ? "resume_recovery_reset" : undefined);
  }
  async function readPublic(epoch: string, includeBytes: boolean) {
    assertResumeId(epoch);
    // The pointer, review and version are read in one snapshot. Metadata never selects bytea or report text.
    const result = await pool.query<{ sha256: string; byteSize: number; valid: boolean; bytes?: Buffer }>(`select
      v.sha256, v.byte_size as "byteSize", ${includeBytes ? "v.bytes," : ""}
      (s.public_sha256 = v.sha256 and v.validation_policy = $2 and v.inspection->>'policy' = $2
        and (v.inspection->>'pages')::int = v.page_count and v.inspection->'tools' = v.tool_versions
        and s.reviewed_by = 'owner' and s.reviewed_at is not null
        and s.review_checklist @> '{"allPages":true,"metadataAndLinks":true,"privacyAndOrganizations":true,"hiddenContentAndSource":true}'::jsonb) as valid
      from resume_pdf_state s left join resume_pdf_versions v on v.id = s.public_version_id
      where s.id = 1 and s.public_version_id is not null and s.publication_epoch = $1`, [epoch, resumePdfPolicy]);
    const row = result.rows[0];
    if (!row) return null;
    if (!row.valid || !/^[0-9a-f]{64}$/.test(row.sha256) || row.byteSize < 1 || row.byteSize > limits.bytes
      || (includeBytes && (!row.bytes || row.bytes.length !== row.byteSize || sha256(row.bytes) !== row.sha256))) throw new Error("storage_unavailable");
    return row;
  }
  return {
    async list(epoch?: string | null): Promise<ResumeState> {
      // One statement gives the list and its revision the same snapshot without loading file/report data.
      const rows = await pool.query(`select s.revision,
        case when $1::boolean or s.publication_epoch::text = $2 then s.public_version_id else null end as "publicVersionId",
        coalesce((select jsonb_agg(v order by v."createdAt" desc, v.id) from
          (select ${columns} from resume_pdf_versions order by created_at desc, id limit 20) v), '[]') as versions
        from resume_pdf_state s where id = 1`, [epoch === undefined, epoch ?? null]);
      return rows.rows[0];
    },
    async publicMetadata(epoch: string) {
      const row = await readPublic(epoch, false);
      return row ? { sha256: row.sha256, byteSize: row.byteSize } : null;
    },
    async publicFile(epoch: string) {
      const row = await readPublic(epoch, true);
      return row ? { sha256: row.sha256, byteSize: row.byteSize, bytes: row.bytes! } : null;
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
      if (command.action !== "save_note") throw new Error("invalid_request");
      const fingerprint = sha256(JSON.stringify(["resume_pdf_version", "save_note", command.id, command.expectedRevision, sha256(command.note)]));
      return mutate(command, "save_note", command.id, fingerprint, async client => {
        const result = await client.query("update resume_pdf_versions set note = $2 where id = $1", [command.id, command.note]);
        if (!result.rowCount) throw new Error("file_not_found");
      });
    },
    async publish(input: ResumePublishCommand, epoch: string) {
      assertResumeId(epoch);
      const command = parseResumeCommand(input);
      if (command.action !== "publish") throw new Error("invalid_request");
      const fingerprint = sha256(JSON.stringify(["resume_pdf_version", command, epoch]));
      return mutate(command, "publish", command.id, fingerprint, async client => {
        const file = await client.query("select sha256, validation_policy from resume_pdf_versions where id = $1", [command.id]);
        if (!file.rowCount) throw new Error("file_not_found");
        if (file.rows[0].sha256 !== command.sha256 || file.rows[0].validation_policy !== resumePdfPolicy) throw new Error("review_conflict");
        await client.query(`update resume_pdf_state set public_version_id = $1, public_sha256 = $2, publication_epoch = $3,
          reviewed_at = now(), reviewed_by = 'owner', review_checklist = $4 where id = 1`, [command.id, command.sha256, epoch, JSON.stringify(command.checklist)]);
      });
    },
    async unpublish(input: ResumeWithdrawCommand) {
      const command = parseResumeCommand(input);
      if (command.action !== "unpublish") throw new Error("invalid_request");
      return withdraw(command);
    },
    async resetAfterRecovery(input: ResumeCommand) {
      return withdraw(parseResumeMetadata(input), true);
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
