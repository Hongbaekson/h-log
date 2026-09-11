import {
  assertBlogPostStatusTransition,
  type AdminActionActorType,
  type AdminActionRecord,
  type PostRecord,
} from "./blog-content-model.ts";

export type BlogAdminStore = {
  adminActions: readonly AdminActionRecord[];
  posts: readonly PostRecord[];
};

export type AdminPostVisibilityInput = {
  actorId?: string;
  actorType?: AdminActionActorType;
  createdAt: string;
  postId: string;
  reason: string;
};

export function retractAdminPost(
  store: BlogAdminStore,
  input: AdminPostVisibilityInput,
): {
  adminAction: AdminActionRecord;
  post: PostRecord;
  store: BlogAdminStore;
} {
  const existingPost = store.posts.find((post) => post.id === input.postId);

  if (!existingPost) {
    throw new Error(`post ${input.postId}: not found`);
  }

  assertBlogPostStatusTransition(existingPost.status, "retracted");

  const actorId = input.actorId?.trim() || "manual-admin";
  const reason = input.reason?.trim() ?? "";

  if (hasUnsafeAuditText(actorId)) {
    throw new Error("admin action actor id must not contain URLs or private host details");
  }

  if (!reason) {
    throw new Error("admin action reason is required");
  }

  if (hasUnsafeAuditText(reason)) {
    throw new Error("admin action reason must not contain URLs or private host details");
  }

  const post: PostRecord = {
    ...existingPost,
    retractedAt: input.createdAt,
    status: "retracted",
    updatedAt: input.createdAt,
  };
  const adminAction: AdminActionRecord = {
    actionType: "retract",
    actorId,
    actorType: input.actorType ?? "admin",
    createdAt: input.createdAt,
    id: `retract:post:${input.postId}:${input.createdAt}`,
    reason,
    targetId: input.postId,
    targetType: "post",
  };

  return {
    adminAction,
    post,
    store: {
      adminActions: [...store.adminActions, adminAction],
      posts: [...store.posts.filter((item) => item.id !== post.id), post],
    },
  };
}

function hasUnsafeAuditText(value: string): boolean {
  return (
    /https?:\/\//i.test(value) ||
    /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b/i.test(value) ||
    /\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/.test(value) ||
    /\b(?:api[_-]?key|token|password|secret)\s*[:=]/i.test(value)
  );
}
