import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostTagRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import {
  buildPostPublishCrawlerOutputManifest,
  createPostPublishVerificationJobs,
  decidePostPublishFailure,
  verifyPostPublishPublicSurface,
} from "./blog-post-publish-verification.ts";

const baseTimestamp = "2026-06-30T00:00:00.000Z";

function createPost(slug: string, overrides: Partial<PostRecord> = {}): PostRecord {
  const id = `post-${slug}`;

  return {
    articleMode: "document_analysis",
    createdAt: baseTimestamp,
    currentVersionId: `version-${slug}`,
    description: `${slug} description`,
    id,
    publishedAt: "2026-06-30T09:00:00.000Z",
    retractedAt: null,
    slug,
    status: "published",
    title: slug,
    unpublishedAt: null,
    updatedAt: baseTimestamp,
    ...overrides,
  };
}

function createVersion(
  slug: string,
  overrides: Partial<PostVersionRecord> & {
    contentMarkdown?: string;
  } = {},
): PostVersionRecord {
  const { contentMarkdown = `# ${slug}\n\n${slug} body.\n`, ...recordOverrides } =
    overrides;
  const content = createPostVersionContentFromMarkdown(contentMarkdown);

  return {
    ...content,
    createdAt: baseTimestamp,
    createdBy: "admin",
    description: `${slug} description`,
    id: `version-${slug}`,
    personaVersionId: null,
    postId: `post-${slug}`,
    researchPackId: null,
    title: slug,
    versionNo: 1,
    ...recordOverrides,
  };
}

function createTag(slug: string, tag: string): PostTagRecord {
  return {
    createdAt: baseTimestamp,
    id: `tag-${slug}-${tag}`,
    postId: `post-${slug}`,
    tag,
  };
}

function createStore(): BlogContentStore {
  return {
    posts: [
      createPost("public-seo"),
      createPost("newer-public"),
      createPost("preview-seo", {
        publishedAt: null,
        status: "ready_to_publish",
      }),
      createPost("failed-seo", {
        publishedAt: null,
        status: "failed_verification",
      }),
    ],
    sources: [],
    tags: [
      createTag("public-seo", "SEO"),
      createTag("newer-public", "LLM"),
      createTag("preview-seo", "비공개"),
      createTag("failed-seo", "실패"),
    ],
    versions: [
      createVersion("public-seo", {
        contentMarkdown: "# Public SEO\n\nCrawler-safe body.\n",
        title: "Public SEO",
      }),
      createVersion("newer-public", {
        contentMarkdown: "# Newer Public\n\nNewer public body.\n",
        title: "Newer Public",
      }),
      createVersion("preview-seo", {
        contentMarkdown: "# Preview SEO\n\nPrivate draft body.\n",
        title: "Preview SEO",
      }),
      createVersion("failed-seo", {
        contentMarkdown: "# Failed SEO\n\nFailed verification body.\n",
        title: "Failed SEO",
      }),
    ],
  };
}

describe("post-publish SEO verification contract", () => {
  it("fails public and markdown surface verification when content hash drifts", () => {
    const store = createStore();
    const version = store.versions.find((candidate) => candidate.id === "version-public-seo");

    assert.ok(version);

    const result = verifyPostPublishPublicSurface({
      checkedAt: baseTimestamp,
      expectedContentHash: version.contentHash,
      publicSurface: {
        contentHash: "stale-content-hash",
        statusCode: 200,
        url: "/blog/public-seo",
      },
      markdownSurface: {
        contentHash: version.contentHash,
        statusCode: 200,
        url: "/blog/public-seo.md",
      },
      slug: "public-seo",
      store,
    });

    assert.equal(result.status, "failed");
    assert.deepEqual(result.failedChecks, ["public_url", "content_version_match"]);
    assert.match(result.error ?? "", /content_hash mismatch/);
    assert.equal(result.nextPostStatus, "failed_verification");
  });

  it("builds crawler output criteria from published current versions only", () => {
    const manifest = buildPostPublishCrawlerOutputManifest(createStore());

    assert.deepEqual(
      manifest["sitemap.xml"].map((entry) => entry.href),
      ["/blog/newer-public", "/blog/public-seo"],
    );
    assert.deepEqual(
      manifest["feed.xml"].map((entry) => entry.href),
      ["/blog/newer-public", "/blog/public-seo"],
    );
    assert.deepEqual(
      manifest["llms.txt"].map((entry) => entry.href),
      ["/blog/newer-public", "/blog/public-seo"],
    );
    assert.deepEqual(
      manifest["llms-full.txt"].map((entry) => entry.markdownHref),
      ["/blog/newer-public.md", "/blog/public-seo.md"],
    );
    assert.equal(
      Object.values(manifest)
        .flat()
        .some((entry) => ["preview-seo", "failed-seo"].includes(entry.slug)),
      false,
    );
  });

  it("splits required verification and retryable notification jobs", () => {
    const store = createStore();
    const post = store.posts[0];
    const version = store.versions[0];

    assert.ok(post);
    assert.ok(version);

    const jobs = createPostPublishVerificationJobs({
      createdAt: baseTimestamp,
      post,
      version,
    });

    assert.deepEqual(
      jobs.filter((job) => job.importance === "required").map((job) => job.type),
      [
        "public_url",
        "md_url",
        "render",
        "privacy_scan",
        "sitemap",
        "content_version_match",
      ],
    );
    assert.deepEqual(
      jobs.filter((job) => job.importance === "retryable").map((job) => job.type),
      ["feed", "llms", "indexnow", "discord"],
    );
    assert.equal(
      jobs.find((job) => job.type === "indexnow")?.idempotencyKey,
      "post-public-seo:version-public-seo:indexnow",
    );
  });

  it("keeps published posts public only for retryable post-publish failures", () => {
    assert.deepEqual(
      decidePostPublishFailure({
        jobType: "content_version_match",
        postStatus: "verifying",
      }),
      {
        nextPostStatus: "failed_verification",
        publicState: "block_publish",
      },
    );
    assert.deepEqual(
      decidePostPublishFailure({
        jobType: "discord",
        postStatus: "published",
      }),
      {
        nextPostStatus: "published",
        publicState: "keep_public",
      },
    );
    assert.deepEqual(
      decidePostPublishFailure({
        jobType: "content_version_match",
        postStatus: "published",
      }),
      {
        nextPostStatus: "correction_pending",
        publicState: "operator_review",
      },
    );
  });
});
