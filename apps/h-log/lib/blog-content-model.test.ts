import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BLOG_CONTENT_MODEL_TABLES,
  assertPostVersionContentHashMatches,
  assertBlogPostStatusTransition,
  adminActionActorTypes,
  adminActionTypes,
  blogArticleModes,
  blogPostStatuses,
  canTransitionBlogPostStatus,
  createPostVersionContentFromMarkdown,
  createPostVersionContentHash,
  getPublishJobImportance,
  isCurrentPublishedVersion,
  publishVerificationCheckTypes,
  publishVerificationStatuses,
  recordPublishJobFailure,
  renderCrawlerMarkdownForPostVersion,
  requiredPublishJobTypes,
  retryablePublishJobTypes,
  type PublishJobRecord,
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

function createPublishJob(
  overrides: Partial<PublishJobRecord> = {},
): PublishJobRecord {
  return {
    error: null,
    finishedAt: null,
    id: "job-1",
    idempotencyKey: "post-1:version-1:public_url",
    importance: "required",
    postId: "post-1",
    postVersionId: "version-1",
    retryCount: 0,
    startedAt: baseTimestamp,
    status: "running",
    type: "public_url",
    ...overrides,
  };
}

describe("blog DB content model contract", () => {
  it("keeps post metadata separate from versioned content fields", () => {
    const postFields: readonly string[] = BLOG_CONTENT_MODEL_TABLES.posts;
    const versionFields: readonly string[] = BLOG_CONTENT_MODEL_TABLES.post_versions;
    const correctionFields: readonly string[] =
      BLOG_CONTENT_MODEL_TABLES.post_corrections;
    const chunkFields: readonly string[] = BLOG_CONTENT_MODEL_TABLES.post_chunks;
    const verificationFields: readonly string[] =
      BLOG_CONTENT_MODEL_TABLES.publish_verifications;
    const claimFields: readonly string[] = BLOG_CONTENT_MODEL_TABLES.article_claims;
    const qualityGateFields: readonly string[] =
      BLOG_CONTENT_MODEL_TABLES.quality_gate_results;
    const generationRunFields: readonly string[] =
      BLOG_CONTENT_MODEL_TABLES.post_generation_runs;
    const assetFields: readonly string[] = BLOG_CONTENT_MODEL_TABLES.post_assets;

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
    assert.ok(BLOG_CONTENT_MODEL_TABLES.publish_jobs.includes("retry_count"));
    assert.ok(BLOG_CONTENT_MODEL_TABLES.admin_actions.includes("actor_type"));
    assert.ok(BLOG_CONTENT_MODEL_TABLES.admin_actions.includes("actor_id"));
    assert.deepEqual(correctionFields, [
      "id",
      "post_id",
      "post_version_id",
      "reason",
      "previous_content_hash",
      "corrected_content_hash",
      "corrected_by",
      "corrected_at",
    ]);
    assert.deepEqual(chunkFields, [
      "id",
      "post_id",
      "post_version_id",
      "content_hash",
      "chunk_index",
      "content",
      "embedding",
    ]);
    assert.deepEqual(verificationFields, [
      "id",
      "post_id",
      "post_version_id",
      "check_type",
      "status",
      "response_code",
      "result",
      "checked_at",
    ]);
    assert.deepEqual(claimFields, [
      "id",
      "post_id",
      "post_version_id",
      "claim_text",
      "claim_type",
      "claim_category",
      "source_id",
      "evidence_quote",
      "evidence_path",
      "confidence",
      "verified",
      "verifier_result",
      "created_at",
    ]);
    assert.deepEqual(qualityGateFields, [
      "id",
      "post_id",
      "post_version_id",
      "gate_name",
      "status",
      "message",
      "created_at",
    ]);
    assert.deepEqual(generationRunFields, [
      "id",
      "post_id",
      "post_version_id",
      "model",
      "prompt_hash",
      "persona_version",
      "input_source_ids",
      "personal_context_ids",
      "article_mode",
      "apply_to_me_result_id",
      "output_hash",
      "gate_result",
      "created_at",
    ]);
    assert.deepEqual(assetFields, [
      "id",
      "post_id",
      "post_version_id",
      "type",
      "path",
      "alt",
      "generated_by",
      "created_at",
    ]);
  });

  it("tracks publish verification result boundaries", () => {
    assert.deepEqual(publishVerificationCheckTypes, [
      "public_url",
      "md_url",
      "sitemap",
      "feed",
      "llms",
      "content_version_match",
    ]);
    assert.deepEqual(publishVerificationStatuses, ["passed", "failed"]);
  });

  it("tracks admin actions with operator and command metadata", () => {
    assert.deepEqual(adminActionTypes, [
      "preview",
      "save",
      "publish",
      "retry",
      "unpublish",
      "retract",
      "correct",
      "block_topic",
      "approve_preview",
    ]);
    assert.deepEqual(adminActionActorTypes, ["admin", "system", "discord", "cli"]);
  });

  it("tracks article modes and apply-to-me ledger table fields", () => {
    assert.deepEqual(blogArticleModes, [
      "experiment",
      "applied_analysis",
      "document_analysis",
      "project_record",
      "ops_incident",
    ]);
    assert.deepEqual(BLOG_CONTENT_MODEL_TABLES.personal_context_items, [
      "id",
      "category",
      "title",
      "summary",
      "allowed_usage",
      "public_safe",
      "version",
      "created_at",
      "updated_at",
    ]);
    assert.deepEqual(BLOG_CONTENT_MODEL_TABLES.apply_to_me_results, [
      "id",
      "topic_candidate_id",
      "research_pack_id",
      "apply_categories",
      "apply_targets",
      "article_mode",
      "hypothesis",
      "commands_or_checks",
      "evidence_paths",
      "personal_context_ids",
      "status",
      "block_reason",
      "summary",
      "created_at",
    ]);
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
    assert.deepEqual(retryablePublishJobTypes, [
      "embedding",
      "search_index",
      "related_posts",
      "llms",
      "feed",
      "indexnow",
      "discord",
      "og",
      "diagram",
    ]);

    for (const jobType of requiredPublishJobTypes) {
      assert.equal(retryable.has(jobType), false);
      assert.equal(getPublishJobImportance(jobType), "required");
    }

    for (const jobType of retryablePublishJobTypes) {
      assert.equal(getPublishJobImportance(jobType), "retryable");
    }
  });

  it("blocks public transition when a required publish job fails", () => {
    const result = recordPublishJobFailure({
      error: "public URL returned 500",
      finishedAt: "2026-06-25T00:01:00.000Z",
      job: createPublishJob({ type: "public_url" }),
      postStatus: "publishing",
    });

    assert.equal(result.postStatus, "failed_publish");
    assert.equal(result.job.status, "failed");
    assert.equal(result.job.error, "public URL returned 500");
    assert.equal(result.job.retryCount, 0);

    const verificationResult = recordPublishJobFailure({
      error: "content hash drift",
      finishedAt: "2026-06-25T00:02:00.000Z",
      job: createPublishJob({
        id: "job-2",
        type: "content_version_match",
      }),
      postStatus: "verifying",
    });

    assert.equal(verificationResult.postStatus, "failed_verification");
  });

  it("keeps a published post public when a retryable job fails", () => {
    const result = recordPublishJobFailure({
      error: "IndexNow timeout",
      finishedAt: "2026-06-25T00:03:00.000Z",
      job: createPublishJob({
        id: "job-3",
        idempotencyKey: "post-1:version-1:indexnow",
        importance: "retryable",
        retryCount: 1,
        type: "indexnow",
      }),
      postStatus: "published",
    });

    assert.equal(result.postStatus, "published");
    assert.equal(result.job.status, "retrying");
    assert.equal(result.job.error, "IndexNow timeout");
    assert.equal(result.job.retryCount, 2);
    assert.equal(result.job.importance, "retryable");
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
