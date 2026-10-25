import assert from "node:assert/strict";
import test from "node:test";
import { handleBrainCaptureRequest } from "./brain-capture-http.ts";

const environment = { HLOG_ADMIN_ENABLED: "1", HLOG_BRAIN_DATABASE_ENABLED: "1", HLOG_ADMIN_OWNER_KEY: "b".repeat(64), HLOG_ADMIN_ORIGIN: "http://127.0.0.1:3013", NODE_ENV: "development" };
const headers = { host: "127.0.0.1:3013", authorization: `Basic ${Buffer.from(`owner:${environment.HLOG_ADMIN_OWNER_KEY}`).toString("base64")}`, origin: environment.HLOG_ADMIN_ORIGIN, "content-type": "application/json" };
const url = `${environment.HLOG_ADMIN_ORIGIN}/admin/brain/records`;

test("private HTTP rejects unauthenticated and cross-site requests before accessing records", async () => {
  const unavailable = () => { assert.fail("private repository must not be accessed"); };
  assert.equal((await handleBrainCaptureRequest(new Request(url, { headers: { host: "127.0.0.1:3013" } }), unavailable, environment)).status, 401);
  assert.equal((await handleBrainCaptureRequest(new Request(url, { method: "POST", headers: { ...headers, origin: "https://untrusted.example" }, body: "{}" }), unavailable, environment)).status, 403);
});

test("private HTTP bounds and validates requests before opening the database", async () => {
  const unavailable = () => { assert.fail("invalid input must not open the database"); };
  for (const [body, status] of [["{", 400], [JSON.stringify({ action: "publish", id: "not-an-id", revision: 1, confirmed: true }), 400], [JSON.stringify({ action: "unknown" }), 400], ["x".repeat(262145), 413]] as const) {
    const response = await handleBrainCaptureRequest(new Request(url, { method: "POST", headers, body }), unavailable, environment);
    assert.equal(response.status, status);
    assert.match(response.headers.get("cache-control")!, /no-store/);
  }
});

test("private HTTP never echoes database errors or private content", async () => {
  const response = await handleBrainCaptureRequest(new Request(url, { headers }), () => { throw new Error("PRIVATE_DATABASE_SENTINEL"); }, environment);
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /PRIVATE_DATABASE_SENTINEL/);
});

test("old clients without command identity receive a refresh error before storage access", async () => {
  const draft = { title: "비공개 제목", originalText: "원문", publicTitle: "", publicSummary: "", publicBody: "", kind: "question", topic: "reliability", basis: "question", tags: [] };
  let accessed = false;
  const response = await handleBrainCaptureRequest(new Request(url, { method: "POST", headers, body: JSON.stringify({ action: "save", revision: 0, draft }) }), () => {
    accessed = true; throw new Error("must not open storage");
  }, environment);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "command_metadata_required");
  assert.equal(accessed, false);
});

test("command identity is validated before storage and feature-off never opens storage", async () => {
  const unavailable = () => { assert.fail("must not open storage"); };
  const base = { action: "unpublish", id: "note-12345678-1234-1234-1234-123456789abc", revision: 1 };
  for (const metadata of [{ commandId: "bad", commandRevision: 0 }, { commandId: base.id.slice(5), commandRevision: -1 }, { commandId: base.id.slice(5), commandRevision: 0.5 }]) {
    const response = await handleBrainCaptureRequest(new Request(url, { method: "POST", headers, body: JSON.stringify({ ...base, ...metadata }) }), unavailable, environment);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_command_metadata");
  }
  const off = await handleBrainCaptureRequest(new Request(url, { headers }), unavailable, { ...environment, HLOG_BRAIN_DATABASE_ENABLED: "0" });
  assert.equal(off.status, 404);
});
