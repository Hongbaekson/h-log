import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PostRecord } from "./blog-content-model.ts";
import { retractAdminPost, type BlogAdminStore } from "./blog-admin.ts";

const timestamp = "2026-06-26T00:00:00.000Z";
const publishedPost: PostRecord = {
  articleMode: "document_analysis",
  createdAt: timestamp,
  currentVersionId: "version-admin-retract",
  description: "관리자 회수 검증",
  id: "post-admin-retract",
  publishedAt: timestamp,
  retractedAt: null,
  slug: "admin-retract",
  status: "published",
  title: "Admin retract",
  unpublishedAt: null,
  updatedAt: timestamp,
};

function createStore(): BlogAdminStore {
  return {
    adminActions: [],
    posts: [publishedPost],
  };
}

describe("blog admin retract", () => {
  it("retracts a published post and records the admin action", () => {
    const createdAt = "2026-06-26T01:00:00.000Z";
    const result = retractAdminPost(createStore(), {
      actorId: "cli:operator",
      actorType: "cli",
      createdAt,
      postId: publishedPost.id,
      reason: "Retract article after verification failure",
    });

    assert.equal(result.post.status, "retracted");
    assert.equal(result.post.retractedAt, createdAt);
    assert.equal(result.store.posts.at(-1), result.post);
    assert.deepEqual(result.adminAction, {
      actionType: "retract",
      actorId: "cli:operator",
      actorType: "cli",
      createdAt,
      id: `retract:post:${publishedPost.id}:${createdAt}`,
      reason: "Retract article after verification failure",
      targetId: publishedPost.id,
      targetType: "post",
    });
    assert.equal(result.store.adminActions.at(-1), result.adminAction);
  });

  it("rejects missing or unsafe audit text", () => {
    assert.throws(
      () =>
        retractAdminPost(createStore(), {
          createdAt: timestamp,
          postId: publishedPost.id,
          reason: " ",
        }),
      /admin action reason is required/,
    );
    assert.throws(
      () =>
        retractAdminPost(createStore(), {
          actorId: "https://admin.example.com",
          createdAt: timestamp,
          postId: publishedPost.id,
          reason: "Manual retraction",
        }),
      /admin action actor id must not contain URLs or private host details/,
    );
    assert.throws(
      () =>
        retractAdminPost(createStore(), {
          createdAt: timestamp,
          postId: publishedPost.id,
          reason: "token=redacted",
        }),
      /admin action reason must not contain URLs or private host details/,
    );
  });
});
