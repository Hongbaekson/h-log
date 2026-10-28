import type { RequestListener } from "node:http";
import type { Pool, QueryResult } from "pg";

type DatabaseMetrics = { maxConnections: number; waitingLocks: number; connections: number };

export async function readDatabaseMetrics(pool: Pool): Promise<DatabaseMetrics> {
  const client = await pool.connect();
  let failed = true;
  try {
    // One client-side deadline covers the entire read-only transaction.
    const query = {
      text: "BEGIN READ ONLY; SET LOCAL statement_timeout = '3s'; SELECT max_connections, waiting_locks, connections FROM monitoring.database_health; COMMIT;",
      query_timeout: 5_000,
    };
    const results = await client.query(query) as unknown as QueryResult[];
    const row = results[2].rows[0];
    failed = false;
    return { maxConnections: Number(row.max_connections), waitingLocks: Number(row.waiting_locks), connections: Number(row.connections) };
  } finally {
    // Destroy a timed-out/failed connection rather than returning an open transaction.
    client.release(failed);
  }
}

export function createDatabaseCollector(read: () => Promise<DatabaseMetrics>, now = Date.now) {
  let state = "missing";
  let snapshot: DatabaseMetrics | undefined;
  let collectedAt: number | undefined;
  let attemptedAt = -Infinity;
  let pending: Promise<void> | undefined;
  return {
    collect(): Promise<void> {
      if (pending) return pending;
      if (now() - attemptedAt < 60_000) return Promise.resolve();
      attemptedAt = now();
      pending = (async () => {
        try {
          const next = await read();
          if (!Object.values(next).every(value => Number.isSafeInteger(value) && value >= 0) || next.maxConnections === 0) {
            state = "invalid";
            return;
          }
          snapshot = next;
          collectedAt = now();
          state = "ready";
        } catch { state = "error"; }
      })().finally(() => { pending = undefined; });
      return pending;
    },
    metrics(): string {
      const lines = [`hlog_metrics_collection_success{source="db"} ${Number(state === "ready")}`];
      for (const value of ["ready", "missing", "invalid", "error"]) lines.push(`hlog_metrics_source_state{source="db",state="${value}"} ${Number(state === value)}`);
      if (collectedAt !== undefined) lines.push(`hlog_metrics_collected_timestamp_seconds{source="db"} ${collectedAt / 1000}`);
      if (snapshot && collectedAt !== undefined && now() - collectedAt <= 180_000) {
        lines.push(`hlog_db_max_connections ${snapshot.maxConnections}`, `hlog_db_waiting_locks ${snapshot.waitingLocks}`, `hlog_db_connections ${snapshot.connections}`);
      }
      return `${lines.join("\n")}\n`;
    },
  };
}

export function createMetricsHandler(metrics: () => string): RequestListener {
  return (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (request.url !== "/metrics") { response.writeHead(404).end(); return; }
    if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405, { Allow: "GET, HEAD" }).end(); return; }
    response.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : metrics());
  };
}
