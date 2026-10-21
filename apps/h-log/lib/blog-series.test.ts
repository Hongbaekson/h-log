import assert from "node:assert/strict";
import { it } from "node:test";
import { createPostVersionContentFromMarkdown, type PostRecord } from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import * as seriesModel from "./blog-series.ts";
const { getPublicBlogSeries } = seriesModel;

const slugs = ["home-recent-posts", "published-current-read-boundary", "verification-and-revision-dates"];
const stamp = "2026-10-21T00:00:00.000Z";

function makeStore(): BlogContentStore {
  return {
    posts: slugs.map((slug, i) => ({
      id: slug, slug, title: "Old title", description: "Local test", status: "published",
      articleMode: "project_record", currentVersionId: `${slug}-v2`, createdAt: stamp,
      updatedAt: stamp, publishedAt: `2026-10-${23 - i}T00:00:00.000Z`,
      unpublishedAt: null, retractedAt: null,
    })),
    versions: slugs.map((slug) => ({
      id: `${slug}-v2`, postId: slug, versionNo: 2, title: `Current ${slug}`,
      description: "Local test", ...createPostVersionContentFromMarkdown("# Local test\n\nPublic text.\n"),
      createdAt: stamp, createdBy: "admin", personaVersionId: null, researchPackId: null,
    })),
    sources: [], tags: [],
  };
}

it("orders the selected series independently of dates and uses current titles and existing URLs without changing content", () => {
  const store = makeStore();
  store.posts = [...store.posts].reverse();
  const before = JSON.stringify(store);
  const [series] = getPublicBlogSeries(store);
  assert.equal(series.id, "h-log-public-reading");
  assert.equal(series.title, "H-Log에서 공개 글을 읽는 경계 만들기");
  assert.match(series.description, /홈의 조회 대기/);
  assert.deepEqual(series.posts.map(({ slug, href, title, order }) => ({ slug, href, title, order })),
    slugs.map((slug, i) => ({ slug, href: `/blog/${slug}`, title: `Current ${slug}`, order: i + 1 })));
  assert.equal(JSON.stringify(store), before);
});

it("navigates within the visible series, skips withdrawn members and has no neighbour beyond either end", () => {
  const store = makeStore();
  const first = seriesModel.getPublicBlogPostSeries(slugs[0], store)!;
  assert.equal(first.previous, null);
  assert.equal(first.next?.slug, slugs[1]);
  const middle = seriesModel.getPublicBlogPostSeries(slugs[1], store)!;
  assert.equal(middle.previous?.slug, slugs[0]);
  assert.equal(middle.next?.slug, slugs[2]);
  assert.equal(seriesModel.getPublicBlogPostSeries(slugs[2], store)!.next, null);
  store.posts = store.posts.map((post, i) => i === 1 ? { ...post, status: "retracted" } : post);
  const filtered = seriesModel.getPublicBlogPostSeries(slugs[0], store)!;
  assert.deepEqual(filtered.posts.map(({ order }) => order), [1, 3]);
  assert.equal(filtered.next?.slug, slugs[2]);
  assert.equal(seriesModel.getPublicBlogPostSeries(slugs[1], store), undefined);
  assert.doesNotMatch(JSON.stringify(filtered), /published-current-read-boundary/);
  store.posts = store.posts.slice(0, 1);
  const single = seriesModel.getPublicBlogPostSeries(slugs[0], store)!;
  assert.equal(single.previous, null);
  assert.equal(single.next, null);
});

it("omits private, missing, wrong-owner and privacy-blocked versions and hides a fully withdrawn series", () => {
  const statuses: PostRecord["status"][] = ["drafted", "ready_to_publish", "unpublished", "retracted", "failed_verification"];
  for (const status of statuses) {
    const store = makeStore();
    store.posts = store.posts.map((post) => ({ ...post, status }));
    assert.deepEqual(getPublicBlogSeries(store), [], status);
  }
  for (const currentVersionId of [null, "missing"]) {
    const store = makeStore();
    store.posts = store.posts.map((post) => ({ ...post, currentVersionId }));
    assert.deepEqual(getPublicBlogSeries(store), []);
  }
  for (const change of [{ postId: "wrong-owner" }, { contentMarkdown: "private.person@example.com" }]) {
    const store = makeStore();
    store.versions = store.versions.map((version) => ({ ...version, ...change }));
    assert.deepEqual(getPublicBlogSeries(store), []);
  }
  const store = makeStore();
  store.versions = [...store.versions, { ...store.versions[0], id: "old-private", title: "PRIVATE_TITLE_SENTINEL" }];
  assert.doesNotMatch(JSON.stringify(getPublicBlogSeries(store)), /PRIVATE_TITLE_SENTINEL/);
  assert.equal(seriesModel.getPublicBlogPostSeries("unrelated-post", store), undefined);
  assert.deepEqual(getPublicBlogSeries({ ...store, posts: [] }), []);
});
