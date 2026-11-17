import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { blogListArtifact, canonicalJson, fingerprint, projectionContext, PUBLIC_READ_LIMITS, type Projection, type ProjectionContext } from "./public-read-model.ts";
import { readProjectionSource, sourcePage, sourceSize, type SourceKey } from "./public-read-source.ts";

const LOCK = 710493708;
const migration = "016_public_blog_lists";
type Generation = QueryResultRow & { id: string; source_epoch: string; status: string; run_token: string; scan_cursor: string[]; scan_complete: boolean; kind_scope: string; catchup_revision: string };
export type RebuildOptions = {
  command: "rebuild" | "resume" | "verify" | "activate" | "repair" | "reset-derived";
  confirmOwnedLocal?: boolean; kind?: "blog" | "brain" | "all"; generation?: string; id?: string;
  batchSize?: number; concurrency?: number; maxSeconds?: number; signal?: AbortSignal;
  onProgress?: (progress: RebuildReceipt) => void | Promise<void>;
};
export type RebuildReceipt = {
  generation: string | null; status: string; processed: number; counts: { ready: number; excluded: number };
  cursorHash: string; manifestHash: string; elapsedMs: number; peakRssBytes: number; maxBatchBytes: number;
};
export function validateRebuildOptions(options: RebuildOptions) {
  if (!options.confirmOwnedLocal) throw new Error("owned_local_required");
  if (!["rebuild", "resume", "verify", "activate", "repair", "reset-derived"].includes(options.command)
    || !Number.isInteger(options.batchSize ?? 25) || (options.batchSize ?? 25) < 1 || (options.batchSize ?? 25) > 100
    || ![1, 2].includes(options.concurrency ?? 1)
    || !Number.isInteger(options.maxSeconds ?? 60) || (options.maxSeconds ?? 60) < 1 || (options.maxSeconds ?? 60) > 3600
    || (options.command === "rebuild" && !["blog", "brain", "all"].includes(options.kind ?? ""))
    || (["resume", "verify", "activate"].includes(options.command) && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(options.generation ?? ""))
    || (options.command === "repair" && (!["blog", "brain"].includes(options.kind ?? "") || !options.id || options.id.length > 1024))) throw new Error("invalid_options");
}
async function begin(client: PoolClient, readOnly = false) {
  await client.query(`begin isolation level repeatable read${readOnly ? " read only" : ""}`);
  await client.query("set local statement_timeout='5s'");
  await client.query("set local lock_timeout='250ms'");
}
async function schemaPresent(client: PoolClient) {
  const registry = (await client.query("select to_regclass('public.schema_migrations') registry")).rows[0].registry;
  if (!registry || !(await client.query("select 1 from schema_migrations where version=$1", [migration])).rowCount) throw new Error("schema_not_applied");
  const tables = (await client.query(`select to_regclass('public.public_read_state') s, to_regclass('public.public_read_sources') c,
    to_regclass('public.public_read_generations') g, to_regclass('public.public_read_entries') e`)).rows[0];
  if (Object.values(tables).some(value => !value)) throw new Error("derived_schema_missing");
}
async function state(client: PoolClient) {
  const row = (await client.query("select * from public_read_state where id=1")).rows[0];
  if (!row) throw new Error("derived_state_missing");
  if (row.writer_protocol !== 1) throw new Error("unsupported_writer_protocol");
  return row;
}
async function generation(client: PoolClient, id: string, context: ProjectionContext): Promise<Generation> {
  const row = (await client.query<Generation>("select * from public_read_generations where id=$1", [id])).rows[0];
  if (!row) throw new Error("generation_missing");
  if (row.source_epoch !== (await state(client)).source_epoch || canonicalJson(row.version_manifest) !== canonicalJson(context.manifest) || row.policy_fingerprint !== context.policyFingerprint) throw new Error("context_mismatch");
  return row;
}
async function assertToken(client: PoolClient, gen: Generation) {
  if (!(await client.query("select 1 from public_read_generations where id=$1 and run_token=$2 and source_epoch=(select source_epoch from public_read_state where id=1) for update", [gen.id, gen.run_token])).rowCount) throw new Error("stale_run");
}
async function saveEntry(client: PoolClient, gen: Generation, key: SourceKey, projection: Projection) {
  await assertToken(client, gen);
  await client.query(`insert into public_read_entries(generation_id,kind,source_id,source_version,metadata_revision,input_fingerprint,content_hash,result,payload,payload_hash,list_payload,list_hash)
    values($1,$2,$3,$4,(select metadata_revision from public_read_sources where kind=$2 and source_id=$3),$5,$6,$7,$8,$9,$10,
      case when $2='blog' then public_read_list_hash($7,$10::jsonb) end)
    on conflict(generation_id,kind,source_id) do update set source_version=excluded.source_version,metadata_revision=excluded.metadata_revision,
    input_fingerprint=excluded.input_fingerprint,content_hash=excluded.content_hash,result=excluded.result,payload=excluded.payload,payload_hash=excluded.payload_hash,
    list_payload=excluded.list_payload,list_hash=excluded.list_hash`,
  [gen.id, key.kind, key.source_id, projection.sourceVersion, projection.inputFingerprint, projection.contentHash, projection.result,
    projection.payload === null ? null : canonicalJson(projection.payload), projection.payloadHash,
    blogListArtifact(projection) ? canonicalJson(blogListArtifact(projection)) : null]);
}
async function countEntries(client: PoolClient, id: string) {
  const row = (await client.query("select count(*) filter(where result='ready')::int ready,count(*) filter(where result='excluded')::int excluded from public_read_entries where generation_id=$1", [id])).rows[0];
  return { ready: row.ready as number, excluded: row.excluded as number };
}

// Local-only lifecycle commands; live writers maintain the same transactional protocol.
export async function runLocalProjection(pool: Pool, options: RebuildOptions, context = projectionContext()): Promise<RebuildReceipt> {
  validateRebuildOptions(options);
  const start = performance.now(), deadline = start + (options.maxSeconds ?? 60) * 1000;
  const client = await pool.connect();
  let locked = false, gen: Generation | undefined, maxBatchBytes = 0, peakRssBytes = process.memoryUsage().rss;
  const expired = () => options.signal?.aborted || performance.now() >= deadline;
  const sample = () => { peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss); };
  async function receipt(status: string): Promise<RebuildReceipt> {
    const counts = gen ? await countEntries(client, gen.id) : { ready: 0, excluded: 0 };
    sample();
    return { generation: gen?.id ?? null, status, processed: counts.ready + counts.excluded, counts,
      cursorHash: fingerprint(gen?.scan_cursor ?? []), manifestHash: context.manifestHash, elapsedMs: Math.round(performance.now() - start), peakRssBytes, maxBatchBytes };
  }
  async function catchUp() {
    while (!expired()) {
      await begin(client);
      const current = await state(client);
      if (current.source_epoch !== gen!.source_epoch) throw new Error("context_mismatch");
      const keys = (await client.query<SourceKey & { metadata_revision: string; deleted: boolean }>(`select * from public_read_sources
        where metadata_revision>$1 and metadata_revision<=$2 order by metadata_revision,kind,source_id limit $3`,
      [gen!.catchup_revision, current.source_revision, options.batchSize ?? 25])).rows;
      let bytes = 0;
      await assertToken(client, gen!);
      for (const key of keys) {
        if (expired()) throw new Error("deadline");
        if (key.deleted) await client.query("delete from public_read_entries where generation_id=$1 and kind=$2 and source_id=$3", [gen!.id, key.kind, key.source_id]);
        else {
          const size = await sourceSize(client, key);
          if (size > PUBLIC_READ_LIMITS.input) throw new Error("input_limit");
          if (bytes + size > PUBLIC_READ_LIMITS.batchBytes) break;
          bytes += size;
          await saveEntry(client, gen!, key, await readProjectionSource(client, key, context, size));
        }
        gen!.catchup_revision = key.metadata_revision;
        sample();
      }
      if (!keys.length) gen!.catchup_revision = current.source_revision;
      await client.query("update public_read_generations set catchup_revision=$2,updated_at=now() where id=$1 and run_token=$3", [gen!.id, gen!.catchup_revision, gen!.run_token]);
      await client.query("commit");
      maxBatchBytes = Math.max(maxBatchBytes, bytes);
      await options.onProgress?.(await receipt("catching_up"));
      if (gen!.catchup_revision === current.source_revision) return;
    }
    throw new Error("deadline");
  }
  async function validateAndActivate(activate: boolean): Promise<RebuildReceipt> {
    if (!gen!.scan_complete) throw new Error("incomplete");
    while (!expired()) {
      if (activate) await catchUp();
      await begin(client, true);
      const current = await state(client);
      if (current.source_epoch !== gen!.source_epoch) throw new Error("context_mismatch");
      // A writer committed between catch-up and this validation snapshot. Catch up again.
      if (activate && current.source_revision !== gen!.catchup_revision) { await client.query("rollback"); continue; }
      let cursor = ["", ""], seen = 0;
      const digest = createHash("sha256");
      while (true) {
        const keys = await sourcePage(client, cursor, options.batchSize ?? 25);
        if (!keys.length) break;
        for (const key of keys) {
          if (expired()) throw new Error("deadline");
          const size = await sourceSize(client, key);
          const expected = await readProjectionSource(client, key, context, size);
          const entry = (await client.query(`select e.*,s.metadata_revision current_revision,
            e.list_hash=public_read_list_hash(e.result,e.list_payload) list_hash_valid from public_read_entries e
            left join public_read_sources s using(kind,source_id) where e.generation_id=$1 and e.kind=$2 and e.source_id=$3`, [gen!.id, key.kind, key.source_id])).rows[0];
          if (!entry || entry.metadata_revision !== entry.current_revision || entry.input_fingerprint !== expected.inputFingerprint
            || entry.source_version !== expected.sourceVersion || entry.content_hash !== expected.contentHash || entry.result !== expected.result
            || entry.payload_hash !== expected.payloadHash || fingerprint(entry.payload) !== expected.payloadHash
            || (key.kind === "blog" && (!entry.list_hash_valid || canonicalJson(entry.list_payload) !== canonicalJson(blogListArtifact(expected))))) throw new Error("verification_failed");
          digest.update(fingerprint([key, expected.inputFingerprint, expected.payloadHash, expected.result]));
          cursor = [key.kind, key.source_id]; seen++; sample();
        }
      }
      const counts = await countEntries(client, gen!.id);
      if (counts.ready + counts.excluded !== seen) throw new Error("verification_failed");
      await client.query("commit");
      await options.onProgress?.(await receipt("validating"));
      // Expensive parsing/comparison has finished. Only the final revision CAS holds state.
      await client.query("begin");
      await client.query("select public_read_lock()");
      const latest = await state(client);
      if (latest.source_epoch !== current.source_epoch) throw new Error("context_mismatch");
      if (latest.source_revision !== current.source_revision) {
        await client.query("rollback");
        if (activate) continue;
        throw new Error("stale_source");
      }
      await assertToken(client, gen!);
      if (activate && !["building", "paused", "validating"].includes(gen!.status)) throw new Error("invalid_generation_state");
      const status = activate ? "active" : gen!.status === "active" ? "active" : "validating";
      if (activate) {
        await client.query("update public_read_generations set status='retired',updated_at=now() where id=$1", [current.active_generation]);
        await client.query("update public_read_state set active_generation=$1 where id=1 and source_epoch=$2 and source_revision=$3", [gen!.id, gen!.source_epoch, current.source_revision]);
      }
      await client.query("update public_read_generations set status=$2,checked_revision=$3,catchup_revision=$3,counts=$4,manifest_hash=$5,last_error=null,updated_at=now() where id=$1 and run_token=$6",
        [gen!.id, status, current.source_revision, counts, digest.digest("hex"), gen!.run_token]);
      await client.query("commit");
      gen!.status = status;
      return receipt(status);
    }
    throw new Error("deadline");
  }
  try {
    await client.query("set statement_timeout='5s'");
    await client.query("set lock_timeout='250ms'");
    const owned = (await client.query("select current_database() name,shobj_description(oid,'pg_database') label from pg_database where datname=current_database()")).rows[0];
    if (!/^hlog_projection_[a-z0-9_]+$/.test(owned.name) || owned.label !== "hlog-public-read-local-v1") throw new Error("owned_local_required");
    locked = (await client.query("select pg_try_advisory_lock($1) locked", [LOCK])).rows[0].locked;
    if (!locked) throw new Error("busy");
    if (options.command === "reset-derived") {
      const registry = (await client.query("select to_regclass('public.schema_migrations') r")).rows[0].r;
      if (!registry || !(await client.query("select 1 from schema_migrations where version=$1", [migration])).rowCount) throw new Error("schema_not_applied");
      if ((await client.query("select to_regclass('public.public_read_state') s")).rows[0].s) {
        const row = (await client.query("select writer_protocol from public_read_state where id=1")).rows[0];
        if (row && row.writer_protocol !== 1) throw new Error("unsupported_writer_protocol");
      }
      await begin(client);
      await client.query("drop table if exists public_read_entries,public_read_state,public_read_sources,public_read_generations");
      await client.query(await readFile(new URL("../migrations/014_public_read_models.sql", import.meta.url), "utf8"));
      await client.query(await readFile(new URL("../migrations/015_public_read_freshness.sql", import.meta.url), "utf8"));
      await client.query("drop function if exists public_read_list_hash(text,jsonb),public_read_valid_blog_list(jsonb)");
      await client.query(await readFile(new URL("../migrations/016_public_blog_lists.sql", import.meta.url), "utf8"));
      await client.query("commit");
      return receipt("reset");
    }
    await schemaPresent(client);
    const initial = await state(client);
    if (options.command === "rebuild") {
      let base: Generation | undefined;
      if (options.kind !== "all") {
        if (!initial.active_generation) throw new Error("full_rebuild_required");
        base = await generation(client, initial.active_generation, context);
      }
      const id = randomUUID(), token = randomUUID();
      await begin(client);
      await client.query(`insert into public_read_generations(id,source_epoch,status,version_manifest,policy_fingerprint,base_revision,catchup_revision,run_token,kind_scope)
        values($1,$2,'building',$3,$4,$5,$5,$6,$7)`, [id, initial.source_epoch, context.manifest, context.policyFingerprint, initial.source_revision, token, options.kind]);
      if (base) await client.query(`insert into public_read_entries select $1,kind,source_id,source_version,e.metadata_revision,input_fingerprint,content_hash,result,payload,payload_hash,list_payload,list_hash
        from public_read_entries e join public_read_sources s using(kind,source_id)
        where generation_id=$2 and kind<>$3 and e.metadata_revision=s.metadata_revision and not s.deleted`, [id, base.id, options.kind]);
      await client.query("commit");
      gen = await generation(client, id, context);
    } else {
      const id = options.command === "repair" ? initial.active_generation : options.generation;
      if (!id) throw new Error("generation_missing");
      gen = await generation(client, id, context);
      if (options.command === "verify" || options.command === "activate") return await validateAndActivate(options.command === "activate");
      if (options.command === "repair") {
        await begin(client, true);
        const key = { kind: options.kind as SourceKey["kind"], source_id: options.id! };
        const marker = (await client.query("select metadata_revision,deleted from public_read_sources where kind=$1 and source_id=$2", [key.kind, key.source_id])).rows[0];
        if (!marker) throw new Error("source_missing");
        const projection = marker.deleted ? null : await readProjectionSource(client, key, context, await sourceSize(client, key));
        await client.query("commit");
        await options.onProgress?.(await receipt("repairing"));
        await client.query("begin");
        await client.query("select public_read_lock()");
        if ((await state(client)).source_epoch !== gen.source_epoch || !(await client.query("select 1 from public_read_sources where kind=$1 and source_id=$2 and metadata_revision=$3 and deleted=$4", [key.kind, key.source_id, marker.metadata_revision, marker.deleted])).rowCount) throw new Error("stale_source");
        await assertToken(client, gen);
        if (projection) await saveEntry(client, gen, key, projection);
        else await client.query("delete from public_read_entries where generation_id=$1 and kind=$2 and source_id=$3", [gen.id, key.kind, key.source_id]);
        await client.query("commit");
        return await validateAndActivate(false);
      }
      if (!["paused", "building", "validating"].includes(gen.status)) throw new Error("invalid_generation_state");
      gen.run_token = randomUUID();
      await client.query("update public_read_generations set run_token=$2,status='building',updated_at=now() where id=$1", [gen.id, gen.run_token]);
    }
    while (!gen.scan_complete && !expired()) {
      await begin(client);
      const keys = await sourcePage(client, gen.scan_cursor, options.batchSize ?? 25);
      let bytes = 0, processed = 0;
      for (const key of keys) {
        if (expired()) break;
        const size = await sourceSize(client, key);
        if (size > PUBLIC_READ_LIMITS.input) throw new Error("input_limit");
        if (bytes + size > PUBLIC_READ_LIMITS.batchBytes) break;
        bytes += size;
        const copied = gen.kind_scope !== "all" && gen.kind_scope !== key.kind && (await client.query(`select 1 from public_read_entries e join public_read_sources s using(kind,source_id)
          where generation_id=$1 and kind=$2 and source_id=$3 and e.metadata_revision=s.metadata_revision and not s.deleted`, [gen.id, key.kind, key.source_id])).rowCount;
        if (!copied) await saveEntry(client, gen, key, await readProjectionSource(client, key, context, size));
        gen.scan_cursor = [key.kind, key.source_id]; processed++; sample();
      }
      gen.scan_complete = keys.length === 0;
      await assertToken(client, gen);
      await client.query("update public_read_generations set scan_cursor=$2,scan_complete=$3,counts=$4,updated_at=now() where id=$1 and run_token=$5", [gen.id, JSON.stringify(gen.scan_cursor), gen.scan_complete, await countEntries(client, gen.id), gen.run_token]);
      await client.query("commit");
      maxBatchBytes = Math.max(maxBatchBytes, bytes);
      await options.onProgress?.(await receipt("building"));
      if (!processed && keys.length) break;
    }
    if (expired()) {
      await client.query("update public_read_generations set status='paused',updated_at=now() where id=$1 and run_token=$2", [gen.id, gen.run_token]);
      return receipt("paused");
    }
    return await validateAndActivate(true);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (gen) {
      const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "rebuild_failed";
      await begin(client).catch(() => undefined);
      try {
        await assertToken(client, gen);
        // A failed comparison can include deletes or inserts before the cursor: rescan the candidate.
        if (code === "verification_failed" && gen.status !== "active") {
          await client.query("delete from public_read_entries where generation_id=$1", [gen.id]);
          await client.query("update public_read_generations set scan_cursor='[\"\",\"\"]',scan_complete=false,kind_scope='all' where id=$1", [gen.id]);
        }
        await client.query("update public_read_generations set last_error=$2,status=case when status in ('active','retired') then status else 'paused' end,updated_at=now() where id=$1", [gen.id, code]);
        await client.query("commit");
      } catch { await client.query("rollback").catch(() => undefined); }
    }
    if (gen && error instanceof Error) {
      if (error.message === "deadline") return receipt("paused");
      Object.assign(error, { generation: gen.id });
    }
    throw error;
  } finally {
    if (locked) await client.query("select pg_advisory_unlock($1)", [LOCK]).catch(() => undefined);
    // Destroy the dedicated session, so even a failed unlock cannot leak a session lock into the pool.
    client.release(true);
  }
}
