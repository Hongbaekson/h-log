import assert from "node:assert/strict";
import test from "node:test";
import { handleBrainCaptureRequest } from "./brain-capture-http.ts";

const environment = { HLOG_BRAIN_DATABASE_ENABLED: "1", HLOG_BRAIN_OWNER_KEY: "b".repeat(64), HLOG_BRAIN_OWNER_ORIGIN: "http://127.0.0.1:3013", NODE_ENV: "development" };
const headers = { authorization: `Basic ${Buffer.from(`owner:${environment.HLOG_BRAIN_OWNER_KEY}`).toString("base64")}`, origin: environment.HLOG_BRAIN_OWNER_ORIGIN, "content-type": "application/json" };
const url = `${environment.HLOG_BRAIN_OWNER_ORIGIN}/admin/brain/records`;

test("private HTTP rejects unauthenticated and cross-site requests before accessing records", async () => {
  const unavailable = () => { assert.fail("private repository must not be accessed"); };
  assert.equal((await handleBrainCaptureRequest(new Request(url), unavailable, environment)).status, 401);
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
