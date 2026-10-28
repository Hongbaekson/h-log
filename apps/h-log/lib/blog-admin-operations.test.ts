import assert from "node:assert/strict";
import test from "node:test";
import { parseAuditQuery, parseJobsQuery, readCostLimit } from "./blog-admin-operations.ts";
import { snapshotFreshness } from "./admin-observation.ts";

test("operations filters reject unbounded, repeated and unsupported query values", () => {
  assert.deepEqual(parseJobsQuery({}), { page: 1, status: "all", importance: "all", lease: "all" });
  assert.equal(parseJobsQuery({ page: "10000", status: "running", importance: "required", lease: "expired" }).page, 10000);
  for (const page of ["0", "-1", "10001", "1.1", "1e3", "999999999999999999", ["1", "2"]]) {
    assert.throws(() => parseJobsQuery({ page }), /invalid_query/);
  }
  assert.throws(() => parseJobsQuery({ status: "dead-letter" }), /invalid_query/);
  assert.throws(() => parseJobsQuery({ lease: "running" }), /invalid_query/);
  assert.throws(() => parseAuditQuery({ target: "../private" }), /invalid_query/);
  assert.throws(() => parseAuditQuery({ actor: ["admin", "system"] }), /invalid_query/);
  assert.deepEqual(parseAuditQuery({ target: "automation_policy", actor: "admin" }), { page: 1, target: "automation_policy", actor: "admin" });
});

test("cost limits distinguish unlimited, zero, finite and invalid without exposing settings", () => {
  assert.deepEqual(readCostLimit(undefined), { state: "unlimited" });
  assert.deepEqual(readCostLimit("  "), { state: "unlimited" });
  assert.deepEqual(readCostLimit("0"), { state: "limited", amount: 0 });
  assert.deepEqual(readCostLimit("1.25"), { state: "limited", amount: 1.25 });
  for (const value of ["-1", "NaN", "Infinity", "SECRET-CONFIG"]) {
    assert.deepEqual(readCostLimit(value), { state: "invalid" });
  }
});

test("snapshot freshness is observation age, never worker liveness or last job age", () => {
  const at = "2026-10-28T00:00:00.000Z";
  assert.equal(snapshotFreshness(at, Date.parse(at) + 180000), "fresh");
  assert.equal(snapshotFreshness(at, Date.parse(at) + 180001), "stale");
});
