import assert from "node:assert/strict";
import test from "node:test";
import { handleBrainCaptureRequest } from "./brain-capture-http.ts";

const environment = { HLOG_ADMIN_ENABLED: "1", HLOG_BRAIN_DATABASE_ENABLED: "1", HLOG_ADMIN_OWNER_KEY: "b".repeat(64), HLOG_ADMIN_ORIGIN: "http://127.0.0.1:3013", NODE_ENV: "development" };
const headers = { host: "127.0.0.1:3013", authorization: `Basic ${Buffer.from(`owner:${environment.HLOG_ADMIN_OWNER_KEY}`).toString("base64")}`, origin: environment.HLOG_ADMIN_ORIGIN, "content-type": "application/json" };
const url = `${environment.HLOG_ADMIN_ORIGIN}/admin/brain/records`;

test("manual review dispatches a valid version-bound command and returns its receipt", async () => {
  const command = { action: "review", id: "note-12345678-1234-1234-1234-123456789abc", revision: 1,
    commandId: "12345678-1234-1234-1234-123456789abc", commandRevision: 1, review: { result: "confirmed", memo: "확인한 범위" } };
  let called = false;
  const repository = { async reviewNote(id: string, revision: number, review: unknown, metadata: unknown) {
    assert.equal(id, command.id); assert.equal(revision, 1); assert.deepEqual(review, command.review);
    assert.deepEqual(metadata, { commandId: command.commandId, commandRevision: 1 }); called = true;
    return { id, revision, commandRevision: 2 };
  } };
  const response = await handleBrainCaptureRequest(new Request(url, { method: "POST", headers, body: JSON.stringify(command) }),
    () => repository as unknown as ReturnType<Parameters<typeof handleBrainCaptureRequest>[1]>, environment);
  assert.equal(response.status, 200); assert(called);
  assert.deepEqual(await response.json(), { id: command.id, revision: 1, commandRevision: 2 });
});

test("manual review queue rejects invalid query before storage access", async () => {
  for (const query of ["view=review&status=expired", "view=review&status=all&status=attention", "view=review&id=note-x", "view=review&after=bad", "view=review&extra=1"]) {
    let accessed = false;
    const response = await handleBrainCaptureRequest(new Request(url + "?" + query, { headers }), () => {
      accessed = true; throw new Error("must not open storage");
    }, environment);
    assert.equal(response.status, 400); assert.equal(accessed, false);
    assert.deepEqual(await response.json(), { error: "invalid_review_query" });
  }
});

test("invalid review input never accesses storage or echoes the memo", async () => {
  for (const review of [{ result: "confirmed", memo: "x".repeat(501) }, { result: "needs_review", memo: " " },
    { result: "confirmed", memo: "PRIVATE_BAD_MEMO\0" }, { result: "expired", memo: "PRIVATE_BAD_MEMO" }]) {
    const response = await handleBrainCaptureRequest(new Request(url, { method: "POST", headers, body: JSON.stringify({
      action: "review", id: "note-12345678-1234-1234-1234-123456789abc", revision: 1,
      commandId: "12345678-1234-1234-1234-123456789abc", commandRevision: 1, review,
    }) }), () => { assert.fail("invalid review must not open storage"); }, environment);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_review" });
    assert.match(response.headers.get("cache-control")!, /no-store/);
  }
});

test("provenance validation returns bounded private errors before storage access", async () => {
  const unavailable = () => { assert.fail("invalid provenance must not open storage"); };
  const draft = { title: "개인 제목", originalText: "원문", publicTitle: "", publicSummary: "", publicBody: "", kind: "question", topic: "tools", basis: "question", tags: [] };
  for (const patch of [{ sources: [{ label: "PRIVATE_BAD_SOURCE", href: "/admin/brain" }] }, { sources: null }, { questions: ["x".repeat(301)] }, { questions: null }]) {
    const response = await handleBrainCaptureRequest(new Request(url, { method: "POST", headers, body: JSON.stringify({ action: "save", revision: 0,
      commandId: "12345678-1234-1234-1234-123456789abc", commandRevision: 0, draft: { ...draft, ...patch } }) }), unavailable, environment);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_draft" });
    assert.match(response.headers.get("cache-control")!, /no-store/);
  }
});

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
