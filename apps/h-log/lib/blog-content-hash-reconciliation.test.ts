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
  type PostPublishSurfaceProbe,
} from "./blog-post-publish-verification.ts";
import { reconcilePublishedContentHashes } from "./blog-content-hash-reconciliation.ts";

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

function createSurfaceProbe(
  slug: string,
  suffix: "" | ".md",
  contentHash: string,
): PostPublishSurfaceProbe {
  return {
    contentHash,
    statusCode: 200,
    url: `/blog/${slug}${suffix}`,
  };
}

describe("published content hash reconciliation", () => {
  it("records public body hash drift as a required publish verification failure", () => {
    const store = createStore();
    const publicVersion = store.versions.find(
      (candidate) => candidate.id === "version-public-seo",
    );
    const newerVersion = store.versions.find(
      (candidate) => candidate.id === "version-newer-public",
    );

    assert.ok(publicVersion);
    assert.ok(newerVersion);

    const result = reconcilePublishedContentHashes({
      checkedAt: baseTimestamp,
      crawlerManifest: buildPostPublishCrawlerOutputManifest(store),
      publicSurfaces: [
        {
          markdownSurface: createSurfaceProbe(
            "public-seo",
            ".md",
            publicVersion.contentHash,
          ),
          publicSurface: createSurfaceProbe("public-seo", "", "stale-public-hash"),
          slug: "public-seo",
        },
        {
          markdownSurface: createSurfaceProbe(
            "newer-public",
            ".md",
            newerVersion.contentHash,
          ),
          publicSurface: createSurfaceProbe("newer-public", "", newerVersion.contentHash),
          slug: "newer-public",
        },
        {
          markdownSurface: createSurfaceProbe("preview-seo", ".md", "preview-hash"),
          publicSurface: createSurfaceProbe("preview-seo", "", "preview-hash"),
          slug: "preview-seo",
        },
      ],
      store,
    });

    const mismatch = result.publishVerifications.find(
      (record) =>
        record.postId === "post-public-seo" &&
        record.checkType === "content_version_match",
    );

    assert.equal(result.status, "failed");
    assert.deepEqual(result.targetSlugs, ["public-seo", "newer-public"]);
    assert.ok(mismatch);
    assert.equal(mismatch.postVersionId, "version-public-seo");
    assert.equal(mismatch.status, "failed");
    assert.equal(mismatch.responseCode, 200);
    assert.match(mismatch.result, /required verification failure/);
    assert.match(mismatch.result, /public_url/);
    assert.equal(result.failures[0]?.nextPostStatus, "correction_pending");
    assert.equal(result.failures[0]?.handoff, "correction_or_retraction_review");
    assert.equal(
      result.publishVerifications.some((record) => record.postId === "post-preview-seo"),
      false,
    );
    assert.doesNotMatch(
      JSON.stringify(result.publishVerifications),
      /Crawler-safe body|Private draft body|Failed verification body/,
    );
  });

  it("records crawler output hash drift for published posts only", () => {
    const store = createStore();
    const publicVersion = store.versions.find(
      (candidate) => candidate.id === "version-public-seo",
    );
    const newerVersion = store.versions.find(
      (candidate) => candidate.id === "version-newer-public",
    );

    assert.ok(publicVersion);
    assert.ok(newerVersion);

    const crawlerManifest = buildPostPublishCrawlerOutputManifest(store);

    crawlerManifest["feed.xml"] = crawlerManifest["feed.xml"].map((entry) =>
      entry.slug === "public-seo"
        ? { ...entry, contentHash: "stale-feed-hash" }
        : entry,
    );

    const result = reconcilePublishedContentHashes({
      checkedAt: baseTimestamp,
      crawlerManifest,
      publicSurfaces: [
        {
          markdownSurface: createSurfaceProbe(
            "public-seo",
            ".md",
            publicVersion.contentHash,
          ),
          publicSurface: createSurfaceProbe("public-seo", "", publicVersion.contentHash),
          slug: "public-seo",
        },
        {
          markdownSurface: createSurfaceProbe(
            "newer-public",
            ".md",
            newerVersion.contentHash,
          ),
          publicSurface: createSurfaceProbe("newer-public", "", newerVersion.contentHash),
          slug: "newer-public",
        },
      ],
      store,
    });

    const feedMismatch = result.publishVerifications.find(
      (record) =>
        record.postId === "post-public-seo" &&
        record.checkType === "content_version_match" &&
        record.result.includes("feed.xml"),
    );

    assert.equal(result.status, "failed");
    assert.ok(feedMismatch);
    assert.equal(feedMismatch.postVersionId, "version-public-seo");
    assert.equal(
      result.publishVerifications.some((record) =>
        ["post-preview-seo", "post-failed-seo"].includes(record.postId),
      ),
      false,
    );
  });
});
