import assert from "node:assert/strict";
import test from "node:test";

test("owner operations pages render safe read-only HTML and RSC with bounded filters", { skip: process.env.HLOG_ADMIN_HTTP_TEST !== "1" && "requires isolated loopback server" }, async () => {
  const origin = new URL(process.env.HLOG_ADMIN_ORIGIN);
  assert(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname));
  const key = process.env.HLOG_ADMIN_OWNER_KEY;
  assert.match(key ?? "", /^[a-f0-9]{64}$/);
  const authorization = `Basic ${Buffer.from(`owner:${key}`).toString("base64")}`;
  for (const [path, title] of [["/admin/jobs", "작업 원장"], ["/admin/audit", "변경 이력"]]) {
    const blocked = await fetch(new URL(path, origin));
    assert.equal(blocked.status, 401);
    const response = await fetch(new URL(path, origin), { headers: { authorization } });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert(html.includes(title));
    assert(!html.includes("작업을 불러오지 못했습니다"));
    assert(!html.includes("이력을 불러오지 못했습니다"));
    assert.doesNotMatch(html, /SECRET-|internal\/path|method="post"/i);
    const rsc = await fetch(new URL(path + "?_rsc=inspection", origin), { headers: { authorization, RSC: "1" } });
    assert.equal(rsc.status, 200);
    assert.doesNotMatch(await rsc.text(), /SECRET-|internal\/path/);
    const invalid = await fetch(new URL(path + "?page=10001", origin), { headers: { authorization } });
    assert((await invalid.text()).includes("조회 조건을 확인해 주세요"));
    const page2 = await fetch(new URL(path + "?page=2", origin), { headers: { authorization } });
    assert((await page2.text()).includes("이전 페이지"));
  }
});
