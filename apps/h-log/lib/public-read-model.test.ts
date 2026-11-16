import assert from "node:assert/strict";
import test from "node:test";
import { createPostVersionContentFromMarkdown } from "./blog-content-model.ts";
import { getPublicBlogIndex, getPublicBlogPostBySlug, type BlogContentStore } from "./blog-public.ts";
import { toPublicBrainNode } from "./brain-capture.ts";
import { canonicalJson, fingerprint, projectBlog, projectBrain, projectionContext } from "./public-read-model.ts";

const date = "2026-11-16T00:00:00.000Z";
function fixture(): BlogContentStore {
  return {
    posts: [{ id: "post-a", slug: "post-a", title: "조회 계약", description: "원본 보존", articleMode: "document_analysis", status: "published", currentVersionId: "version-a", publishedAt: date, createdAt: date, updatedAt: date, unpublishedAt: null, retractedAt: null }],
    versions: [{ ...createPostVersionContentFromMarkdown("## 기준\n\n원본을 보존합니다.\n\n## 기준\n\n같은 제목도 구분합니다."), id: "version-a", postId: "post-a", versionNo: 1, title: "조회 계약", description: "원본 보존", createdBy: "admin", createdAt: date, personaVersionId: null, researchPackId: null }],
    tags: [{ id: "tag-a", postId: "post-a", tag: "nextjs", createdAt: date }], sources: [], assets: [],
  };
}
test("Blog projection preserves list, blocks and anchors without storing original bodies", () => {
  const store = fixture(), before = structuredClone(store), context = projectionContext();
  const result = projectBlog(store, context);
  assert.equal(result.result, "ready");
  assert.equal(result.sourceVersion, "version-a");
  assert.deepEqual(result.payload?.list, getPublicBlogIndex(store).posts[0]);
  const detail = getPublicBlogPostBySlug("post-a", store)!;
  assert.deepEqual(result.payload?.detail.contentBlocks, detail.contentBlocks);
  assert.deepEqual(result.payload?.detail.tableOfContents, detail.tableOfContents);
  assert(!("markdown" in result.payload!.detail));
  assert(!("contentHtml" in result.payload!.detail));
  assert.deepEqual(store, before);
  assert.deepEqual(projectBlog(structuredClone(store), context), result);
  const changed = fixture(); changed.tags[0].tag = "postgres";
  assert.equal(changed.versions[0].contentHash, store.versions[0].contentHash);
  assert.notEqual(projectBlog(changed, context).inputFingerprint, result.inputFingerprint);
});
test("private selection and current privacy policy exclude payloads; corrupt original fails", () => {
  const store = fixture(); store.posts[0].status = "retracted";
  assert.equal(projectBlog(store, projectionContext()).payload, null);
  store.posts[0].status = "published";
  const policy = { restrictedTerms: [{ category: "organization_name" as const, value: "조회 계약" }] };
  assert.equal(projectBlog(store, projectionContext(policy)).result, "excluded");
  assert.notEqual(projectionContext(policy).policyFingerprint, projectionContext().policyFingerprint);
  store.versions[0].contentHtml += "corrupt";
  assert.throws(() => projectBlog(store, projectionContext()), /hash/i);
  store.versions[0].contentMarkdown = "x".repeat(1024 * 1024);
  assert.throws(() => projectBlog(store, projectionContext()), /input_limit/);
});
test("Brain projects only the reviewed snapshot and preserves outgoing references", () => {
  const node = toPublicBrainNode({ title: "PRIVATE_TITLE", originalText: "PRIVATE_BODY", publicTitle: "공개 기록", publicSummary: "공개 요약", publicBody: "공개 문단", kind: "learning", topic: "data", basis: "implementation", tags: [], links: [{ target: "other", relation: "supports", reason: "확인할 연결" }] }, "note-a", date);
  const result = projectBrain(node, 1, projectionContext());
  assert.equal(result.result, "ready");
  assert.equal(result.payload?.node.title, "공개 기록");
  assert.equal(result.payload?.links[0].target, "other");
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_/);
  assert.equal(projectBrain(null, null, projectionContext()).payload, null);
  assert.equal(projectBrain(node, 1, projectionContext({ restrictedTerms: [{ category: "organization_name", value: "공개 기록" }] })).result, "excluded");
});
test("fingerprints use canonical object order, preserve strings and version the context", () => {
  assert.equal(canonicalJson({ b: undefined, a: [" raw ", null] }), '{"a":[" raw ",null],"b":null}');
  assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }));
  assert.equal(canonicalJson({ "\u{10000}": 1, "\ue000": 2 }), '{"\ue000":2,"\u{10000}":1}');
  assert.notEqual(fingerprint(" raw "), fingerprint("raw"));
  assert.notEqual(projectionContext({}, { renderer: 2 }).manifestHash, projectionContext().manifestHash);
});
