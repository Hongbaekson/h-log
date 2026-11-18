import type { Pool, PoolClient } from "pg";
import { canonicalJson, fingerprint, type Projection, type ProjectionContext } from "./public-read-model.ts";
import type { SourceKey } from "./public-read-source.ts";

// Pass this same client to every original/marker/projection query in a public read.
export async function withPublicReadSnapshot<T>(pool: Pool, read: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    await client.query("set local statement_timeout='2s'");
    await client.query("set local lock_timeout='250ms'");
    const result = await read(client);
    await client.query("commit");
    return result;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

// A stale or incompatible entry is a miss, never evidence that an original is public.
// Payload consumers still apply their typed DTO parser at the route boundary.
export async function findCurrentProjection(client: PoolClient, key: SourceKey, context: ProjectionContext): Promise<Projection["payload"] | undefined> {
  const currentSelection = key.kind === "blog"
    ? "select 1 from posts p where p.id=$2 and p.status='published' and p.current_version_id=e.source_version"
    : "select 1 from brain_notes n where n.id=$2 and n.public_node is not null and n.published_revision::text=e.source_version";
  const row = (await client.query(`select e.payload,e.payload_hash,g.version_manifest,g.policy_fingerprint
    from public_read_state st join public_read_generations g on g.id=st.active_generation and g.source_epoch=st.source_epoch and g.status='active'
    join public_read_entries e on e.generation_id=g.id
    join public_read_sources s on s.kind=e.kind and s.source_id=e.source_id and s.metadata_revision=e.metadata_revision and not s.deleted
    where st.id=1 and st.writer_protocol=1 and e.kind=$1 and e.source_id=$2 and e.result='ready'
      and exists(${currentSelection})`,
  [key.kind, key.source_id])).rows[0];
  if (!row || canonicalJson(row.version_manifest) !== canonicalJson(context.manifest) || row.policy_fingerprint !== context.policyFingerprint
    || row.payload === null || fingerprint(row.payload) !== row.payload_hash) return undefined;
  return row.payload;
}
