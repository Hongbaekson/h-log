import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import test from "node:test";

const enabled = process.env.HLOG_ADMIN_REVIEW_HTTP_TEST === "1";
test("private post review protects HTML/RSC and excludes drafts from public routes", { skip: !enabled && "requires isolated review fixture and loopback ingresses" }, async () => {
  const admin = new URL(process.env.HLOG_ADMIN_ORIGIN);
  const publicOrigin = new URL(process.env.HLOG_ADMIN_HTTP_PUBLIC_ORIGIN);
  const upstream = new URL(process.env.HLOG_ADMIN_HTTP_UPSTREAM);
  for (const url of [admin, publicOrigin, upstream]) assert.equal(url.hostname, "127.0.0.1");
  const authorization = `Basic ${Buffer.from(`owner:${process.env.HLOG_ADMIN_OWNER_KEY}`).toString("base64")}`;
  const cachePolicy = process.env.HLOG_ADMIN_REVIEW_PRODUCTION === "1" ? /private.*no-store/ : /no-store/;
  const get = (origin, path, headers = {}, method = "GET", depth = 0) => new Promise((resolve, reject) => {
    const req = (origin.protocol === "https:" ? https : http).request(new URL(path, origin), { headers, method, timeout: 30000 }, res => {
      let body = ""; res.setEncoding("utf8"); res.on("data", chunk => body += chunk);
      res.on("end", () => {
        if (res.statusCode === 307 && headers.RSC && depth < 3) {
          const next = new URL(res.headers.location, origin);
          assert.equal(next.origin, origin.origin); assert.equal(next.pathname, new URL(path, origin).pathname);
          resolve(get(origin, next.pathname + next.search, headers, method, depth + 1)); return;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on("error", reject); req.on("timeout", () => req.destroy(new Error("local timeout"))); req.end();
  });
  const path = "/admin/posts?post=review-private&version=1";
  const owner = await get(admin, path, { authorization });
  assert.equal(owner.status, 200, "owner can open saved private version");
  assert.match(owner.body, /PRIVATE-REVIEW-OLD/); assert.match(owner.body, /저장된 검증/);
  assert.match(owner.body, /&lt;script&gt;/); assert.doesNotMatch(owner.body, /<script>window\.__reviewExecuted/);
  assert.doesNotMatch(owner.body, /SECRET-RAW-ERROR|href="javascript:|src="https:\/\/example.com\/tracker/);
  assert.match(owner.headers["cache-control"], cachePolicy); assert.match(owner.headers["x-robots-tag"], /noindex/);
  assert.doesNotMatch(owner.body, /rel="canonical"/);
  for (const schema of owner.body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    assert.doesNotMatch(schema[1], /Article|PRIVATE-REVIEW/);
  }
  for (const headers of [{}, { authorization: "Basic invalid" }, { RSC: "1" }, { RSC: "1", "Next-Router-Prefetch": "1" }]) {
    const denied = await get(admin, path, headers); assert.equal(denied.status, 401); assert.doesNotMatch(denied.body, /PRIVATE-REVIEW/);
  }
  for (const headers of [{}, { authorization }, { authorization, RSC: "1" }]) {
    const denied = await get(publicOrigin, path, headers); assert.equal(denied.status, 404); assert.doesNotMatch(denied.body, /PRIVATE-REVIEW/);
  }
  assert.equal((await get(upstream, path, { authorization })).status, 403);
  assert.equal((await get(upstream, path, { authorization, "x-forwarded-host": admin.host })).status, 403);
  for (const extra of [{ RSC: "1" }, { RSC: "1", "Next-Router-Prefetch": "1" }]) {
    const rsc = await get(admin, path, { authorization, ...extra }); assert.equal(rsc.status, 200);
    assert.match(rsc.headers["cache-control"], cachePolicy);
    assert.match(rsc.headers["content-type"], /text\/x-component/);
    if (!extra["Next-Router-Prefetch"]) assert.match(rsc.body, /PRIVATE-REVIEW-OLD/);
  }
  assert.equal((await get(admin, path, { authorization }, "HEAD")).status, 200);
  assert.equal((await get(admin, path, {}, "HEAD")).status, 401);
  const newer = await get(admin, "/admin/posts?post=review-private", { authorization });
  assert.match(newer.body, /PRIVATE-REVIEW-CURRENT/); assert.doesNotMatch(newer.body, /PRIVATE-REVIEW-OLD/);
  assert.match((await get(admin, "/admin/posts?post=review-private&version=999", { authorization })).body, /찾을 수 없습니다/);
  assert.match((await get(admin, "/admin/posts?status=retracted", { authorization })).body, /해당하는 글이 없습니다/);
  assert.match((await get(admin, "/admin/posts?page=0", { authorization })).body, /조회 조건을 확인/);
  for (const p of ["/blog/review-private", "/blog/review-private.md"]) assert.equal((await get(publicOrigin, p)).status, 404);
  for (const p of ["/", "/blog", "/api/search?q=PRIVATE-REVIEW", "/sitemap.xml", "/feed.xml", "/llms.txt", "/llms-full.txt"]) {
    const page = await get(publicOrigin, p); assert.equal(page.status, 200, p); assert.doesNotMatch(page.body, /PRIVATE-REVIEW|\/admin\/posts/);
  }
});
