import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPublicBlogPostBySlug } from "./blog-public.ts";
import {
  previewAdminPostDraft,
  publishAdminPostVersion,
  saveAdminPostDraft,
  type AdminPostDraftInput,
  type BlogAdminStore,
} from "./blog-admin.ts";

const baseTimestamp = "2026-06-26T00:00:00.000Z";

function createEmptyAdminStore(): BlogAdminStore {
  return {
    adminActions: [],
    posts: [],
    sources: [],
    tags: [],
    versions: [],
  };
}

function createDraftInput(overrides: Partial<AdminPostDraftInput> = {}): AdminPostDraftInput {
  return {
    articleMode: "document_analysis",
    contentMarkdown: "# Admin Preview\n\n저장 후 공개 전까지는 public route에 노출되지 않는다.\n",
    createdAt: baseTimestamp,
    description: "관리자 수동 발행 미리보기",
    postId: "post-admin-preview",
    reason: "manual publishing test",
    slug: "admin-preview",
    sources: [
      {
        publisher: "H-Log",
        sourceRole: "reference",
        summary: "수동 발행 워크플로우 기준",
        title: "H-Log manual publishing workflow",
        url: "https://example.com/h-log/manual-publishing",
      },
    ],
    tags: ["운영", "DB"],
    title: "Admin Preview",
    versionId: "version-admin-preview",
    ...overrides,
  };
}

describe("minimal admin preview/save/publish workflow", () => {
  it("previews and saves a draft without exposing it to public blog routes", () => {
    const preview = previewAdminPostDraft(createDraftInput());
    const saved = saveAdminPostDraft(createEmptyAdminStore(), createDraftInput());

    assert.match(preview.contentHtml, /<h1>Admin Preview<\/h1>/);
    assert.equal(saved.post.status, "ready_to_publish");
    assert.equal(saved.post.currentVersionId, "version-admin-preview");
    assert.equal(saved.adminAction.actionType, "save");
    assert.equal(saved.store.adminActions.at(-1)?.targetId, "post-admin-preview");
    assert.equal(getPublicBlogPostBySlug("admin-preview", saved.store), undefined);
  });

  it("rejects source URLs that are not safe public HTTPS links", () => {
    assert.throws(
      () =>
        saveAdminPostDraft(
          createEmptyAdminStore(),
          createDraftInput({
            sources: [
              {
                publisher: "Injected",
                sourceRole: "reference",
                summary: "unsafe source",
                title: "Injected source",
                url: "javascript:alert(1)",
              },
            ],
          }),
        ),
      /source url must be an absolute HTTPS URL/,
    );
  });

  it("publishes a saved version through the public boundary and records an audit action", () => {
    const saved = saveAdminPostDraft(createEmptyAdminStore(), createDraftInput());
    const published = publishAdminPostVersion(saved.store, {
      createdAt: "2026-06-26T01:00:00.000Z",
      postId: "post-admin-preview",
      reason: "manual publish",
      versionId: "version-admin-preview",
    });
    const publicPost = getPublicBlogPostBySlug("admin-preview", published.store);

    assert.ok(publicPost);
    assert.equal(publicPost.title, "Admin Preview");
    assert.equal(published.post.status, "published");
    assert.equal(published.post.publishedAt, "2026-06-26T01:00:00.000Z");
    assert.equal(published.adminAction.actionType, "publish");
    assert.deepEqual(
      published.store.adminActions.map((action) => action.actionType),
      ["save", "publish"],
    );
  });
});
