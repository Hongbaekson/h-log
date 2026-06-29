import {
  assertBlogPostStatusTransition,
  createPostVersionContentFromMarkdown,
  type AdminActionRecord,
  type AdminActionActorType,
  type AdminActionTargetType,
  type AdminActionType,
  type BlogArticleMode,
  type BlogPostStatus,
  type PostCorrectionCreatedBy,
  type PostCorrectionRecord,
  type PostRecord,
  type PostSourceRecord,
  type PostSourceRole,
  type PostTagRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import { normalizePublicSourceUrl } from "./public-source-url.ts";

export type BlogAdminStore = BlogContentStore & {
  adminActions: readonly AdminActionRecord[];
  corrections: readonly PostCorrectionRecord[];
};

export type AdminActionActorInput = {
  actorId?: string;
  actorType?: AdminActionActorType;
};

export type AdminOperationalActionType = Exclude<
  AdminActionType,
  "preview" | "save" | "publish"
>;

export type AdminSourceInput = {
  publisher: string;
  sourceRole: PostSourceRole;
  summary: string;
  title: string;
  url: string;
};

export type AdminPostDraftInput = AdminActionActorInput & {
  articleMode: BlogArticleMode;
  contentMarkdown: string;
  createdAt: string;
  description: string;
  postId: string;
  reason?: string;
  slug: string;
  sources: readonly AdminSourceInput[];
  tags: readonly string[];
  title: string;
  versionId: string;
};

export type AdminPublishInput = AdminActionActorInput & {
  createdAt: string;
  postId: string;
  reason?: string;
  versionId: string;
};

export type AdminPostCorrectionRequestInput = AdminActionActorInput & {
  createdAt: string;
  postId: string;
  reason: string;
};

export type AdminPostCorrectionInput = AdminActionActorInput & {
  contentMarkdown: string;
  createdAt: string;
  description: string;
  postId: string;
  reason: string;
  title: string;
  versionId: string;
};

export type AdminPostVisibilityInput = AdminActionActorInput & {
  createdAt: string;
  postId: string;
  reason: string;
};

export type AdminOperationalActionInput = {
  actionType: AdminOperationalActionType;
  actorId: string;
  actorType: AdminActionActorType;
  createdAt: string;
  reason: string;
  targetId: string;
  targetType: AdminActionTargetType;
};

export type AdminPostPreview = {
  contentHash: string;
  contentHtml: string;
  contentMarkdown: string;
  description: string;
  slug: string;
  tags: string[];
  title: string;
};

export function previewAdminPostDraft(input: AdminPostDraftInput): AdminPostPreview {
  const content = createPostVersionContentFromMarkdown(input.contentMarkdown);

  return {
    ...content,
    description: input.description,
    slug: input.slug,
    tags: normalizeTags(input.tags),
    title: input.title,
  };
}

export function saveAdminPostDraft(
  store: BlogAdminStore,
  input: AdminPostDraftInput,
): {
  adminAction: AdminActionRecord;
  post: PostRecord;
  store: BlogAdminStore;
  version: PostVersionRecord;
} {
  const content = createPostVersionContentFromMarkdown(input.contentMarkdown);
  const post: PostRecord = {
    articleMode: input.articleMode,
    createdAt: input.createdAt,
    currentVersionId: input.versionId,
    description: input.description,
    id: input.postId,
    publishedAt: null,
    retractedAt: null,
    slug: input.slug,
    status: "ready_to_publish",
    title: input.title,
    unpublishedAt: null,
    updatedAt: input.createdAt,
  };
  const version: PostVersionRecord = {
    ...content,
    createdAt: input.createdAt,
    createdBy: "admin",
    description: input.description,
    id: input.versionId,
    personaVersionId: null,
    postId: input.postId,
    researchPackId: null,
    title: input.title,
    versionNo: 1,
  };
  const sourceRecords = input.sources.map((source, index): PostSourceRecord => ({
    fetchedAt: input.createdAt,
    id: `${input.postId}-source-${index + 1}`,
    postId: input.postId,
    publisher: source.publisher,
    researchPackId: null,
    snapshotHash: "",
    sourceRole: source.sourceRole,
    summary: source.summary,
    title: source.title,
    url: normalizePublicSourceUrl(source.url),
  }));
  const tagRecords = normalizeTags(input.tags).map((tag): PostTagRecord => ({
    createdAt: input.createdAt,
    id: `${input.postId}-${tag}`,
    postId: input.postId,
    tag,
  }));
  const adminAction = createAdminAction({
    actionType: "save",
    actorId: input.actorId,
    actorType: input.actorType,
    createdAt: input.createdAt,
    reason: input.reason,
    targetId: input.postId,
    targetType: "post",
  });

  return {
    adminAction,
    post,
    store: {
      adminActions: [...store.adminActions, adminAction],
      corrections: store.corrections,
      posts: upsertById(store.posts, post),
      sources: replacePostScopedRecords(store.sources, input.postId, sourceRecords),
      tags: replacePostScopedRecords(store.tags, input.postId, tagRecords),
      versions: upsertById(store.versions, version),
    },
    version,
  };
}

export function publishAdminPostVersion(
  store: BlogAdminStore,
  input: AdminPublishInput,
): {
  adminAction: AdminActionRecord;
  post: PostRecord;
  store: BlogAdminStore;
} {
  const existingPost = store.posts.find((post) => post.id === input.postId);
  const version = store.versions.find((item) => item.id === input.versionId);

  if (!existingPost) {
    throw new Error(`post ${input.postId}: not found`);
  }

  if (!version || version.postId !== existingPost.id) {
    throw new Error(`post_version ${input.versionId}: not found for post ${input.postId}`);
  }

  assertAdminPublishableStatus(existingPost.status, input.postId);

  const post: PostRecord = {
    ...existingPost,
    currentVersionId: input.versionId,
    publishedAt: input.createdAt,
    retractedAt: null,
    status: "published",
    unpublishedAt: null,
    updatedAt: input.createdAt,
  };
  const adminAction = createAdminAction({
    actionType: "publish",
    actorId: input.actorId,
    actorType: input.actorType,
    createdAt: input.createdAt,
    reason: input.reason,
    targetId: input.postId,
    targetType: "post",
  });

  return {
    adminAction,
    post,
    store: {
      ...store,
      adminActions: [...store.adminActions, adminAction],
      posts: upsertById(store.posts, post),
    },
  };
}

export function startAdminPostCorrection(
  store: BlogAdminStore,
  input: AdminPostCorrectionRequestInput,
): {
  adminAction: AdminActionRecord;
  post: PostRecord;
  store: BlogAdminStore;
} {
  const existingPost = findPostById(store.posts, input.postId);

  assertBlogPostStatusTransition(existingPost.status, "correction_pending");

  const post: PostRecord = {
    ...existingPost,
    status: "correction_pending",
    updatedAt: input.createdAt,
  };
  const adminAction = createAdminAction({
    actionType: "correct",
    actorId: input.actorId,
    actorType: input.actorType,
    createdAt: input.createdAt,
    reason: input.reason,
    requireReason: true,
    targetId: input.postId,
    targetType: "post",
  });

  return {
    adminAction,
    post,
    store: {
      ...store,
      adminActions: [...store.adminActions, adminAction],
      posts: upsertById(store.posts, post),
    },
  };
}

export function applyAdminPostCorrection(
  store: BlogAdminStore,
  input: AdminPostCorrectionInput,
): {
  adminAction: AdminActionRecord;
  correction: PostCorrectionRecord;
  post: PostRecord;
  store: BlogAdminStore;
  version: PostVersionRecord;
} {
  const existingPost = findPostById(store.posts, input.postId);
  const previousVersion = findCurrentVersion(store.versions, existingPost);
  const content = createPostVersionContentFromMarkdown(input.contentMarkdown);

  assertBlogPostStatusTransition(existingPost.status, "corrected");

  const version: PostVersionRecord = {
    ...content,
    createdAt: input.createdAt,
    createdBy: normalizeCorrectionRecordActor(input.actorType),
    description: input.description,
    id: input.versionId,
    personaVersionId: previousVersion.personaVersionId,
    postId: input.postId,
    researchPackId: previousVersion.researchPackId,
    title: input.title,
    versionNo: previousVersion.versionNo + 1,
  };
  const adminAction = createAdminAction({
    actionType: "correct",
    actorId: input.actorId,
    actorType: input.actorType,
    createdAt: input.createdAt,
    reason: input.reason,
    requireReason: true,
    targetId: input.versionId,
    targetType: "post_version",
  });
  const correction: PostCorrectionRecord = {
    correctedAt: input.createdAt,
    correctedBy: normalizeCorrectionRecordActor(input.actorType),
    correctedContentHash: version.contentHash,
    id: `correction:${input.postId}:${input.versionId}:${input.createdAt}`,
    postId: input.postId,
    postVersionId: input.versionId,
    previousContentHash: previousVersion.contentHash,
    reason: adminAction.reason ?? "",
  };
  const post: PostRecord = {
    ...existingPost,
    currentVersionId: input.versionId,
    description: input.description,
    status: "corrected",
    title: input.title,
    updatedAt: input.createdAt,
  };

  return {
    adminAction,
    correction,
    post,
    store: {
      ...store,
      adminActions: [...store.adminActions, adminAction],
      corrections: [...store.corrections, correction],
      posts: upsertById(store.posts, post),
      versions: upsertById(store.versions, version),
    },
    version,
  };
}

export function unpublishAdminPost(
  store: BlogAdminStore,
  input: AdminPostVisibilityInput,
): {
  adminAction: AdminActionRecord;
  post: PostRecord;
  store: BlogAdminStore;
} {
  return updateAdminPostVisibility(store, input, "unpublished");
}

export function retractAdminPost(
  store: BlogAdminStore,
  input: AdminPostVisibilityInput,
): {
  adminAction: AdminActionRecord;
  post: PostRecord;
  store: BlogAdminStore;
} {
  return updateAdminPostVisibility(store, input, "retracted");
}

export function recordAdminOperationalAction(
  store: BlogAdminStore,
  input: AdminOperationalActionInput,
): {
  adminAction: AdminActionRecord;
  store: BlogAdminStore;
} {
  const adminAction = createAdminAction({
    actionType: input.actionType,
    actorId: input.actorId,
    actorType: input.actorType,
    createdAt: input.createdAt,
    reason: input.reason,
    requireReason: true,
    targetId: input.targetId,
    targetType: input.targetType,
  });

  return {
    adminAction,
    store: {
      ...store,
      adminActions: [...store.adminActions, adminAction],
    },
  };
}

function updateAdminPostVisibility(
  store: BlogAdminStore,
  input: AdminPostVisibilityInput,
  status: Extract<BlogPostStatus, "unpublished" | "retracted">,
): {
  adminAction: AdminActionRecord;
  post: PostRecord;
  store: BlogAdminStore;
} {
  const existingPost = findPostById(store.posts, input.postId);

  assertBlogPostStatusTransition(existingPost.status, status);

  const post: PostRecord = {
    ...existingPost,
    retractedAt: status === "retracted" ? input.createdAt : existingPost.retractedAt,
    status,
    unpublishedAt:
      status === "unpublished" ? input.createdAt : existingPost.unpublishedAt,
    updatedAt: input.createdAt,
  };
  const adminAction = createAdminAction({
    actionType: status === "retracted" ? "retract" : "unpublish",
    actorId: input.actorId,
    actorType: input.actorType,
    createdAt: input.createdAt,
    reason: input.reason,
    requireReason: true,
    targetId: input.postId,
    targetType: "post",
  });

  return {
    adminAction,
    post,
    store: {
      ...store,
      adminActions: [...store.adminActions, adminAction],
      posts: upsertById(store.posts, post),
    },
  };
}

function assertAdminPublishableStatus(
  status: BlogPostStatus,
  postId: string,
): void {
  if (status !== "ready_to_publish" && status !== "corrected") {
    throw new Error(`post ${postId}: cannot publish from ${status}`);
  }
}

function createAdminAction(
  input: Omit<AdminActionRecord, "actorId" | "actorType" | "id" | "reason"> & {
    actorId?: string;
    actorType?: AdminActionActorType;
    reason?: string;
    requireReason?: boolean;
  },
): AdminActionRecord {
  const {
    actorId: actorIdInput,
    actorType: actorTypeInput,
    reason: reasonInput,
    requireReason = false,
    ...recordInput
  } = input;
  const actorId = normalizeAdminActorId(actorIdInput);
  const actorType = actorTypeInput ?? "admin";
  const reason = normalizeAdminActionReason(reasonInput, {
    requireReason,
  });

  return {
    ...recordInput,
    actorId,
    actorType,
    id: `${recordInput.actionType}:${recordInput.targetType}:${recordInput.targetId}:${recordInput.createdAt}`,
    reason,
  };
}

function normalizeAdminActorId(actorId: string | undefined): string {
  const normalized = actorId?.trim() || "manual-admin";

  if (hasUnsafeAuditText(normalized)) {
    throw new Error("admin action actor id must not contain URLs or private host details");
  }

  return normalized;
}

function normalizeAdminActionReason(
  reason: string | undefined,
  options: { requireReason: boolean },
): string | null {
  const normalized = reason?.trim() ?? "";

  if (!normalized) {
    if (options.requireReason) {
      throw new Error("admin action reason is required");
    }

    return null;
  }

  if (hasUnsafeAuditText(normalized)) {
    throw new Error("admin action reason must not contain URLs or private host details");
  }

  return normalized;
}

function hasUnsafeAuditText(value: string): boolean {
  return (
    /https?:\/\//i.test(value) ||
    /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b/i.test(value) ||
    /\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/.test(value) ||
    /\b(?:api[_-]?key|token|password|secret)\s*[:=]/i.test(value)
  );
}

function findPostById(posts: readonly PostRecord[], postId: string): PostRecord {
  const post = posts.find((item) => item.id === postId);

  if (!post) {
    throw new Error(`post ${postId}: not found`);
  }

  return post;
}

function findCurrentVersion(
  versions: readonly PostVersionRecord[],
  post: PostRecord,
): PostVersionRecord {
  const currentVersionId = post.currentVersionId;

  if (!currentVersionId) {
    throw new Error(`post ${post.id}: current version is required for correction`);
  }

  const version = versions.find(
    (item) => item.id === currentVersionId && item.postId === post.id,
  );

  if (!version) {
    throw new Error(`post_version ${currentVersionId}: not found for post ${post.id}`);
  }

  return version;
}

function normalizeCorrectionRecordActor(
  actorType: AdminActionActorType | undefined,
): PostCorrectionCreatedBy {
  return actorType === "system" ? "system" : "admin";
}

function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();

  return tags.flatMap((tag) => {
    const normalized = tag.trim();

    if (!normalized || seen.has(normalized)) {
      return [];
    }

    seen.add(normalized);
    return [normalized];
  });
}

function upsertById<T extends { id: string }>(records: readonly T[], record: T): T[] {
  const nextRecords = records.filter((item) => item.id !== record.id);
  return [...nextRecords, record];
}

function replacePostScopedRecords<T extends { postId: string }>(
  records: readonly T[],
  postId: string,
  nextRecords: readonly T[],
): T[] {
  return [...records.filter((record) => record.postId !== postId), ...nextRecords];
}
