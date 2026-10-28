import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import test from "node:test";

const enabled = process.env.HLOG_ADMIN_HTTP_TEST === "1";

test("shared admin HTML, API and RSC stay behind the owner boundary on two local origins", { skip: !enabled && "requires isolated loopback ingress and HLOG_ADMIN_HTTP_TEST=1" }, async (t) => {
  const admin = new URL(process.env.HLOG_ADMIN_ORIGIN);
  const publicOrigin = new URL(process.env.HLOG_ADMIN_HTTP_PUBLIC_ORIGIN);
  const upstream = new URL(process.env.HLOG_ADMIN_HTTP_UPSTREAM);
  for (const url of [admin, publicOrigin, upstream]) {
    assert(["http:", "https:"].includes(url.protocol));
    assert(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Use isolated loopback origins");
  }
  assert.notEqual(admin.origin, publicOrigin.origin);
  const key = process.env.HLOG_ADMIN_OWNER_KEY;
  assert.match(key ?? "", /^[a-f0-9]{64}$/);
  const authorization = `Basic ${Buffer.from(`owner:${key}`).toString("base64")}`;
  const get = (origin, path, headers = {}, method = "GET", redirects = 0) => new Promise((resolve, reject) => {
    const req = (origin.protocol === "https:" ? https : http).request(new URL(path, origin), { headers, method, timeout: 30000 }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        // Patched Next.js canonicalizes the RSC cache key before serving a payload.
        if (res.statusCode === 307 && headers.RSC && redirects < 2) {
          const next = new URL(res.headers.location, origin);
          if (next.origin !== origin.origin || next.pathname !== new URL(path, origin).pathname || !next.searchParams.has("_rsc")) {
            reject(new Error("Unexpected RSC redirect")); return;
          }
          resolve(get(origin, next.pathname + next.search, headers, method, redirects + 1)); return;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`local request timed out: ${method} ${origin.origin}${path}, Host=${headers.host ?? origin.host}`)));
    req.end();
  });
  for (const path of ["/admin", "/admin/brain", "/admin/brain/records", "/admin/posts", "/admin/automation", "/admin/jobs", "/admin/jobs/retry", "/admin/jobs?_rsc=boundary", "/admin/audit", "/admin/audit?_rsc=boundary", "/admin/automation?_rsc=boundary", "/admin/automation/requests", "/admin/automation/policy", "/admin/brain?_rsc=boundary", "/admin/lab/queue", "/admin/lab/queue?_rsc=boundary", "/admin/resume", "/admin/resume?_rsc=boundary", "/admin/resume/records", "/admin/resume/files", "/admin/resume/preview/11111111-1111-4111-8111-111111111111/1"]) {
    for (const headers of [{}, { authorization }]) {
      const denied = await get(publicOrigin, path, headers);
      assert.equal(denied.status, 404, `public ${path}`);
      assert.doesNotMatch(denied.body, /관리자 개요|나만 보는 기록|가상 작업 6개/);
    }
    const denied = await get(admin, path, { RSC: "1", "Next-Router-Prefetch": "1" });
    assert.equal(denied.status, 401, `anonymous ${path}`);
    assert.match(denied.headers["cache-control"], /no-store/);
    assert.match(denied.headers["www-authenticate"], /H-Log admin/);
    assert.doesNotMatch(denied.body, /관리자 개요|나만 보는 기록|가상 작업 6개/);
  }
  assert.equal((await get(admin, "/admin", { authorization: "Basic invalid" })).status, 401);
  const overview = await get(admin, "/admin", { authorization });
  assert.equal(overview.status, 200);
  assert.match(overview.body, /관리자 개요/);
  assert.doesNotMatch(overview.body, /class="site-header|class="site-footer/);
  assert.match(overview.headers["cache-control"], /private.*no-store/);
  assert.match(overview.headers["x-robots-tag"], /noindex/);
  assert.equal(overview.headers["x-frame-options"], "DENY");
  for (const path of ["/admin/jobs", "/admin/audit"]) {
    for (const headers of [{ authorization }, { authorization, RSC: "1", "Next-Router-Prefetch": "1" }]) {
      const page = await get(admin, path, headers);
      assert.equal(page.status, 200);
      assert.match(page.headers["cache-control"], /private.*no-store/);
      assert.match(page.headers["x-robots-tag"], /noindex/);
      assert.doesNotMatch(page.body, /SECRET-|internal\/path/);
    }
  }
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
  await t.test("retired public Queue URLs return 404 without an admin redirect", async () => {
    for (const origin of [publicOrigin, admin, upstream]) {
      for (const headers of [{}, { authorization, host: admin.host }, { RSC: "1", "Next-Router-Prefetch": "1" }]) {
        const retired = await get(origin, "/lab/queue?from=bookmark", headers);
        assert.equal(retired.status, 404);
        assert.equal(retired.headers.location, undefined);
        assert.doesNotMatch(retired.body, /Queue와 DLQ 재생 실험|가상 작업 6개|\/admin\/lab/);
      }
      assert.equal((await get(origin, "/lab/queue", {}, "HEAD")).status, 404);
    }
  });
  await t.test("public discovery and project pages exclude the private lab", async () => {
    for (const path of ["/sitemap.xml", "/portfolio/redisson-async-processing-recovery", "/", "/resume", "/portfolio", "/blog", "/feed.xml", "/llms.txt", "/llms-full.txt", "/api/search?q=Queue"]) {
      const page = await get(publicOrigin, path);
      assert.equal(page.status, 200, path);
      assert.doesNotMatch(page.body, /\/admin(?:\/|["\\?])|\/lab\/queue|Queue와 DLQ 재생 실험|가상 작업 6개/, path);
    }
    const projectRsc = await get(publicOrigin, "/portfolio/redisson-async-processing-recovery?_rsc=public", { RSC: "1" });
    assert.equal(projectRsc.status, 200);
    assert.doesNotMatch(projectRsc.body, /\/admin\/|\/lab\/queue|Queue와 DLQ 재생 실험/);
  });
  await t.test("owner lab keeps replay private and links to the public project origin", async () => {
    const path = "/admin/lab/queue";
    for (const method of ["GET", "HEAD"]) assert.equal((await get(admin, path, {}, method)).status, 401);
    assert.equal((await get(admin, path, { authorization: "Basic invalid" })).status, 401);
    const lab = await get(admin, path, { authorization });
    assert.equal(lab.status, 200);
    assert.match(lab.headers["cache-control"], /private.*no-store/);
    assert.match(lab.headers["x-robots-tag"], /noindex/);
    assert.equal(lab.headers["referrer-policy"], "no-referrer");
    assert.match(lab.body, /가상 작업 6개|Queue 재생기/);
    assert.match(lab.body, /name="robots" content="noindex, nofollow"/);
    assert.doesNotMatch(lab.body, /class="site-header|class="site-footer|rel="canonical"/);
    assert(lab.body.includes(`href="${process.env.HLOG_PUBLIC_BASE_URL || publicOrigin.origin}/portfolio/redisson-async-processing-recovery"`));
    const rsc = await get(admin, path + "?_rsc=owner", { authorization, RSC: "1" });
    assert.equal(rsc.status, 200); assert.match(rsc.headers["content-type"], /text\/x-component/);
    assert.match(rsc.body, /Queue와 DLQ 재생 실험/);
    const prefetch = await get(admin, path + "?_rsc=prefetch", { authorization, RSC: "1", "Next-Router-Prefetch": "1" });
    assert.equal(prefetch.status, 200); assert.match(prefetch.headers["cache-control"], /private.*no-store/);
    const head = await get(admin, path, { authorization }, "HEAD");
    assert.equal(head.status, 200); assert.equal(head.body, "");
    assert(overview.body.includes('href="/admin/lab/queue"'));
    assert.equal((await get(upstream, path, { host: "public.example", authorization })).status, 403);
  });
  console.log("Owner/anonymous, public/admin origins, HTML/API/RSC, HEAD, Host/Origin and forwarded-header boundaries passed.");
});
