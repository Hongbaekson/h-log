import assert from "node:assert/strict";
import test from "node:test";
import { authorizeBrainOwner } from "./brain-owner.ts";

const environment = {
  HLOG_BRAIN_DATABASE_ENABLED: "1",
  HLOG_BRAIN_OWNER_KEY: "a".repeat(64),
  HLOG_BRAIN_OWNER_ORIGIN: "http://127.0.0.1:3013",
  NODE_ENV: "development",
};
const authorization = `Basic ${Buffer.from(`owner:${environment.HLOG_BRAIN_OWNER_KEY}`).toString("base64")}`;
function request(method = "GET", headers: Record<string, string> = {}) {
  return new Request(`${environment.HLOG_BRAIN_OWNER_ORIGIN}/admin/brain/records`, { method, headers });
}

test("owner capture is disabled without explicit configuration and challenges everyone without the key", () => {
  assert.equal(authorizeBrainOwner(request(), {})?.status, 404);
  const denied = authorizeBrainOwner(request(), environment)!;
  assert.equal(denied.status, 401);
  assert.match(denied.headers.get("www-authenticate")!, /^Basic /);
  assert.match(denied.headers.get("cache-control")!, /no-store/);
  assert.equal(authorizeBrainOwner(request("GET", { authorization: "Basic invalid" }), environment)?.status, 401);
  assert.equal(authorizeBrainOwner(request("GET", { authorization }), environment), null);
});

test("owner writes reject cross-origin, missing-origin and insecure production requests", () => {
  for (const origin of [undefined, "https://untrusted.example", "null"]) {
    assert.equal(authorizeBrainOwner(request("POST", { authorization, ...(origin ? { origin } : {}) }), environment)?.status, 403);
  }
  assert.equal(authorizeBrainOwner(request("POST", { authorization, origin: environment.HLOG_BRAIN_OWNER_ORIGIN }), environment), null);
  assert.equal(authorizeBrainOwner(request("GET", { authorization }), { ...environment, NODE_ENV: "production" })?.status, 404);
  assert.equal(authorizeBrainOwner(request("GET", { authorization }), { ...environment, HLOG_BRAIN_OWNER_KEY: "short" })?.status, 404);
});

test("owner authority uses the request Host even when Next normalizes loopback URLs", () => {
  const normalized = new Request("http://localhost:3013/admin/brain", { headers: { authorization, host: "127.0.0.1:3013" } });
  assert.equal(authorizeBrainOwner(normalized, environment), null);
  assert.equal(authorizeBrainOwner(request("GET", { authorization, host: "untrusted.example" }), environment)?.status, 403);
});
