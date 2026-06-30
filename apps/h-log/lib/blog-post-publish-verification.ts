import {
  assertPostVersionContentHashMatches,
  getPublishJobImportance,
  requiredPublishJobTypes,
  selectPublicBlogRouteEntries,
  selectPublicBlogRouteEntryBySlug,
  type BlogPostStatus,
  type PostRecord,
  type PostVersionRecord,
  type PublishJobRecord,
  type PublishJobType,
  type RetryablePublishJobType,
  type Timestamp,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";

export const postPublishRetryableJobTypes = [
  "feed",
  "llms",
  "indexnow",
  "discord",
] as const satisfies readonly RetryablePublishJobType[];

export const postPublishCrawlerOutputNames = [
  "sitemap.xml",
  "feed.xml",
  "llms.txt",
  "llms-full.txt",
] as const;

export type PostPublishCrawlerOutputName =
  (typeof postPublishCrawlerOutputNames)[number];

export type PostPublishCrawlerOutputEntry = {
  contentHash: string;
  contentMarkdown?: string;
  description: string;
  href: string;
  markdownHref: string;
  publishedAt: string;
  slug: string;
  title: string;
  updatedAt: string;
};

export type PostPublishCrawlerOutputManifest = {
  [Name in PostPublishCrawlerOutputName]: PostPublishCrawlerOutputEntry[];
};

export type PostPublishSurfaceProbe = {
  contentHash: string;
  statusCode: number;
  url: string;
};

export type VerifyPostPublishPublicSurfaceInput = {
  checkedAt: Timestamp;
  expectedContentHash: string;
  markdownSurface: PostPublishSurfaceProbe;
  publicSurface: PostPublishSurfaceProbe;
  slug: string;
  store: BlogContentStore;
};

export type PostPublishFailedCheck =
  | "content_version_match"
  | "md_url"
  | "public_url";

export type PostPublishPublicSurfaceVerificationResult = {
  checkedAt: Timestamp;
  error: string | null;
  failedChecks: PostPublishFailedCheck[];
  nextPostStatus: BlogPostStatus;
  slug: string;
  status: "failed" | "passed";
};

export type CreatePostPublishVerificationJobsInput = {
  createdAt: Timestamp;
  post: PostRecord;
  version: PostVersionRecord;
};

export type PostPublishFailureDecisionInput = {
  jobType: PublishJobType;
  postStatus: BlogPostStatus;
};

export type PostPublishFailureDecision = {
  nextPostStatus: BlogPostStatus;
  publicState: "block_publish" | "keep_public" | "operator_review";
};

export function verifyPostPublishPublicSurface(
  input: VerifyPostPublishPublicSurfaceInput,
): PostPublishPublicSurfaceVerificationResult {
  const failedChecks: PostPublishFailedCheck[] = [];
  const errors: string[] = [];
  const entry = selectPublicBlogRouteEntryBySlug(
    input.slug,
    input.store.posts,
    input.store.versions,
  );

  if (!entry) {
    return {
      checkedAt: input.checkedAt,
      error: `post ${input.slug}: published current version not found`,
      failedChecks: ["public_url", "md_url", "content_version_match"],
      nextPostStatus: "failed_verification",
      slug: input.slug,
      status: "failed",
    };
  }

  try {
    assertPostVersionContentHashMatches(entry.version);
  } catch (error) {
    addFailedCheck(failedChecks, "content_version_match");
    errors.push(error instanceof Error ? error.message : String(error));
  }

  if (input.expectedContentHash !== entry.version.contentHash) {
    addFailedCheck(failedChecks, "content_version_match");
    errors.push(
      `post ${input.slug}: expected content_hash ${input.expectedContentHash} does not match current version ${entry.version.contentHash}`,
    );
  }

  verifySurfaceProbe({
    expectedContentHash: input.expectedContentHash,
    expectedUrl: `/blog/${input.slug}`,
    failedCheck: "public_url",
    failedChecks,
    label: "public_url",
    probe: input.publicSurface,
    errors,
  });
  verifySurfaceProbe({
    expectedContentHash: input.expectedContentHash,
    expectedUrl: `/blog/${input.slug}.md`,
    failedCheck: "md_url",
    failedChecks,
    label: "md_url",
    probe: input.markdownSurface,
    errors,
  });

  if (failedChecks.length > 0) {
    if (
      input.publicSurface.contentHash !== input.expectedContentHash ||
      input.markdownSurface.contentHash !== input.expectedContentHash
    ) {
      addFailedCheck(failedChecks, "content_version_match");
    }

    return {
      checkedAt: input.checkedAt,
      error: errors.join("; "),
      failedChecks,
      nextPostStatus: decidePostPublishFailure({
        jobType: "content_version_match",
        postStatus: "verifying",
      }).nextPostStatus,
      slug: input.slug,
      status: "failed",
    };
  }

  return {
    checkedAt: input.checkedAt,
    error: null,
    failedChecks,
    nextPostStatus: "published",
    slug: input.slug,
    status: "passed",
  };
}

export function buildPostPublishCrawlerOutputManifest(
  store: BlogContentStore,
): PostPublishCrawlerOutputManifest {
  const publicEntries = selectPublicBlogRouteEntries(store.posts, store.versions);
  const entries = publicEntries
    .map((entry) => {
      assertPostVersionContentHashMatches(entry.version);
      return toCrawlerOutputEntry(entry.post, entry.version);
    })
    .sort(compareCrawlerOutputEntries);
  const fullEntries = publicEntries
    .map((entry) => ({
      ...toCrawlerOutputEntry(entry.post, entry.version),
      contentMarkdown: entry.version.contentMarkdown,
    }))
    .sort(compareCrawlerOutputEntries);

  return {
    "feed.xml": entries,
    "llms-full.txt": fullEntries,
    "llms.txt": entries,
    "sitemap.xml": entries,
  };
}

export function createPostPublishVerificationJobs(
  input: CreatePostPublishVerificationJobsInput,
): PublishJobRecord[] {
  const jobTypes: readonly PublishJobType[] = [
    ...requiredPublishJobTypes,
    ...postPublishRetryableJobTypes,
  ];

  return jobTypes.map((type): PublishJobRecord => ({
    error: null,
    finishedAt: null,
    id: `${input.post.id}:${input.version.id}:${type}`,
    idempotencyKey: `${input.post.id}:${input.version.id}:${type}`,
    importance: getPublishJobImportance(type),
    postId: input.post.id,
    postVersionId: input.version.id,
    retryCount: 0,
    startedAt: input.createdAt,
    status: "queued",
    type,
  }));
}

export function decidePostPublishFailure(
  input: PostPublishFailureDecisionInput,
): PostPublishFailureDecision {
  const importance = getPublishJobImportance(input.jobType);

  if (importance === "retryable") {
    return {
      nextPostStatus: input.postStatus,
      publicState: "keep_public",
    };
  }

  if (input.postStatus === "publishing") {
    return {
      nextPostStatus: "failed_publish",
      publicState: "block_publish",
    };
  }

  if (input.postStatus === "verifying") {
    return {
      nextPostStatus: "failed_verification",
      publicState: "block_publish",
    };
  }

  if (input.postStatus === "published") {
    return {
      nextPostStatus: "correction_pending",
      publicState: "operator_review",
    };
  }

  throw new Error(
    `cannot decide post-publish failure for ${input.jobType} from ${input.postStatus}`,
  );
}

function verifySurfaceProbe({
  errors,
  expectedContentHash,
  expectedUrl,
  failedCheck,
  failedChecks,
  label,
  probe,
}: {
  errors: string[];
  expectedContentHash: string;
  expectedUrl: string;
  failedCheck: PostPublishFailedCheck;
  failedChecks: PostPublishFailedCheck[];
  label: string;
  probe: PostPublishSurfaceProbe;
}): void {
  if (probe.url !== expectedUrl) {
    addFailedCheck(failedChecks, failedCheck);
    errors.push(`${label}: expected ${expectedUrl}, received ${probe.url}`);
  }

  if (probe.statusCode !== 200) {
    addFailedCheck(failedChecks, failedCheck);
    errors.push(`${label}: expected 200, received ${probe.statusCode}`);
  }

  if (probe.contentHash !== expectedContentHash) {
    addFailedCheck(failedChecks, failedCheck);
    errors.push(
      `${label}: content_hash mismatch, expected ${expectedContentHash}, received ${probe.contentHash}`,
    );
  }
}

function addFailedCheck(
  failedChecks: PostPublishFailedCheck[],
  check: PostPublishFailedCheck,
): void {
  if (!failedChecks.includes(check)) {
    failedChecks.push(check);
  }
}

function toCrawlerOutputEntry(
  post: PostRecord,
  version: PostVersionRecord,
): PostPublishCrawlerOutputEntry {
  return {
    contentHash: version.contentHash,
    description: version.description,
    href: `/blog/${post.slug}`,
    markdownHref: `/blog/${post.slug}.md`,
    publishedAt: post.publishedAt ?? post.updatedAt,
    slug: post.slug,
    title: version.title,
    updatedAt: post.updatedAt,
  };
}

function compareCrawlerOutputEntries(
  a: PostPublishCrawlerOutputEntry,
  b: PostPublishCrawlerOutputEntry,
): number {
  return (
    Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
    a.slug.localeCompare(b.slug, "ko")
  );
}
