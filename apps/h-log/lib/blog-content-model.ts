import { createHash } from "node:crypto";

export const BLOG_CONTENT_MODEL_TABLES = {
  posts: [
    "id",
    "slug",
    "title",
    "description",
    "article_mode",
    "status",
    "current_version_id",
    "published_at",
    "unpublished_at",
    "retracted_at",
    "created_at",
    "updated_at",
  ],
  post_versions: [
    "id",
    "post_id",
    "version_no",
    "title",
    "description",
    "content_markdown",
    "content_html",
    "content_hash",
    "persona_version_id",
    "research_pack_id",
    "created_by",
    "created_at",
  ],
  post_sources: [
    "id",
    "post_id",
    "research_pack_id",
    "url",
    "title",
    "publisher",
    "source_role",
    "fetched_at",
    "summary",
    "snapshot_hash",
  ],
  post_tags: ["id", "post_id", "tag", "created_at"],
  publish_jobs: [
    "id",
    "post_id",
    "post_version_id",
    "type",
    "importance",
    "idempotency_key",
    "status",
    "retry_count",
    "error",
    "started_at",
    "finished_at",
  ],
  admin_actions: [
    "id",
    "action_type",
    "actor_type",
    "actor_id",
    "target_type",
    "target_id",
    "reason",
    "created_at",
  ],
} as const;

export const blogPostStatuses = [
  "queued",
  "researching",
  "drafted",
  "gate_failed",
  "ready_to_publish",
  "publishing",
  "verifying",
  "published",
  "correction_pending",
  "corrected",
  "unpublished",
  "retracted",
  "failed_generation",
  "failed_publish",
  "failed_verification",
] as const;

export const blogArticleModes = [
  "experiment",
  "applied_analysis",
  "document_analysis",
] as const;

export const postSourceRoles = [
  "official",
  "original",
  "discovery",
  "reaction",
  "reference",
] as const;

export const requiredPublishJobTypes = [
  "public_url",
  "md_url",
  "render",
  "privacy_scan",
  "sitemap",
  "content_version_match",
] as const;

export const retryablePublishJobTypes = [
  "embedding",
  "search_index",
  "related_posts",
  "llms",
  "feed",
  "indexnow",
  "discord",
  "og",
  "diagram",
] as const;

export const publishJobStatuses = [
  "queued",
  "running",
  "retrying",
  "succeeded",
  "failed",
] as const;

export const adminActionTypes = [
  "preview",
  "save",
  "publish",
  "retry",
  "unpublish",
  "retract",
  "correct",
  "block_topic",
  "approve_preview",
] as const;

export const adminActionActorTypes = [
  "admin",
  "system",
  "discord",
  "cli",
] as const;

export type BlogPostStatus = (typeof blogPostStatuses)[number];
export type BlogArticleMode = (typeof blogArticleModes)[number];
export type PostSourceRole = (typeof postSourceRoles)[number];
export type RequiredPublishJobType = (typeof requiredPublishJobTypes)[number];
export type RetryablePublishJobType = (typeof retryablePublishJobTypes)[number];
export type PublishJobType = RequiredPublishJobType | RetryablePublishJobType;
export type PublishJobImportance = "required" | "retryable";
export type PublishJobStatus = (typeof publishJobStatuses)[number];
export type PostVersionCreatedBy = "system" | "admin";
export type AdminActionType = (typeof adminActionTypes)[number];
export type AdminActionActorType = (typeof adminActionActorTypes)[number];
export type AdminActionTargetType =
  | "post"
  | "post_version"
  | "publish_job"
  | "topic_candidate";
export type Timestamp = string;

export const blogPostStatusTransitions: {
  readonly [Status in BlogPostStatus]: readonly BlogPostStatus[];
} = {
  correction_pending: ["corrected", "retracted"],
  corrected: ["published"],
  drafted: ["gate_failed", "ready_to_publish"],
  failed_generation: [],
  failed_publish: ["publishing"],
  failed_verification: ["verifying"],
  gate_failed: [],
  published: ["correction_pending", "unpublished", "retracted"],
  publishing: ["verifying", "failed_publish"],
  queued: ["researching"],
  ready_to_publish: ["publishing"],
  researching: ["drafted"],
  retracted: [],
  unpublished: [],
  verifying: ["published", "failed_verification"],
};

export function getAllowedBlogPostStatusTransitions(
  status: BlogPostStatus,
): readonly BlogPostStatus[] {
  return blogPostStatusTransitions[status];
}

export function canTransitionBlogPostStatus(
  from: BlogPostStatus,
  to: BlogPostStatus,
): boolean {
  return getAllowedBlogPostStatusTransitions(from).includes(to);
}

export function assertBlogPostStatusTransition(
  from: BlogPostStatus,
  to: BlogPostStatus,
): void {
  if (!canTransitionBlogPostStatus(from, to)) {
    throw new Error(`invalid blog post status transition: ${from} -> ${to}`);
  }
}

export function getPublishJobImportance(
  type: PublishJobType,
): PublishJobImportance {
  return (requiredPublishJobTypes as readonly string[]).includes(type)
    ? "required"
    : "retryable";
}

export type PostRecord = {
  articleMode: BlogArticleMode;
  createdAt: Timestamp;
  currentVersionId: string | null;
  description: string;
  id: string;
  publishedAt: Timestamp | null;
  retractedAt: Timestamp | null;
  slug: string;
  status: BlogPostStatus;
  title: string;
  unpublishedAt: Timestamp | null;
  updatedAt: Timestamp;
};

export type PostVersionRecord = {
  contentHash: string;
  contentHtml: string;
  contentMarkdown: string;
  createdAt: Timestamp;
  createdBy: PostVersionCreatedBy;
  description: string;
  id: string;
  personaVersionId: string | null;
  postId: string;
  researchPackId: string | null;
  title: string;
  versionNo: number;
};

export type PostSourceRecord = {
  fetchedAt: Timestamp;
  id: string;
  postId: string;
  publisher: string;
  researchPackId: string | null;
  snapshotHash: string;
  sourceRole: PostSourceRole;
  summary: string;
  title: string;
  url: string;
};

export type PostTagRecord = {
  createdAt: Timestamp;
  id: string;
  postId: string;
  tag: string;
};

export type PublishJobRecord = {
  error: string | null;
  finishedAt: Timestamp | null;
  id: string;
  idempotencyKey: string;
  importance: PublishJobImportance;
  postId: string;
  postVersionId: string;
  retryCount: number;
  startedAt: Timestamp | null;
  status: PublishJobStatus;
  type: PublishJobType;
};

export type PublishJobFailureInput = {
  error: string;
  finishedAt: Timestamp;
  job: PublishJobRecord;
  postStatus: BlogPostStatus;
};

export type PublishJobFailureResult = {
  job: PublishJobRecord;
  postStatus: BlogPostStatus;
};

export function recordPublishJobFailure(
  input: PublishJobFailureInput,
): PublishJobFailureResult {
  const importance = getPublishJobImportance(input.job.type);
  const error = input.error.trim();

  if (!error) {
    throw new Error(`publish job ${input.job.id}: failure error is required`);
  }

  return {
    job: {
      ...input.job,
      error,
      finishedAt: input.finishedAt,
      importance,
      retryCount:
        input.job.retryCount + (importance === "retryable" ? 1 : 0),
      status: importance === "required" ? "failed" : "retrying",
    },
    postStatus:
      importance === "required"
        ? getRequiredPublishJobFailureStatus(input.postStatus, input.job.type)
        : input.postStatus,
  };
}

function getRequiredPublishJobFailureStatus(
  postStatus: BlogPostStatus,
  jobType: PublishJobType,
): BlogPostStatus {
  if (postStatus === "publishing") {
    return "failed_publish";
  }

  if (postStatus === "verifying") {
    return "failed_verification";
  }

  throw new Error(
    `required publish job ${jobType} failed outside publish flow: ${postStatus}`,
  );
}

export type AdminActionRecord = {
  actionType: AdminActionType;
  actorId: string;
  actorType: AdminActionActorType;
  createdAt: Timestamp;
  id: string;
  reason: string | null;
  targetId: string;
  targetType: AdminActionTargetType;
};

export type PostVersionContent = Pick<
  PostVersionRecord,
  "contentMarkdown" | "contentHtml"
>;

export type CanonicalPostVersionContent = PostVersionContent & {
  contentHash: string;
};

export type PublicBlogRouteEntry = {
  post: PostRecord;
  version: PostVersionRecord;
};

export function createPostVersionContentHash(content: PostVersionContent): string {
  return createHash("sha256")
    .update("h-log/post-version-content/v1")
    .update("\0markdown\0")
    .update(content.contentMarkdown)
    .update("\0html\0")
    .update(content.contentHtml)
    .digest("hex");
}

export function createPostVersionContentFromMarkdown(
  markdown: string,
): CanonicalPostVersionContent {
  const contentMarkdown = normalizePostVersionMarkdown(markdown);
  const contentHtml = renderMarkdownToSanitizedHtml(contentMarkdown);
  const content = { contentMarkdown, contentHtml };

  return {
    ...content,
    contentHash: createPostVersionContentHash(content),
  };
}

export function assertPostVersionContentHashMatches(
  version: PostVersionRecord,
): void {
  const expectedHash = createPostVersionContentHash(version);

  if (version.contentHash !== expectedHash) {
    throw new Error(`post_version ${version.id}: content_hash mismatch`);
  }
}

export function renderCrawlerMarkdownForPostVersion(
  version: PostVersionRecord,
): string {
  assertPostVersionContentHashMatches(version);
  return version.contentMarkdown;
}

export function isCurrentPublishedVersion(
  post: PostRecord,
  version: PostVersionRecord,
): boolean {
  return (
    post.status === "published" &&
    post.currentVersionId === version.id &&
    post.id === version.postId
  );
}

export function selectPublicBlogRouteEntries(
  posts: readonly PostRecord[],
  versions: readonly PostVersionRecord[],
): PublicBlogRouteEntry[] {
  const versionsById = new Map(versions.map((version) => [version.id, version]));

  return posts.flatMap((post) => {
    if (post.status !== "published" || post.currentVersionId === null) {
      return [];
    }

    const version = versionsById.get(post.currentVersionId);

    if (!version || !isCurrentPublishedVersion(post, version)) {
      return [];
    }

    return [{ post, version }];
  });
}

export function selectPublicBlogRouteEntryBySlug(
  slug: string,
  posts: readonly PostRecord[],
  versions: readonly PostVersionRecord[],
): PublicBlogRouteEntry | undefined {
  return selectPublicBlogRouteEntries(posts, versions).find(
    (entry) => entry.post.slug === slug,
  );
}

function normalizePostVersionMarkdown(markdown: string): string {
  const normalized = markdown.replace(/\r\n?/g, "\n").trimEnd();

  return normalized ? `${normalized}\n` : "";
}

function renderMarkdownToSanitizedHtml(markdown: string): string {
  const blocks = markdown.trimEnd().split(/\n{2,}/).filter(Boolean);

  return blocks.map(renderMarkdownBlock).join("\n");
}

function renderMarkdownBlock(block: string): string {
  if (block.startsWith("### ")) {
    return `<h3>${renderInlineMarkdown(block.slice(4).trim())}</h3>`;
  }

  if (block.startsWith("## ")) {
    return `<h2>${renderInlineMarkdown(block.slice(3).trim())}</h2>`;
  }

  if (block.startsWith("# ")) {
    return `<h1>${renderInlineMarkdown(block.slice(2).trim())}</h1>`;
  }

  if (block.startsWith("```") && block.endsWith("```")) {
    const code = block.split("\n").slice(1, -1).join("\n");

    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }

  return `<p>${renderInlineMarkdown(block.replace(/\n+/g, " ").trim())}</p>`;
}

function renderInlineMarkdown(value: string): string {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
