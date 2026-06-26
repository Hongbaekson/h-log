import {
  createPostVersionContentFromMarkdown,
  type AdminActionRecord,
  type BlogArticleMode,
  type PostRecord,
  type PostSourceRecord,
  type PostSourceRole,
  type PostTagRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";

export type BlogAdminStore = BlogContentStore & {
  adminActions: readonly AdminActionRecord[];
};

export type AdminSourceInput = {
  publisher: string;
  sourceRole: PostSourceRole;
  summary: string;
  title: string;
  url: string;
};

export type AdminPostDraftInput = {
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

export type AdminPublishInput = {
  createdAt: string;
  postId: string;
  reason?: string;
  versionId: string;
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
    url: source.url,
  }));
  const tagRecords = normalizeTags(input.tags).map((tag): PostTagRecord => ({
    createdAt: input.createdAt,
    id: `${input.postId}-${tag}`,
    postId: input.postId,
    tag,
  }));
  const adminAction = createAdminAction({
    actionType: "save",
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

function createAdminAction(
  input: Omit<AdminActionRecord, "id" | "reason"> & {
    reason?: string;
  },
): AdminActionRecord {
  return {
    ...input,
    id: `${input.actionType}:${input.targetType}:${input.targetId}:${input.createdAt}`,
    reason: input.reason?.trim() || null,
  };
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
