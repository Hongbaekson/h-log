import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BLOG_CONTENT_MODEL_TABLES,
  assertPostVersionContentHashMatches,
  assertBlogPostStatusTransition,
  blogPostStatuses,
  canTransitionBlogPostStatus,
  createPostVersionContentFromMarkdown,
  createPostVersionContentHash,
  isCurrentPublishedVersion,
  renderCrawlerMarkdownForPostVersion,
  requiredPublishJobTypes,
  retryablePublishJobTypes,
  selectPublicBlogRouteEntries,
  selectPublicBlogRouteEntryBySlug,
  type PostRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";

const baseTimestamp = "2026-06-25T00:00:00.000Z";

function createPost(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    articleMode: "document_analysis",
    createdAt: baseTimestamp,
    currentVersionId: "version-1",
    description: "Manual publishing contract",
    id: "post-1",
    publishedAt: baseTimestamp,
    retractedAt: null,
    slug: "db-first-blog",
    status: "published",
    title: "DB first blog",
    unpublishedAt: null,
    updatedAt: baseTimestamp,
    ...overrides,
  };
}

function createVersion(overrides: Partial<PostVersionRecord> = {}): PostVersionRecord {
  const content = {
    contentHtml: "<h1>DB first blog</h1>",
    contentMarkdown: "# DB first blog\n",
  };

  return {
    contentHash: createPostVersionContentHash(content),
    ...content,
    createdAt: baseTimestamp,
    createdBy: "admin",
    description: "Manual publishing contract",
    id: "version-1",
    personaVersionId: null,
    postId: "post-1",
    researchPackId: null,
    title: "DB first blog",
    versionNo: 1,
    ...overrides,
  };
}

describe("blog DB content model contract", () => {
  it("keeps post metadata separate from versioned content fields", () => {
    const postFields: readonly string[] = BLOG_CONTENT_MODEL_TABLES.posts;
    const versionFields: readonly string[] = BLOG_CONTENT_MODEL_TABLES.post_versions;

    assert.ok(postFields.includes("current_version_id"));
    assert.equal(postFields.includes("content_markdown"), false);
    assert.equal(postFields.includes("content_html"), false);
    assert.equal(postFields.includes("content_hash"), false);
    assert.equal(postFields.includes("version_no"), false);

    assert.ok(versionFields.includes("version_no"));
    assert.ok(versionFields.includes("content_markdown"));
    assert.ok(versionFields.includes("content_html"));
    assert.ok(versionFields.includes("content_hash"));
    assert.ok(BLOG_CONTENT_MODEL_TABLES.post_sources.includes("source_role"));
    assert.ok(BLOG_CONTENT_MODEL_TABLES.publish_jobs.includes("idempotency_key"));
  });

  it("hashes each content version from Markdown and HTML", () => {
    const content = {
      contentHtml: "<h1>DB first blog</h1>",
      contentMarkdown: "# DB first blog\n",
    };

    const hash = createPostVersionContentHash(content);

    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.equal(hash, createPostVersionContentHash(content));
    assert.notEqual(
      hash,
      createPostVersionContentHash({
        ...content,
        contentHtml: "<h1>DB first blog</h1><p>changed</p>",
      }),
    );
    assert.notEqual(
      hash,
      createPostVersionContentHash({
        ...content,
        contentMarkdown: "# DB first blog\n\nChanged.\n",
      }),
    );
  });

  it("creates sanitized HTML and a content hash from canonical Markdown", () => {
    const content = createPostVersionContentFromMarkdown(
      "# DB first blog\r\n\r\n본문 **강조**와 <script>alert(\"x\")</script>\r\n",
    );

    assert.equal(
      content.contentMarkdown,
      "# DB first blog\n\n본문 **강조**와 <script>alert(\"x\")</script>\n",
    );
    assert.match(content.contentHtml, /^<h1>DB first blog<\/h1>\n<p>/);
    assert.match(content.contentHtml, /<strong>강조<\/strong>/);
    assert.doesNotMatch(content.contentHtml, /<script>/);
    assert.match(
      content.contentHtml,
      /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/,
    );
    assert.equal(content.contentHash, createPostVersionContentHash(content));
  });

  it("fails content integrity when stored HTML drifts from the canonical hash", () => {
    const content = createPostVersionContentFromMarkdown("# Public post\n\nBody.\n");
    const version = createVersion(content);

    assert.doesNotThrow(() => assertPostVersionContentHashMatches(version));
    assert.throws(
      () =>
        assertPostVersionContentHashMatches({
          ...version,
          contentHtml: `${version.contentHtml}\n<p>Unexpected drift.</p>`,
        }),
      /content_hash mismatch/,
    );
  });

  it("renders crawler Markdown only after version hash integrity passes", () => {
    const content = createPostVersionContentFromMarkdown("# Public post\n\nCrawler body.\n");
    const version = createVersion(content);

    assert.equal(renderCrawlerMarkdownForPostVersion(version), content.contentMarkdown);
    assert.throws(
      () =>
        renderCrawlerMarkdownForPostVersion({
          ...version,
          contentHtml: "<p>Mutated HTML.</p>",
        }),
      /content_hash mismatch/,
    );
  });

  it("requires a published post to point at the same current version", () => {
    const post = createPost();
    const version = createVersion();

    assert.equal(isCurrentPublishedVersion(post, version), true);
    assert.equal(isCurrentPublishedVersion({ ...post, status: "ready_to_publish" }, version), false);
    assert.equal(isCurrentPublishedVersion({ ...post, currentVersionId: "version-2" }, version), false);
    assert.equal(isCurrentPublishedVersion(post, { ...version, postId: "post-2" }), false);
  });

  it("separates required publish jobs from retryable follow-up jobs", () => {
    const retryable = new Set<string>(retryablePublishJobTypes);

    assert.deepEqual(requiredPublishJobTypes, [
      "public_url",
      "md_url",
      "render",
      "privacy_scan",
      "sitemap",
      "content_version_match",
    ]);

    for (const jobType of requiredPublishJobTypes) {
      assert.equal(retryable.has(jobType), false);
    }
  });

  it("allows only explicit publish state transitions", () => {
    assert.equal(canTransitionBlogPostStatus("queued", "researching"), true);
    assert.equal(canTransitionBlogPostStatus("researching", "drafted"), true);
    assert.equal(canTransitionBlogPostStatus("drafted", "ready_to_publish"), true);
    assert.equal(canTransitionBlogPostStatus("drafted", "gate_failed"), true);
    assert.equal(canTransitionBlogPostStatus("ready_to_publish", "publishing"), true);
    assert.equal(canTransitionBlogPostStatus("publishing", "verifying"), true);
    assert.equal(canTransitionBlogPostStatus("publishing", "failed_publish"), true);
    assert.equal(canTransitionBlogPostStatus("failed_publish", "publishing"), true);
    assert.equal(canTransitionBlogPostStatus("verifying", "published"), true);
    assert.equal(canTransitionBlogPostStatus("verifying", "failed_verification"), true);
    assert.equal(canTransitionBlogPostStatus("failed_verification", "verifying"), true);
    assert.equal(canTransitionBlogPostStatus("published", "correction_pending"), true);
    assert.equal(canTransitionBlogPostStatus("published", "unpublished"), true);
    assert.equal(canTransitionBlogPostStatus("published", "retracted"), true);
    assert.equal(canTransitionBlogPostStatus("correction_pending", "corrected"), true);
    assert.equal(canTransitionBlogPostStatus("correction_pending", "retracted"), true);
    assert.equal(canTransitionBlogPostStatus("corrected", "published"), true);

    assert.equal(canTransitionBlogPostStatus("ready_to_publish", "published"), false);
    assert.equal(canTransitionBlogPostStatus("failed_verification", "published"), false);
    assert.equal(canTransitionBlogPostStatus("unpublished", "published"), false);
    assert.equal(canTransitionBlogPostStatus("retracted", "published"), false);
  });

  it("throws when a publish state transition skips verification", () => {
    assert.doesNotThrow(() =>
      assertBlogPostStatusTransition("ready_to_publish", "publishing"),
    );
    assert.throws(
      () => assertBlogPostStatusTransition("ready_to_publish", "published"),
      /invalid blog post status transition: ready_to_publish -> published/,
    );
  });

  it("selects only published posts with their current version for public routes", () => {
    const hiddenStatuses = blogPostStatuses.filter((status) => status !== "published");
    const hiddenPosts = hiddenStatuses.map((status) => {
      const id = `post-${status}`;

      return createPost({
        currentVersionId: `version-${status}`,
        id,
        publishedAt: null,
        slug: status.replaceAll("_", "-"),
        status,
        title: status,
      });
    });
    const posts = [
      createPost({
        currentVersionId: "version-public-2",
        id: "post-public",
        slug: "public-post",
      }),
      createPost({
        currentVersionId: "missing-version",
        id: "post-missing-version",
        slug: "missing-version",
      }),
      ...hiddenPosts,
    ];
    const versions = [
      createVersion({
        id: "version-public-1",
        postId: "post-public",
        title: "Old public version",
        versionNo: 1,
      }),
      createVersion({
        id: "version-public-2",
        postId: "post-public",
        title: "Current public version",
        versionNo: 2,
      }),
      ...hiddenPosts.map((post) =>
        createVersion({
          id: post.currentVersionId ?? "",
          postId: post.id,
          title: post.title,
        }),
      ),
    ];

    const entries = selectPublicBlogRouteEntries(posts, versions);

    assert.deepEqual(
      entries.map((entry) => entry.post.slug),
      ["public-post"],
    );
    assert.equal(entries[0]?.version.id, "version-public-2");
    assert.equal(entries[0]?.version.title, "Current public version");
  });

  it("returns public route detail by slug without exposing private statuses", () => {
    const posts = [
      createPost({
        currentVersionId: "version-public",
        id: "post-public",
        slug: "public-post",
      }),
      createPost({
        currentVersionId: "version-preview",
        id: "post-preview",
        slug: "preview-post",
        status: "ready_to_publish",
      }),
    ];
    const versions = [
      createVersion({
        id: "version-public",
        postId: "post-public",
      }),
      createVersion({
        id: "version-preview",
        postId: "post-preview",
      }),
    ];

    assert.equal(
      selectPublicBlogRouteEntryBySlug("public-post", posts, versions)?.version.id,
      "version-public",
    );
    assert.equal(selectPublicBlogRouteEntryBySlug("preview-post", posts, versions), undefined);
  });
});
