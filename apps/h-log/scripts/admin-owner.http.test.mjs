import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

const enabled = process.env.HLOG_ADMIN_HTTP_TEST === "1";

test("shared admin HTML, API and RSC stay behind the owner boundary on two local origins", { skip: !enabled && "requires isolated loopback ingress and HLOG_ADMIN_HTTP_TEST=1" }, async () => {
  const admin = new URL(process.env.HLOG_ADMIN_ORIGIN);
  const publicOrigin = new URL(process.env.HLOG_ADMIN_HTTP_PUBLIC_ORIGIN);
  const upstream = new URL(process.env.HLOG_ADMIN_HTTP_UPSTREAM);
  for (const url of [admin, publicOrigin, upstream]) {
    assert.equal(url.protocol, "http:");
    assert(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Use isolated loopback origins");
  }
  assert.notEqual(admin.origin, publicOrigin.origin);
  const key = process.env.HLOG_ADMIN_OWNER_KEY;
  assert.match(key ?? "", /^[a-f0-9]{64}$/);
  const authorization = `Basic ${Buffer.from(`owner:${key}`).toString("base64")}`;
  const get = (origin, path, headers = {}, method = "GET") => new Promise((resolve, reject) => {
    const req = http.request(new URL(path, origin), { headers, method, timeout: 30000 }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => body += chunk);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("local request timed out")));
    req.end();
  });
  for (const path of ["/admin", "/admin/brain", "/admin/brain/records", "/admin/posts", "/admin/brain?_rsc=boundary"]) {
    for (const headers of [{}, { authorization }]) {
      const denied = await get(publicOrigin, path, headers);
      assert.equal(denied.status, 404, `public ${path}`);
      assert.doesNotMatch(denied.body, /관리자 개요|나만 보는 기록/);
    }
    const denied = await get(admin, path, { RSC: "1", "Next-Router-Prefetch": "1" });
    assert.equal(denied.status, 401, `anonymous ${path}`);
    assert.match(denied.headers["cache-control"], /no-store/);
    assert.match(denied.headers["www-authenticate"], /H-Log admin/);
    assert.doesNotMatch(denied.body, /관리자 개요|나만 보는 기록/);
  }
  assert.equal((await get(admin, "/admin", { authorization: "Basic invalid" })).status, 401);
  const overview = await get(admin, "/admin", { authorization });
  assert.equal(overview.status, 200);
  assert.match(overview.body, /관리자 개요/);
  assert.doesNotMatch(overview.body, /class="site-header|class="site-footer/);
  assert.match(overview.headers["cache-control"], /private.*no-store/);
  assert.match(overview.headers["x-robots-tag"], /noindex/);
  assert.equal(overview.headers["x-frame-options"], "DENY");
  const head = await get(admin, "/admin", { authorization }, "HEAD");
  assert.equal(head.status, 200); assert.equal(head.body, "");
  const rsc = await get(admin, "/admin?_rsc=allowed", { authorization, RSC: "1" });
  assert.equal(rsc.status, 200); assert.match(rsc.headers["content-type"], /text\/x-component/);
  const brain = await get(admin, "/admin/brain", { authorization });
  assert.equal(brain.status, 200);
  assert.match(brain.body, /나만 보는 기록/);
  if (process.env.HLOG_BRAIN_DATABASE_ENABLED !== "1") {
    assert.match(brain.body, /저장 기능이 아직 설정되지 않았습니다/);
    assert.equal((await get(admin, "/admin/brain/records", { authorization })).status, 404);
  }
  for (const origin of [undefined, "null", publicOrigin.origin, "http://sibling.example", admin.origin + ".evil.example"]) {
    const denied = await get(admin, "/admin/brain/records", { authorization, ...(origin ? { origin } : {}) }, "POST");
    assert.equal(denied.status, 403);
  }
  assert.equal((await get(admin, "/admin/brain/records", { authorization, origin: admin.origin, "sec-fetch-site": "same-site" }, "POST")).status, 403);
  for (const host of [publicOrigin.host, "untrusted.example"]) {
    const denied = await get(upstream, "/admin", { host, authorization, "x-forwarded-host": admin.host, forwarded: `host=${admin.host}` });
    assert.equal(denied.status, 403);
  }
  const missingHost = await get(upstream, "/admin", { host: "", authorization });
  assert([400, 403].includes(missingHost.status)); // HTTP parser may reject before the app guard.
  assert.equal((await get(upstream, "/admin", { host: admin.host })).status, 401);
  assert.equal((await get(admin, "/admin", { authorization, "x-forwarded-host": "evil.example", forwarded: "host=evil.example" })).status, 200);
  assert.equal((await get(admin, "/blog", { authorization })).status, 404);
  console.log("Owner/anonymous, public/admin origins, HTML/API/RSC, HEAD, Host/Origin and forwarded-header boundaries passed.");
});
