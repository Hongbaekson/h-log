import assert from "node:assert/strict";
import test from "node:test";
import { authorizeAdminOwner } from "./admin-owner.ts";

const environment = {
  HLOG_ADMIN_ENABLED: "1",
  HLOG_ADMIN_OWNER_KEY: "a".repeat(64),
  HLOG_ADMIN_ORIGIN: "http://localhost:3031",
  NODE_ENV: "development",
};
const authorization = `Basic ${Buffer.from(`owner:${environment.HLOG_ADMIN_OWNER_KEY}`).toString("base64")}`;
function request(method = "GET", headers: Record<string, string> = {}) {
  return new Request("http://localhost:3032/admin", {
    method, headers: { host: "localhost:3031", authorization, ...headers },
  });
}

test("shared admin authentication works independently of Brain storage", () => {
  assert.equal(authorizeAdminOwner(request(), environment), null);
  assert.equal(authorizeAdminOwner(request(), { ...environment, HLOG_BRAIN_DATABASE_ENABLED: "0" }), null);
});

test("admin access requires a real Host and rejects same-site writes", () => {
  const missingHost = request();
  missingHost.headers.delete("host");
  // The URL matches the configured origin, so it must not become a Host fallback.
  const matchingUrl = new Request(environment.HLOG_ADMIN_ORIGIN + "/admin", { headers: missingHost.headers });
  assert.equal(authorizeAdminOwner(matchingUrl, environment)?.status, 403);
  assert.equal(authorizeAdminOwner(request("POST", { origin: environment.HLOG_ADMIN_ORIGIN, "sec-fetch-site": "same-site" }), environment)?.status, 403);
});

test("admin configuration fails closed without legacy credential fallback", () => {
  for (const override of [
    { HLOG_ADMIN_ENABLED: "0" }, { HLOG_ADMIN_OWNER_KEY: "short" },
    ...["", "http://localhost:3031/", "http://localhost:3031?x=1", "http://owner@localhost:3031", "http://admin.example.com", "ftp://localhost:3031"].map(HLOG_ADMIN_ORIGIN => ({ HLOG_ADMIN_ORIGIN })),
    { NODE_ENV: "production" },
  ]) assert.equal(authorizeAdminOwner(request(), { ...environment, ...override })?.status, 404);
  assert.equal(authorizeAdminOwner(request(), {
    HLOG_BRAIN_DATABASE_ENABLED: "1", HLOG_BRAIN_OWNER_KEY: environment.HLOG_ADMIN_OWNER_KEY,
    HLOG_BRAIN_OWNER_ORIGIN: environment.HLOG_ADMIN_ORIGIN,
  })?.status, 404);
  assert.equal(authorizeAdminOwner(request(), { ...environment, HLOG_BRAIN_OWNER_KEY: "b".repeat(64) }), null);
});

test("anonymous or invalid credentials are challenged without private data", async () => {
  for (const value of ["", "Basic invalid", `Basic ${Buffer.from(`other:${environment.HLOG_ADMIN_OWNER_KEY}`).toString("base64")}`, `Basic ${Buffer.from(`owner:${"b".repeat(64)}`).toString("base64")}`]) {
    const denied = authorizeAdminOwner(request("GET", { authorization: value }), environment)!;
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get("www-authenticate"), 'Basic realm="H-Log admin", charset="UTF-8"');
    assert.match(denied.headers.get("cache-control")!, /private, no-store/);
    assert.match(denied.headers.get("x-robots-tag")!, /noindex/);
    assert.equal(await denied.text(), "");
  }
});

test("origin and authority checks do not trust sibling sites or forwarded headers", () => {
  for (const host of ["public.example.com", "localhost:3030", "localhost:3031.evil.example"]) {
    assert.equal(authorizeAdminOwner(request("GET", { host, "x-forwarded-host": "localhost:3031", forwarded: "host=localhost:3031" }), environment)?.status, 403);
  }
  assert.equal(authorizeAdminOwner(request("GET", { "x-forwarded-host": "evil.example" }), environment), null);
  for (const origin of ["", "null", "http://127.0.0.1:3031", "http://localhost:3030", "http://localhost:3031.evil.example"]) {
    assert.equal(authorizeAdminOwner(request("POST", { origin }), environment)?.status, 403);
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.equal(authorizeAdminOwner(request(method), environment)?.status, 403);
    assert.equal(authorizeAdminOwner(request(method, { origin: environment.HLOG_ADMIN_ORIGIN, "sec-fetch-site": "cross-site" }), environment)?.status, 403);
    assert.equal(authorizeAdminOwner(request(method, { origin: environment.HLOG_ADMIN_ORIGIN }), environment), null);
  }
  assert.equal(authorizeAdminOwner(request("HEAD"), environment), null);
  assert.equal(authorizeAdminOwner(request("GET", { host: "admin.example.com" }), { ...environment, HLOG_ADMIN_ORIGIN: "https://admin.example.com", NODE_ENV: "production" }), null);
});
