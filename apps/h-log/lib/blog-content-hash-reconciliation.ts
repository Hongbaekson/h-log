import {
  assertPostVersionContentHashMatches,
  selectPublicBlogRouteEntries,
  type BlogPostStatus,
  type PostRecord,
  type PostVersionRecord,
  type PublishJobType,
  type PublishVerificationCheckType,
  type PublishVerificationRecord,
  type Timestamp,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import {
  decidePostPublishFailure,
  postPublishCrawlerOutputNames,
  type PostPublishCrawlerOutputManifest,
  type PostPublishCrawlerOutputName,
  type PostPublishSurfaceProbe,
} from "./blog-post-publish-verification.ts";

export type PublishedContentSurfaceObservation = {
  markdownSurface: PostPublishSurfaceProbe;
  publicSurface: PostPublishSurfaceProbe;
  slug: string;
};

export type ReconcilePublishedContentHashesInput = {
  checkedAt: Timestamp;
  crawlerManifest: PostPublishCrawlerOutputManifest;
  publicSurfaces: readonly PublishedContentSurfaceObservation[];
  store: BlogContentStore;
};

export type ContentHashReconciliationFailure = {
  checkType: PublishVerificationCheckType;
  expectedContentHash: string;
  handoff: "correction_or_retraction_review" | "retryable_follow_up";
  nextPostStatus: BlogPostStatus;
  observedContentHash: string | null;
  postId: string;
  postVersionId: string;
  result: string;
  slug: string;
  surface: string;
};

export type PublishedContentHashReconciliationResult = {
  failures: ContentHashReconciliationFailure[];
  publishVerifications: PublishVerificationRecord[];
  status: "failed" | "passed";
  targetSlugs: string[];
};

export function reconcilePublishedContentHashes(
  input: ReconcilePublishedContentHashesInput,
): PublishedContentHashReconciliationResult {
  const publicEntries = selectPublicBlogRouteEntries(
    input.store.posts,
    input.store.versions,
  );
  const publicSurfacesBySlug = new Map(
    input.publicSurfaces.map((surface) => [surface.slug, surface]),
  );
  const publishVerifications: PublishVerificationRecord[] = [];
  const failures: ContentHashReconciliationFailure[] = [];

  for (const entry of publicEntries) {
    const { post, version } = entry;

    try {
      assertPostVersionContentHashMatches(version);
    } catch (error) {
      recordFailure({
        checkedAt: input.checkedAt,
        checkType: "content_version_match",
        expectedContentHash: version.contentHash,
        failures,
        observedContentHash: null,
        post,
        publishVerifications,
        responseCode: null,
        result: `required verification failure: stored post_version content_hash does not match canonical content for ${post.slug}; ${formatError(error)}`,
        surface: "content_version_match",
        version,
      });
      continue;
    }

    const surfaces = publicSurfacesBySlug.get(post.slug);

    if (!surfaces) {
      recordFailure({
        checkedAt: input.checkedAt,
        checkType: "public_url",
        expectedContentHash: version.contentHash,
        failures,
        observedContentHash: null,
        post,
        publishVerifications,
        responseCode: null,
        result: `public_url: missing published surface observation for ${post.slug}`,
        surface: "public_url",
        version,
      });
      recordFailure({
        checkedAt: input.checkedAt,
        checkType: "md_url",
        expectedContentHash: version.contentHash,
        failures,
        observedContentHash: null,
        post,
        publishVerifications,
        responseCode: null,
        result: `md_url: missing published surface observation for ${post.slug}`,
        surface: "md_url",
        version,
      });
    } else {
      compareSurfaceProbe({
        checkedAt: input.checkedAt,
        checkType: "public_url",
        expectedContentHash: version.contentHash,
        expectedUrl: `/blog/${post.slug}`,
        failures,
        post,
        probe: surfaces.publicSurface,
        publishVerifications,
        surface: "public_url",
        version,
      });
      compareSurfaceProbe({
        checkedAt: input.checkedAt,
        checkType: "md_url",
        expectedContentHash: version.contentHash,
        expectedUrl: `/blog/${post.slug}.md`,
        failures,
        post,
        probe: surfaces.markdownSurface,
        publishVerifications,
        surface: "md_url",
        version,
      });
    }

    compareCrawlerManifest({
      checkedAt: input.checkedAt,
      crawlerManifest: input.crawlerManifest,
      failures,
      post,
      publishVerifications,
      version,
    });
  }

  return {
    failures,
    publishVerifications,
    status: failures.length > 0 ? "failed" : "passed",
    targetSlugs: publicEntries.map((entry) => entry.post.slug),
  };
}

function compareSurfaceProbe({
  checkedAt,
  checkType,
  expectedContentHash,
  expectedUrl,
  failures,
  post,
  probe,
  publishVerifications,
  surface,
  version,
}: {
  checkedAt: Timestamp;
  checkType: Extract<PublishVerificationCheckType, "public_url" | "md_url">;
  expectedContentHash: string;
  expectedUrl: string;
  failures: ContentHashReconciliationFailure[];
  post: PostRecord;
  probe: PostPublishSurfaceProbe;
  publishVerifications: PublishVerificationRecord[];
  surface: string;
  version: PostVersionRecord;
}): void {
  if (probe.url !== expectedUrl) {
    recordFailure({
      checkedAt,
      checkType,
      expectedContentHash,
      failures,
      observedContentHash: probe.contentHash,
      post,
      publishVerifications,
      responseCode: probe.statusCode,
      result: `${surface}: expected ${expectedUrl}, received ${probe.url}`,
      surface: `${surface}:url`,
      version,
    });
  }

  if (probe.statusCode !== 200) {
    recordFailure({
      checkedAt,
      checkType,
      expectedContentHash,
      failures,
      observedContentHash: probe.contentHash,
      post,
      publishVerifications,
      responseCode: probe.statusCode,
      result: `${surface}: expected HTTP 200, received ${probe.statusCode}`,
      surface: `${surface}:status`,
      version,
    });
  }

  if (probe.contentHash !== expectedContentHash) {
    recordFailure({
      checkedAt,
      checkType: "content_version_match",
      expectedContentHash,
      failures,
      observedContentHash: probe.contentHash,
      post,
      publishVerifications,
      responseCode: probe.statusCode,
      result: `required verification failure: ${surface} content_hash mismatch for ${post.slug}; expected ${expectedContentHash}, received ${probe.contentHash}`,
      surface,
      version,
    });
  }
}

function compareCrawlerManifest({
  checkedAt,
  crawlerManifest,
  failures,
  post,
  publishVerifications,
  version,
}: {
  checkedAt: Timestamp;
  crawlerManifest: PostPublishCrawlerOutputManifest;
  failures: ContentHashReconciliationFailure[];
  post: PostRecord;
  publishVerifications: PublishVerificationRecord[];
  version: PostVersionRecord;
}): void {
  for (const outputName of postPublishCrawlerOutputNames) {
    const entry = crawlerManifest[outputName].find(
      (candidate) => candidate.slug === post.slug,
    );

    if (!entry) {
      recordFailure({
        checkedAt,
        checkType: getCrawlerVerificationCheckType(outputName),
        expectedContentHash: version.contentHash,
        failures,
        observedContentHash: null,
        post,
        publishVerifications,
        responseCode: null,
        result: `${outputName}: missing published post ${post.slug}`,
        surface: outputName,
        version,
      });
      continue;
    }

    if (entry.contentHash !== version.contentHash) {
      recordFailure({
        checkedAt,
        checkType: "content_version_match",
        expectedContentHash: version.contentHash,
        failures,
        observedContentHash: entry.contentHash,
        post,
        publishVerifications,
        responseCode: null,
        result: `required verification failure: ${outputName} content_hash mismatch for ${post.slug}; expected ${version.contentHash}, received ${entry.contentHash}`,
        surface: outputName,
        version,
      });
    }
  }
}

function recordFailure({
  checkedAt,
  checkType,
  expectedContentHash,
  failures,
  observedContentHash,
  post,
  publishVerifications,
  responseCode,
  result,
  surface,
  version,
}: {
  checkedAt: Timestamp;
  checkType: PublishVerificationCheckType;
  expectedContentHash: string;
  failures: ContentHashReconciliationFailure[];
  observedContentHash: string | null;
  post: PostRecord;
  publishVerifications: PublishVerificationRecord[];
  responseCode: number | null;
  result: string;
  surface: string;
  version: PostVersionRecord;
}): void {
  const decision = decidePostPublishFailure({
    jobType: toPublishJobType(checkType),
    postStatus: "published",
  });
  const handoff =
    decision.publicState === "operator_review"
      ? "correction_or_retraction_review"
      : "retryable_follow_up";

  publishVerifications.push({
    checkedAt,
    checkType,
    id: `publish-verification:${post.id}:${version.id}:${checkType}:${toIdSegment(surface)}:${checkedAt}`,
    postId: post.id,
    postVersionId: version.id,
    responseCode,
    result,
    status: "failed",
  });
  failures.push({
    checkType,
    expectedContentHash,
    handoff,
    nextPostStatus: decision.nextPostStatus,
    observedContentHash,
    postId: post.id,
    postVersionId: version.id,
    result,
    slug: post.slug,
    surface,
  });
}

function getCrawlerVerificationCheckType(
  outputName: PostPublishCrawlerOutputName,
): Extract<PublishVerificationCheckType, "feed" | "llms" | "sitemap"> {
  if (outputName === "sitemap.xml") {
    return "sitemap";
  }

  if (outputName === "feed.xml") {
    return "feed";
  }

  return "llms";
}

function toPublishJobType(checkType: PublishVerificationCheckType): PublishJobType {
  return checkType;
}

function toIdSegment(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
