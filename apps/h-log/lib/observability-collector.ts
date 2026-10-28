import type { RequestListener } from "node:http";
import type { Pool, QueryResult } from "pg";
import { renderPublishingMetrics } from "./observability-publishing.ts";

type DatabaseMetrics = { maxConnections: number; waitingLocks: number; connections: number; publishing?: Parameters<typeof renderPublishingMetrics>[0] };

export async function readDatabaseMetrics(pool: Pool, publishing = false): Promise<DatabaseMetrics> {
  const client = await pool.connect();
  let failed = true;
  try {
    // One client-side deadline covers the entire read-only transaction.
    const query = {
      text: "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout = '3s'; SELECT max_connections, waiting_locks, connections FROM monitoring.database_health; " +
        (publishing ? "SELECT * FROM monitoring.publishing_jobs; SELECT * FROM monitoring.publishing_queue; SELECT * FROM monitoring.publishing_usage; " : "") + "COMMIT;",
      query_timeout: 5_000,
    };
    const results = await client.query(query) as unknown as QueryResult[];
    const row = results[2].rows[0];
    failed = false;
    return { maxConnections: Number(row.max_connections), waitingLocks: Number(row.waiting_locks), connections: Number(row.connections),
      ...(publishing ? { publishing: { jobs: results[3].rows, queue: results[4].rows, usage: results[5].rows } } : {}) };
  } finally {
    // Destroy a timed-out/failed connection rather than returning an open transaction.
    client.release(failed);
  }
}

export function createDatabaseCollector(read: () => Promise<DatabaseMetrics>, now = Date.now, environment: Record<string, string | undefined> = {}) {
  return createSourceCollector("db", async () => {
    const next = await read();
    if (![next.maxConnections, next.waitingLocks, next.connections].every(value => Number.isSafeInteger(value) && value >= 0) || next.maxConnections === 0) throw Object.assign(new Error("invalid database snapshot"), { code: "INVALID_METRICS" });
    return `hlog_db_max_connections ${next.maxConnections}\nhlog_db_waiting_locks ${next.waitingLocks}\nhlog_db_connections ${next.connections}\n` +
      (next.publishing ? renderPublishingMetrics(next.publishing, environment) : "");
  }, now);
}

export function createSourceCollector(source: "db" | "autopublish" | "expectations", read: () => Promise<string>, now = Date.now) {
  let state = "missing";
  let snapshot: string | undefined;
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
          snapshot = await read();
          collectedAt = now();
          state = "ready";
        } catch (error) {
          const code = (error as { code?: string }).code;
          state = code === "ENOENT" ? "missing" : code === "INVALID_METRICS" ? "invalid" : "error";
        }
      })().finally(() => { pending = undefined; });
      return pending;
    },
    metrics(): string {
      const lines = [`hlog_metrics_collection_success{source="${source}"} ${Number(state === "ready")}`];
      for (const value of ["ready", "missing", "invalid", "error"]) lines.push(`hlog_metrics_source_state{source="${source}",state="${value}"} ${Number(state === value)}`);
      if (collectedAt !== undefined) lines.push(`hlog_metrics_collected_timestamp_seconds{source="${source}"} ${collectedAt / 1000}`);
      if (snapshot && collectedAt !== undefined && now() - collectedAt <= 180_000) {
        lines.push(snapshot.trimEnd());
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
