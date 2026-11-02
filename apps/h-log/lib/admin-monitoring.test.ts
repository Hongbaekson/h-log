import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { projectMonitoring, readAdminMonitoring } from "./admin-monitoring.ts";

const now = Date.parse("2026-11-02T03:00:00Z");
type Sample = { metric: Record<string, string>; value: [number, string] };
function fixture() {
  const rows: Sample[] = [];
  const add = (name: string, value: number, labels: Record<string, string> = {}) => rows.push({ metric: { __name__: name, ...labels }, value: [now / 1000, String(value)] });
  for (const job of ["prometheus", "host", "database", "hlog", "probe-exporter"]) add("up", 1, { job });
  for (const target of ["home", "blog"]) { add("up", 1, { job: "http", target }); add("probe_success", 1, { target }); }
  add("pg_up", 1);
  for (const source of ["db", "expectations", "autopublish", "backup", "restore"]) {
    add("hlog_metrics_collection_success", 1, { source });
    add("hlog_metrics_collected_timestamp_seconds", now / 1000 - 60, { source });
    for (const state of ["ready", "missing", "invalid", "error"]) add("hlog_metrics_source_state", Number(state === "ready"), { source, state });
  }
  for (const task of ["autopublish", "backup", "restore"]) {
    add("hlog_schedule_expected_enabled", 0, { task });
    add("hlog_schedule_maintenance_from_timestamp_seconds", 0, { task });
    add("hlog_schedule_maintenance_until_timestamp_seconds", 0, { task });
    const prefix = task === "autopublish" ? "hlog_autopublish" : "hlog_batch";
    const labels: Record<string, string> = task === "autopublish" ? {} : { task };
    add(prefix + "_last_attempt_timestamp_seconds", now / 1000 - 120, labels);
    add(prefix + "_last_success_timestamp_seconds", task === "restore" ? 0 : now / 1000 - 100, labels);
    for (const result of ["never", "running", "succeeded", "failed", "skipped", "budget_blocked", "interrupted", "unverified"]) add("hlog_batch_result", Number(result === (task === "restore" ? "failed" : "succeeded")), { task, result });
  }
  for (const window of ["day", "month"]) {
    add("hlog_usage_known_cost_usd", 0.125, { window });
    add("hlog_usage_unknown_events", 2, { window });
    add("hlog_usage_included_events", 3, { window });
    add("hlog_usage_budget_usd", 10, { window });
    for (const state of ["limited", "zero", "unlimited", "invalid"]) add("hlog_usage_budget_state", Number(state === "limited"), { window, state });
  }
  return rows;
}
const response = (rows: Sample[]) => ({ status: "success", data: { resultType: "vector", result: rows } });

test("monitoring projects existing signals without inventing success or total cost", () => {
  const data = projectMonitoring(response(fixture()), now);
  assert.equal(data.services.find(x => x.key === "blog")?.state, "ready");
  assert.equal(data.tasks[0].schedule, "disabled");
  assert.equal(data.tasks[0].lastSuccessAt, "2026-11-02T02:58:20.000Z");
  assert.equal(data.tasks[2].state, "ready");
  assert.equal(data.tasks[2].lastSuccessAt, null);
  assert.equal(data.tasks[2].result, "failed");
  assert.deepEqual(data.costs[0], { window: "day", state: "ready", knownCost: 0.125, unknownEvents: 2, includedEvents: 3, budget: "limited", limit: 10 });
});

test("missing measurements and a stopped collector never become zero cost, disabled or never succeeded", () => {
  for (const rows of [[], fixture().map(row => row.metric.__name__ === "up" && row.metric.job === "hlog" ? { ...row, value: [now / 1000, "0"] as [number, string] } : row)]) {
    const data = projectMonitoring(response(rows), now);
    assert(data.tasks.every(task => task.state !== "ready" && task.schedule === null && task.result === null));
    assert(data.costs.every(cost => cost.state !== "ready" && cost.knownCost === null));
  }
});

test("stale, failed and missing source states hide old business values independently", () => {
  const rows = fixture();
  for (const row of rows) {
    if (row.metric.source === "db" && row.metric.__name__ === "hlog_metrics_collected_timestamp_seconds") row.value[1] = String(now / 1000 - 181);
    if (row.metric.source === "backup" && row.metric.__name__ === "hlog_metrics_source_state") row.value[1] = String(Number(row.metric.state === "error"));
    if (row.metric.source === "backup" && row.metric.__name__ === "hlog_metrics_collection_success") row.value[1] = "0";
    if (row.metric.source === "restore" && row.metric.__name__ === "hlog_metrics_source_state") row.value[1] = String(Number(row.metric.state === "missing"));
    if (row.metric.source === "restore" && row.metric.__name__ === "hlog_metrics_collection_success") row.value[1] = "0";
  }
  const data = projectMonitoring(response(rows), now);
  assert.equal(data.costs[0].state, "stale"); assert.equal(data.costs[0].knownCost, null);
  assert.equal(data.tasks[1].state, "error"); assert.equal(data.tasks[1].lastSuccessAt, null);
  assert.equal(data.tasks[2].state, "missing"); assert.equal(data.tasks[2].result, null);
  assert.equal(data.tasks[0].state, "ready");
});

test("maintenance and disabled schedules are separate from the last attempt result", () => {
  const rows = fixture();
  for (const row of rows) if (row.metric.task === "autopublish") {
    if (row.metric.__name__ === "hlog_schedule_expected_enabled") row.value[1] = "1";
    if (row.metric.__name__ === "hlog_schedule_maintenance_from_timestamp_seconds") row.value[1] = String(now / 1000 - 60);
    if (row.metric.__name__ === "hlog_schedule_maintenance_until_timestamp_seconds") row.value[1] = String(now / 1000 + 60);
  }
  const data = projectMonitoring(response(rows), now);
  assert.equal(data.tasks[0].schedule, "maintenance"); assert.equal(data.tasks[0].result, "succeeded");
  assert.equal(data.tasks[1].schedule, "disabled");
});

test("duplicate, invalid or missing business evidence cannot produce a normal projection", () => {
  for (const problem of ["duplicate", "nan", "missing", "future"]) {
    const rows = fixture();
    const target = rows.find(row => row.metric.__name__ === "hlog_autopublish_last_success_timestamp_seconds")!;
    if (problem === "duplicate") rows.push({ ...target });
    if (problem === "nan") target.value[1] = "NaN";
    if (problem === "future") target.value[1] = String(now / 1000 + 61);
    if (problem === "missing") rows.splice(rows.indexOf(target), 1);
    const data = projectMonitoring(response(rows), now);
    assert.equal(data.tasks[0].state, "invalid"); assert.equal(data.tasks[0].lastSuccessAt, null);
  }
});

test("the projection never returns raw labels, URLs, query warnings or error messages", () => {
  const rows = fixture();
  for (const row of rows) row.metric.instance = "SECRET-private-host";
  assert(!JSON.stringify(projectMonitoring(response(rows), now)).includes("SECRET"));
  for (const payload of [{ status: "error", error: "SECRET" }, { ...response(rows), warnings: ["SECRET"] }, { status: "success", data: { resultType: "matrix", result: [] } }]) {
    assert.throws(() => projectMonitoring(payload, now), /Invalid monitoring response/);
  }
});

test("private reads are bounded, fixed-query and fail closed without leaking transport data", async () => {
  let mode = "ready", requests = 0;
  const server = createServer((request, reply) => {
    requests++;
    const url = new URL(request.url!, "http://localhost");
    assert.equal(url.pathname, "/api/v1/query");
    assert(url.searchParams.get("query")?.includes("last_over_time("));
    assert.equal(request.headers.authorization, undefined);
    if (mode === "redirect") { reply.writeHead(302, { location: "/SECRET" }).end(); return; }
    if (mode === "failure") { reply.writeHead(503).end("SECRET-error"); return; }
    if (mode === "oversize") { reply.end(" ".repeat(131073)); return; }
    const rows = fixture().map(row => ({ ...row, value: [Date.now() / 1000, row.value[1]] }));
    reply.end(JSON.stringify(response(rows as Sample[])));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    assert.equal((await readAdminMonitoring()).connection, "unconfigured");
    for (const bad of ["https://example.com", origin + "/private", origin + "?token=SECRET", origin.replace("//", "//owner:SECRET@")]) assert.equal((await readAdminMonitoring(bad)).connection, "error");
    assert.equal(requests, 0);
    assert.equal((await readAdminMonitoring(origin)).connection, "ready");
    for (mode of ["redirect", "failure", "oversize"]) {
      const data = await readAdminMonitoring(origin);
      assert.equal(data.connection, "error"); assert.equal(data.data, null);
      assert(!JSON.stringify(data).includes("SECRET"));
    }
    assert.equal(requests, 4);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
