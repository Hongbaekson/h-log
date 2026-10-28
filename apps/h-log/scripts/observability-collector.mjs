import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import pg from "pg";
import { createDatabaseCollector, createMetricsHandler, readDatabaseMetrics } from "../lib/observability-collector.ts";

try {
  const connectionString = (await readFile("/run/secrets/collector_dsn", "utf8")).trim();
  if (!connectionString || connectionString.length > 4096) throw new Error("invalid configuration");
  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 2000, idleTimeoutMillis: 10_000, statement_timeout: 3000, idle_in_transaction_session_timeout: 5000 });
  pool.on("error", () => { /* Never log raw database errors or credentials. Next collection reports failure. */ });
  const collector = createDatabaseCollector(() => readDatabaseMetrics(pool));
  await collector.collect();
  // The collector owns the 60-second rate limit. A coarse scheduling tick avoids
  // skipping a whole period when a 60-second timer wakes just before its deadline.
  const timer = setInterval(() => void collector.collect(), 1000);
  const server = createServer({ requestTimeout: 5000, headersTimeout: 5000 }, createMetricsHandler(collector.metrics));
  server.listen(9400, "0.0.0.0");
  const stop = () => { clearInterval(timer); server.close(() => void pool.end()); };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
} catch {
  console.error("metrics collector configuration failed");
  process.exitCode = 1;
}
