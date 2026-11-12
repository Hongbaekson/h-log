import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const enabled = process.env.HLOG_BRAIN_HTTP_TEST === "1";
const origin = process.env.HLOG_ADMIN_ORIGIN;
const key = process.env.HLOG_ADMIN_OWNER_KEY;
const publicOrigin = process.env.HLOG_BRAIN_HTTP_PUBLIC_ORIGIN ?? origin;

test("owner HTTP capture keeps originals private and publishes only confirmed snapshots", { skip: !enabled && "requires an isolated local preview and HLOG_BRAIN_HTTP_TEST=1" }, async () => {
  assert(origin && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname), "Use an isolated loopback preview");
  assert(publicOrigin && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(publicOrigin).hostname), "Use an isolated loopback public preview");
  assert.match(key ?? "", /^[a-f0-9]{64}$/);
  const authorization = `Basic ${Buffer.from(`owner:${key}`).toString("base64")}`;
  const headers = { authorization, origin, "content-type": "application/json" };
  const api = `${origin}/admin/brain/records`;
  const post = command => fetch(api, { method: "POST", headers, body: JSON.stringify(command) });
  const meta = commandRevision => ({ commandId: randomUUID(), commandRevision });
  const marker = randomUUID();
  const draft = {
    title: `HTTP_PRIVATE_TITLE_${marker}`, originalText: `HTTP_PRIVATE_ORIGINAL_${marker}`,
    publicTitle: `HTTP 공개 메모 ${marker}`, publicSummary: "공개용 사본만 확인한다", publicBody: `HTTP_PUBLIC_COPY_${marker}`,
    kind: "question", topic: "reliability", basis: "question", tags: ["검증"],
    sources: [{ label: ` HTTP_SOURCE_${marker} `, href: " https://example.com/reference " }],
    questions: [` HTTP_QUESTION_${marker} `],
  };
  const ownerPage = await fetch(`${origin}/admin/brain`, { headers: { authorization } });
  assert.equal(ownerPage.status, 200);
  assert((await ownerPage.text()).includes(`href="${process.env.HLOG_PUBLIC_BASE_URL || publicOrigin}/brain"`), "Public Brain links use the public origin, not the restricted admin host");
  for (const path of ["/admin/brain", "/admin/brain?_rsc=test", "/admin/brain/records"]) {
    const denied = await fetch(`${origin}${path}`);
    assert.equal(denied.status, 401);
    assert.match(denied.headers.get("cache-control"), /no-store/);
  }
  const crossSite = await fetch(api, { method: "POST", headers: { ...headers, origin: "https://untrusted.example" }, body: "{}" });
  assert.equal(crossSite.status, 403);
  assert.equal((await post({ action: "save", revision: 0, draft })).status, 400);
  const initialCommand = { action: "save", revision: 0, draft, ...meta(0) };
  const saved = await post(initialCommand);
  assert.equal(saved.status, 200);
  const receipt = await saved.json();
  const { id } = receipt;
  const pending = { ...draft, originalText: `HTTP_PRIVATE_EDIT_${marker}`, publicBody: `HTTP_PENDING_BODY_${marker}`,
    sources: [{ label: `HTTP_PENDING_SOURCE_${marker}`, href: "/resume" }], questions: [`HTTP_PENDING_QUESTION_${marker}`] };
  const publicFields = value => [value.publicBody, value.sources[0].label.trim(), value.questions[0].trim()];
  async function checkPublic(published, selected, hidden) {
    for (const path of ["/brain", `/brain/${id}`, "/sitemap.xml"]) {
      for (const rsc of path === "/sitemap.xml" ? [false] : [false, true]) {
        const response = await fetch(`${publicOrigin}${path}${rsc ? `?_rsc=${marker}` : ""}`, { headers: rsc ? { RSC: "1" } : {} });
        const missingDetail = !published && path === `/brain/${id}`;
        // Next may send notFound in an already-started RSC stream with HTTP 200.
        if (missingDetail && rsc) assert([200, 404].includes(response.status));
        else assert.equal(response.status, missingDetail ? 404 : 200);
        assert.match(response.headers.get("cache-control"), /no-store/);
        if (rsc) assert.match(response.headers.get("content-type"), /text\/x-component/);
        const body = await response.text();
        if (missingDetail && rsc) assert(body.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
        for (const value of [draft.title, draft.originalText, pending.originalText, ...hidden]) assert(!body.includes(value), `${path}: private/unselected value leaked`);
        if (published) {
          assert(body.includes(id));
          if (path !== "/sitemap.xml") for (const value of selected) assert(body.includes(value), `${path}: selected value missing`);
        } else if (path !== `/brain/${id}`) assert(!body.includes(id));
      }
    }
  }
  assert.deepEqual(await (await post(initialCommand)).json(), receipt);
  assert.equal((await post({ ...initialCommand, draft: { ...draft, title: "different input" } })).status, 409);
  assert.equal((await fetch(`${publicOrigin}/brain/${id}`)).status, 404);
  await checkPublic(false, [], publicFields(draft));
  assert.equal((await post({ action: "publish", id, revision: 1, confirmed: false, ...meta(1) })).status, 400);
  assert.equal((await post({ action: "publish", id, revision: 1, confirmed: true, ...meta(1) })).status, 200);
  try {
    await checkPublic(true, publicFields(draft), publicFields(pending));
    const detail = await fetch(`${publicOrigin}/brain/${id}`);
    assert.equal(detail.status, 200);
    const body = await detail.text();
    assert(body.includes(draft.publicBody));
    assert(!body.includes(draft.originalText) && !body.includes(draft.title));
    const graph = await (await fetch(`${publicOrigin}/brain`)).text();
    assert(graph.includes(id) && !graph.includes(draft.originalText) && !graph.includes(draft.title));
    assert((await (await fetch(`${publicOrigin}/sitemap.xml`)).text()).includes(`/brain/${id}`));
    assert.equal((await post({ action: "save", id, revision: 1, ...meta(2), draft: pending })).status, 200);
    await checkPublic(true, publicFields(draft), publicFields(pending));
    assert((await (await fetch(`${publicOrigin}/brain/${id}`)).text()).includes(draft.publicBody));
    assert.equal((await post({ action: "save", id, revision: 1, draft, ...meta(2) })).status, 409);
    const owner = await fetch(`${api}?id=${id}`, { headers: { authorization } });
    assert.match(owner.headers.get("cache-control"), /no-store/);
    const { note } = await owner.json();
    assert.equal(note.commandRevision, 3);
    assert.deepEqual(note.actions.map(action => action.action), ["save", "publish", "save"]);
    assert.equal((await post({ action: "unpublish", id, revision: 2, ...meta(2) })).status, 409);
    assert.deepEqual(await (await post(initialCommand)).json(), receipt);
    assert.equal(note.history.length, 2);
    assert.equal(note.history[1].draft.originalText, draft.originalText);
    assert.equal(note.publishedRevision, 1);
    assert.deepEqual(note.draft.sources, pending.sources); assert.deepEqual(note.draft.questions, pending.questions);
    assert.deepEqual(note.history[1].draft.sources, draft.sources); assert.deepEqual(note.history[1].draft.questions, draft.questions);
    assert.equal((await post({ action: "publish", id, revision: 2, confirmed: true, ...meta(3) })).status, 200);
    await checkPublic(true, publicFields(pending), publicFields(draft));
    const risky = { ...pending, sources: [{ label: "someone@example.com" }], questions: [`HTTP_BLOCKED_QUESTION_${marker}`] };
    assert.equal((await post({ action: "save", id, revision: 2, draft: risky, ...meta(4) })).status, 200);
    const blocked = await post({ action: "publish", id, revision: 3, confirmed: true, ...meta(5) });
    assert.equal(blocked.status, 422); assert.deepEqual(await blocked.json(), { error: "public_copy_blocked" });
    await checkPublic(true, publicFields(pending), [...publicFields(draft), risky.questions[0], risky.sources[0].label]);
    const reviewMemo = `HTTP_PRIVATE_REVIEW_${marker}`;
    const reviewCommand = { action: "review", id, revision: 3, ...meta(5), review: { result: "confirmed", memo: reviewMemo } };
    const reviewResponse = await post(reviewCommand);
    assert.equal(reviewResponse.status, 200);
    const reviewReceipt = await reviewResponse.json();
    assert.deepEqual(await (await post(reviewCommand)).json(), reviewReceipt);
    const { note: reviewed } = await (await fetch(`${api}?id=${id}`, { headers: { authorization } })).json();
    assert.equal(reviewed.review.status, "confirmed"); assert.equal(reviewed.review.history.length, 1);
    assert.equal(reviewed.publishedRevision, 2); assert.equal(reviewed.revision, 3);
    await checkPublic(true, publicFields(pending), [...publicFields(draft), risky.questions[0], risky.sources[0].label, reviewMemo, '"checkedAt"', '"review"']);
    const queue = await fetch(`${api}?view=review&status=confirmed`, { headers: { authorization } });
    assert.equal(queue.status, 200); assert.match(queue.headers.get("cache-control"), /no-store/);
    const listed = await queue.json();
    assert(listed.notes.some(item => item.id === id)); assert(!JSON.stringify(listed).includes(reviewMemo));
  } finally {
    const { note } = await (await fetch(`${api}?id=${id}`, { headers: { authorization } })).json();
    assert.equal((await post({ action: "unpublish", id, revision: note.revision, ...meta(note.commandRevision) })).status, 200);
  }
  assert.equal((await fetch(`${publicOrigin}/brain/${id}`)).status, 404);
  await checkPublic(false, [], [...publicFields(draft), ...publicFields(pending)]);
  assert(!(await (await fetch(`${publicOrigin}/brain`)).text()).includes(id));
  const sitemap = await fetch(`${publicOrigin}/sitemap.xml`);
  assert.match(sitemap.headers.get("cache-control"), /no-store/);
  assert(!(await sitemap.text()).includes(`/brain/${id}`));
});
