import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const enabled = process.env.HLOG_BRAIN_HTTP_TEST === "1";
const origin = process.env.HLOG_BRAIN_OWNER_ORIGIN;
const key = process.env.HLOG_BRAIN_OWNER_KEY;

test("owner HTTP capture keeps originals private and publishes only confirmed snapshots", { skip: !enabled && "requires an isolated local preview and HLOG_BRAIN_HTTP_TEST=1" }, async () => {
  assert(origin && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname), "Use an isolated loopback preview");
  assert.match(key ?? "", /^[a-f0-9]{64}$/);
  const authorization = `Basic ${Buffer.from(`owner:${key}`).toString("base64")}`;
  const headers = { authorization, origin, "content-type": "application/json" };
  const api = `${origin}/admin/brain/records`;
  const post = command => fetch(api, { method: "POST", headers, body: JSON.stringify(command) });
  const marker = randomUUID();
  const draft = {
    title: `HTTP_PRIVATE_TITLE_${marker}`, originalText: `HTTP_PRIVATE_ORIGINAL_${marker}`,
    publicTitle: `HTTP 공개 메모 ${marker}`, publicSummary: "공개용 사본만 확인한다", publicBody: `HTTP_PUBLIC_COPY_${marker}`,
    kind: "question", topic: "reliability", basis: "question", tags: ["검증"],
  };
  assert.equal((await fetch(`${origin}/admin/brain`, { headers: { authorization } })).status, 200);
  for (const path of ["/admin/brain", "/admin/brain?_rsc=test", "/admin/brain/records"]) {
    const denied = await fetch(`${origin}${path}`);
    assert.equal(denied.status, 401);
    assert.match(denied.headers.get("cache-control"), /no-store/);
  }
  const crossSite = await fetch(api, { method: "POST", headers: { ...headers, origin: "https://untrusted.example" }, body: "{}" });
  assert.equal(crossSite.status, 403);
  const saved = await post({ action: "save", revision: 0, draft });
  assert.equal(saved.status, 200);
  const { id } = await saved.json();
  assert.equal((await fetch(`${origin}/brain/${id}`)).status, 404);
  assert.equal((await post({ action: "publish", id, revision: 1, confirmed: false })).status, 400);
  assert.equal((await post({ action: "publish", id, revision: 1, confirmed: true })).status, 200);
  try {
    const detail = await fetch(`${origin}/brain/${id}`);
    assert.equal(detail.status, 200);
    const body = await detail.text();
    assert(body.includes(draft.publicBody));
    assert(!body.includes(draft.originalText) && !body.includes(draft.title));
    const graph = await (await fetch(`${origin}/brain`)).text();
    assert(graph.includes(id) && !graph.includes(draft.originalText) && !graph.includes(draft.title));
    assert((await (await fetch(`${origin}/sitemap.xml`)).text()).includes(`/brain/${id}`));
    assert.equal((await post({ action: "save", id, revision: 1, draft: { ...draft, originalText: `HTTP_PRIVATE_EDIT_${marker}`, publicBody: "아직 공개하지 않은 수정" } })).status, 200);
    assert((await (await fetch(`${origin}/brain/${id}`)).text()).includes(draft.publicBody));
    assert.equal((await post({ action: "save", id, revision: 1, draft })).status, 409);
    const owner = await fetch(`${api}?id=${id}`, { headers: { authorization } });
    assert.match(owner.headers.get("cache-control"), /no-store/);
    const { note } = await owner.json();
    assert.equal(note.history.length, 2);
    assert.equal(note.history[1].draft.originalText, draft.originalText);
    assert.equal(note.publishedRevision, 1);
  } finally {
    const { note } = await (await fetch(`${api}?id=${id}`, { headers: { authorization } })).json();
    assert.equal((await post({ action: "unpublish", id, revision: note.revision })).status, 200);
  }
  assert.equal((await fetch(`${origin}/brain/${id}`)).status, 404);
  assert(!(await (await fetch(`${origin}/brain`)).text()).includes(id));
  const sitemap = await fetch(`${origin}/sitemap.xml`);
  assert.match(sitemap.headers.get("cache-control"), /no-store/);
  assert(!(await sitemap.text()).includes(`/brain/${id}`));
});
