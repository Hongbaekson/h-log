import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { parseAutomationCommand } from "./blog-automation-policy.ts";
import { handleAutomationPolicyRequest } from "./blog-automation-http.ts";

test("policy commands authenticate before parsing, bound input and hide storage errors", async () => {
  const env = { HLOG_ADMIN_ENABLED: "1", HLOG_ADMIN_OWNER_KEY: "a".repeat(64), HLOG_ADMIN_ORIGIN: "https://admin.example", NODE_ENV: "production" };
  const headers = { host: "admin.example", origin: "https://admin.example", authorization: `Basic ${Buffer.from(`owner:${env.HLOG_ADMIN_OWNER_KEY}`).toString("base64")}`, "content-type": "application/json" };
  const command = { commandId: randomUUID(), expectedRevision: 0, generation: true, publication: false, jobs: true, reason: "초안만 허용" };
  const req = (value: unknown, overrides = {}) => new Request("https://admin.example/admin/automation/policy", { method: "POST", headers: { ...headers, ...overrides }, body: JSON.stringify(value) });
  let calls = 0;
  const execute = async () => { calls++; return { revision: 1, requested: { generation: true, publication: false, jobs: true } }; };
  assert.equal((await handleAutomationPolicyRequest(req(command, { authorization: "bad" }), execute, env)).status, 401);
  assert.equal((await handleAutomationPolicyRequest(req(command, { origin: "https://sibling.example" }), execute, env)).status, 403);
  assert.equal((await handleAutomationPolicyRequest(req({ ...command, shell: "ignored" }), execute, env)).status, 400);
  assert.equal((await handleAutomationPolicyRequest(req({ reason: "x".repeat(5000) }), execute, env)).status, 413);
  assert.equal(calls, 0);
  const ok = await handleAutomationPolicyRequest(req(command), execute, env);
  assert.equal(ok.status, 200); assert.match(ok.headers.get("cache-control")!, /private.*no-store/);
  for (const code of ["revision_conflict", "command_conflict"]) assert.equal((await handleAutomationPolicyRequest(req(command), async () => { throw Error(code); }, env)).status, 409);
  const error = await handleAutomationPolicyRequest(req(command), async () => { throw Error("postgres://private"); }, env);
  assert.equal(error.status, 503); assert.deepEqual(await error.json(), { error: "storage_unavailable" });
  for (const patch of [{ expectedRevision: -1 }, { generation: "true" }, { reason: "" }, { commandId: "wrong" }]) assert.throws(() => parseAutomationCommand({ ...command, ...patch }), /invalid_request/);
});
