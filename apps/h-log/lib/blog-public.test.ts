import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import {
  getPublicBlogIndex,
  getPublicBlogPostBySlug,
  getPublicBlogPostMarkdown,
  type BlogContentStore,
} from "./blog-public.ts";

const baseTimestamp = "2026-06-25T00:00:00.000Z";

function createPost(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    articleMode: "document_analysis",
    createdAt: baseTimestamp,
    currentVersionId: "version-public-one",
    description: "Public blog route contract",
    id: "post-public-one",
    publishedAt: "2026-06-25T09:00:00.000Z",
    retractedAt: null,
    slug: "public-one",
    status: "published",
    title: "Public One",
    unpublishedAt: null,
    updatedAt: baseTimestamp,
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<PostVersionRecord> & {
    contentMarkdown?: string;
  } = {},
): PostVersionRecord {
  const { contentMarkdown = "# Public One\n\nPublished body.\n", ...recordOverrides } =
    overrides;
  const content = createPostVersionContentFromMarkdown(contentMarkdown);

  return {
    ...content,
    createdAt: baseTimestamp,
    createdBy: "admin",
    description: "Public blog route contract",
    id: "version-public-one",
    personaVersionId: null,
    postId: "post-public-one",
    researchPackId: null,
    title: "Public One",
    versionNo: 1,
    ...recordOverrides,
  };
}

function createSource(overrides: Partial<PostSourceRecord> = {}): PostSourceRecord {
  return {
    fetchedAt: baseTimestamp,
    id: "source-public-one",
    postId: "post-public-one",
    publisher: "Next.js",
    researchPackId: null,
    snapshotHash: "source-hash",
    sourceRole: "official",
    summary: "App Router reference",
    title: "Next.js App Router",
    url: "https://nextjs.org/docs/app",
    ...overrides,
  };
}

function createTag(postId: string, tag: string): PostTagRecord {
  return {
    createdAt: baseTimestamp,
    id: `${postId}-${tag}`,
    postId,
    tag,
  };
}

function createStore(): BlogContentStore {
  return {
    posts: [
      createPost(),
      createPost({
        currentVersionId: "version-public-two",
        description: "Newer public post",
        id: "post-public-two",
        publishedAt: "2026-06-26T09:00:00.000Z",
        slug: "public-two",
        title: "Public Two",
      }),
      createPost({
        currentVersionId: "version-preview",
        id: "post-preview",
        publishedAt: null,
        slug: "preview-one",
        status: "ready_to_publish",
        title: "Preview One",
      }),
    ],
    sources: [
      createSource(),
      createSource({
        id: "source-public-two",
        postId: "post-public-two",
        title: "PostgreSQL documentation",
        url: "https://www.postgresql.org/docs/",
      }),
    ],
    tags: [
      createTag("post-public-one", "DB"),
      createTag("post-public-one", "운영"),
      createTag("post-public-two", "DB"),
      createTag("post-preview", "비공개"),
    ],
    versions: [
      createVersion(),
      createVersion({
        contentMarkdown: "# Public Two\n\nNewer body.\n",
        id: "version-public-two",
        postId: "post-public-two",
        title: "Public Two",
      }),
      createVersion({
        contentMarkdown: "# Preview One\n\nHidden body.\n",
        id: "version-preview",
        postId: "post-preview",
        title: "Preview One",
      }),
    ],
  };
}

describe("DB-backed public blog routes", () => {
  it("builds public detail and markdown output without exposing preview posts", () => {
    const store = createStore();
    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.equal(detail.href, "/blog/public-one");
    assert.equal(detail.markdownHref, "/blog/public-one.md");
    assert.deepEqual(detail.tags, ["DB", "운영"]);
    assert.equal(detail.sourceLinks[0]?.url, "https://nextjs.org/docs/app");
    assert.match(detail.contentHtml, /<h1>Public One<\/h1>/);
    assert.equal(getPublicBlogPostBySlug("preview-one", store), undefined);
    assert.equal(getPublicBlogPostMarkdown("public-one", store), "# Public One\n\nPublished body.\n");
    assert.equal(getPublicBlogPostMarkdown("preview-one", store), undefined);
  });

  it("builds tag counts and pagination from published posts only", () => {
    const store = createStore();
    const index = getPublicBlogIndex(store, { page: 1, pageSize: 1 });

    assert.deepEqual(
      index.posts.map((post) => post.slug),
      ["public-two"],
    );
    assert.deepEqual(index.tagCounts, [
      { count: 2, tag: "DB" },
      { count: 1, tag: "운영" },
    ]);
    assert.deepEqual(index.pagination, {
      currentPage: 1,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
    });

    const secondDbPage = getPublicBlogIndex(store, {
      page: 2,
      pageSize: 1,
      tag: "DB",
    });

    assert.deepEqual(
      secondDbPage.posts.map((post) => post.slug),
      ["public-one"],
    );
    assert.equal(
      secondDbPage.tagCounts.some((tagCount) => tagCount.tag === "비공개"),
      false,
    );
  });
});
