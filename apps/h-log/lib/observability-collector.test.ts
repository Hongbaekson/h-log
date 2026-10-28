import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseCollector, createMetricsHandler, readDatabaseMetrics } from "./observability-collector.ts";
import { createServer } from "node:http";
import { once } from "node:events";

test("collection preserves freshness on failure and removes expired values instead of fabricating zero", async () => {
  let now = 1_000_000;
  let fail = false;
  let calls = 0;
  const collector = createDatabaseCollector(async () => {
    calls++;
    if (fail) throw new Error("postgresql://PRIVATE:SECRET@INTERNAL/db");
    return { maxConnections: 100, waitingLocks: 2, connections: 7 };
  }, () => now);
  assert.match(collector.metrics(), /state="missing"} 1/);
  assert.doesNotMatch(collector.metrics(), /hlog_db_|collected_timestamp/);
  await collector.collect();
  assert.match(collector.metrics(), /hlog_db_waiting_locks 2/);
  assert.match(collector.metrics(), /collected_timestamp_seconds\{source="db"} 1000/);
  await collector.collect();
  assert.equal(calls, 1, "at most one DB attempt per 60 seconds");
  fail = true;
  now += 60_000;
  await collector.collect();
  assert.match(collector.metrics(), /collection_success\{source="db"} 0/);
  assert.match(collector.metrics(), /state="error"} 1/);
  assert.match(collector.metrics(), /hlog_db_waiting_locks 2/);
  assert.doesNotMatch(collector.metrics(), /SECRET|PRIVATE|INTERNAL/);
  now = 1_180_001;
  assert.doesNotMatch(collector.metrics(), /hlog_db_/);
  assert.match(collector.metrics(), /collected_timestamp_seconds\{source="db"} 1000/);
  fail = false;
  await collector.collect();
  assert.match(collector.metrics(), /collection_success\{source="db"} 1/);
});

test("overlapping collection shares one read and rejects invalid DB values", async () => {
  let release!: (value: { maxConnections: number; waitingLocks: number; connections: number }) => void;
  let calls = 0;
  const collector = createDatabaseCollector(() => { calls++; return new Promise(resolve => { release = resolve; }); });
  const first = collector.collect();
  const second = collector.collect();
  release({ maxConnections: 100, waitingLocks: -1, connections: 4 });
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.match(collector.metrics(), /state="invalid"} 1/);
  assert.doesNotMatch(collector.metrics(), /hlog_db_|collected_timestamp/);
});

test("metrics HTTP only serves a bounded cached snapshot and rejects arbitrary paths/methods", async () => {
  // readDatabaseMetrics is exercised with real PostgreSQL in the integration suite.
  assert.equal(typeof readDatabaseMetrics, "function");
  const server = createServer(createMetricsHandler(() => "hlog_sample 1\n"));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${base}/metrics`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(await response.text(), "hlog_sample 1\n");
    for (const path of ["/probe?target=private", "/metrics?query=private", "/admin", "/"]) assert.equal((await fetch(`${base}${path}`)).status, 404);
    assert.equal((await fetch(`${base}/metrics`, { method: "POST" })).status, 405);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
