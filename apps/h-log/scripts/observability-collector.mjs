import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import pg from "pg";
import { join } from "node:path";
import { createDatabaseCollector, createMetricsHandler, createSourceCollector, readDatabaseMetrics } from "../lib/observability-collector.ts";
import { readFileMetrics } from "../lib/observability-publishing.ts";

try {
  const connectionString = (await readFile("/run/secrets/collector_dsn", "utf8")).trim();
  if (!connectionString || connectionString.length > 4096) throw new Error("invalid configuration");
  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 2000, idleTimeoutMillis: 10_000, statement_timeout: 3000, idle_in_transaction_session_timeout: 5000 });
  pool.on("error", () => { /* Never log raw database errors or credentials. Next collection reports failure. */ });
  const publishing = process.env.HLOG_PUBLISHING_METRICS_ENABLED === "1";
  const collectors = [createDatabaseCollector(() => readDatabaseMetrics(pool, publishing), Date.now, process.env)];
  if (publishing) {
    const directory = process.env.HLOG_OBSERVABILITY_STATE_DIR;
    if (!directory) throw new Error("missing state directory");
    for (const source of ["autopublish", "backup", "restore", "expectations"]) collectors.push(createSourceCollector(source, () => readFileMetrics(join(directory, `${source}.json`), source)));
  }
  const collect = () => Promise.all(collectors.map(c => c.collect()));
  await collect();
  // The collector owns the 60-second rate limit. A coarse scheduling tick avoids
  // skipping a whole period when a 60-second timer wakes just before its deadline.
  const timer = setInterval(() => void collect(), 1000);
  const server = createServer({ requestTimeout: 5000, headersTimeout: 5000 }, createMetricsHandler(() => collectors.map(c => c.metrics()).join("")));
  server.listen(9400, "0.0.0.0");
  const stop = () => { clearInterval(timer); server.close(() => void pool.end()); };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
} catch {
  console.error("metrics collector configuration failed");
  process.exitCode = 1;
}
