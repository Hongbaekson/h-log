import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { handleResumeDownload } from "./resume-pdf-download.ts";

const epoch = "11111111-1111-4111-8111-111111111111";
const env = { HLOG_RESUME_PDF_ENABLED: "1", HLOG_RESUME_PDF_PUBLICATION_EPOCH: epoch };
const file = (text: string) => ({ bytes: Buffer.from(text), byteSize: Buffer.byteLength(text), sha256: createHash("sha256").update(text).digest("hex") });
const request = (headers = {}, method = "GET", query = "", signal?: AbortSignal) => new Request(`http://localhost/api/resume/pdf${query}`, { headers, method, signal });

test("public PDF gates, conditionals and ranges always use the current approved snapshot", async () => {
  let current: ReturnType<typeof file> | null = file("synthetic A");
  const repo = () => ({ publicFile: async () => current, publicMetadata: async () => current });
  const get = (headers = {}, method = "GET") => handleResumeDownload(request(headers, method), repo, env);
  const first = await get();
  assert.equal(first.status, 200); assert.equal(await first.text(), "synthetic A");
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.match(first.headers.get("content-disposition")!, /filename="resume.pdf"; filename\*=UTF-8''%EC%9D%B4%EB%A0%A5%EC%84%9C.pdf/);
  const etag = first.headers.get("etag")!;
  const head = await get({}, "HEAD"); assert.equal(head.status, 200); assert.equal(await head.text(), "");
  assert.equal(head.headers.get("content-length"), "11");
  for (const match of [etag, `W/${etag}`, '"other", ' + etag, "*"]) assert.equal((await get({ "if-none-match": match })).status, 304);
  for (const match of ['"other"', `W/${etag}`]) assert.equal((await get({ "if-match": match, "if-none-match": etag })).status, 412);
  const range = await get({ range: "bytes=0-1", "if-range": etag, "if-match": "*" });
  assert.equal(range.status, 200); assert.equal(range.headers.get("accept-ranges"), "none"); assert.equal(await range.text(), "synthetic A");
  current = file("synthetic B");
  const changed = await get({ "if-none-match": etag }); assert.equal(changed.status, 200); assert.equal(await changed.text(), "synthetic B");
  current = null;
  for (const method of ["GET", "HEAD"]) {
    const hidden = await get({ "if-none-match": "*", "if-match": "*", range: "bytes=0-1" }, method);
    assert.equal(hidden.status, 404); assert.equal(hidden.headers.get("etag"), null);
    if (method === "HEAD") assert.equal(await hidden.text(), "");
  }
});

test("disabled publication and version queries cannot access storage; failures stay generic", async () => {
  const fail = () => { throw new Error("PRIVATE_STORAGE_ERROR"); };
  for (const settings of [{ ...env, HLOG_RESUME_PDF_ENABLED: "0" }, { ...env, HLOG_RESUME_PDF_PUBLICATION_EPOCH: undefined }, { ...env, HLOG_RESUME_PDF_PUBLICATION_EPOCH: "bad" }]) {
    assert.equal((await handleResumeDownload(request(), fail, settings)).status, 404);
  }
  assert.equal((await handleResumeDownload(request({}, "GET", "?id=old"), fail, env)).status, 404);
  assert.equal((await handleResumeDownload(request({}, "POST"), fail, env)).status, 405);
  const failed = await handleResumeDownload(request({ "if-none-match": "*" }), fail, env);
  assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), { error: "resume_unavailable" });
  assert.equal(failed.headers.get("cache-control"), "no-store");
});

test("four downloads hold slots until completion or cancellation and withdrawal still returns 404", async () => {
  let visible = true;
  const repo = () => ({ publicFile: async () => visible ? file("synthetic") : null, publicMetadata: async () => visible ? { sha256: "a".repeat(64), byteSize: 9 } : null });
  const active = await Promise.all(Array.from({ length: 4 }, () => handleResumeDownload(request(), repo, env)));
  assert(active.every(response => response.status === 200));
  const busy = await handleResumeDownload(request(), repo, env);
  assert.equal(busy.status, 429); assert.equal(busy.headers.get("retry-after"), "2");
  visible = false;
  assert.equal((await handleResumeDownload(request(), repo, env)).status, 404);
  await active[0].body!.cancel(); visible = true;
  const freed = await handleResumeDownload(request(), repo, env); assert.equal(freed.status, 200); await freed.text();
  await Promise.all(active.slice(1).map(response => response.body!.cancel()));
  const controller = new AbortController();
  const aborted = await handleResumeDownload(request({}, "GET", "", controller.signal), repo, env);
  controller.abort(); await assert.rejects(aborted.text());
  const final = await handleResumeDownload(request(), repo, env); assert.equal(final.status, 200); await final.text();
});

test("an unread response times out and releases every download slot", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const repo = () => ({ publicFile: async () => file("synthetic"), publicMetadata: async () => file("synthetic") });
  const active = await Promise.all(Array.from({ length: 4 }, () => handleResumeDownload(request(), repo, env)));
  context.mock.timers.tick(30000);
  for (const response of active) await assert.rejects(response.text(), /resume_unavailable/);
  const next = await handleResumeDownload(request(), repo, env); assert.equal(next.status, 200); await next.text();
});

test("a response already holding A can finish after withdrawal while a new request gets 404", async () => {
  let current: ReturnType<typeof file> | null = file("synthetic A");
  const repo = () => ({ publicFile: async () => current, publicMetadata: async () => current });
  const inFlight = await handleResumeDownload(request(), repo, env);
  current = null;
  assert.equal((await handleResumeDownload(request(), repo, env)).status, 404);
  assert.equal(await inFlight.text(), "synthetic A");
});
