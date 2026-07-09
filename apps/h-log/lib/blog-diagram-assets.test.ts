import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import {
  planDiagramGenerationJob,
  recordDiagramAssetAuditAction,
  recordDiagramGenerationFailure,
  storeDiagramAsset,
} from "./blog-diagram-assets.ts";

const baseTimestamp = "2026-07-08T00:00:00.000Z";

function createPost(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    articleMode: "applied_analysis",
    createdAt: baseTimestamp,
    currentVersionId: "version-diagram",
    description: "Diagram trigger policy",
    id: "post-diagram",
    publishedAt: baseTimestamp,
    retractedAt: null,
    slug: "diagram-trigger-policy",
    status: "published",
    title: "Diagram trigger policy",
    unpublishedAt: null,
    updatedAt: baseTimestamp,
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<PostVersionRecord> & { contentMarkdown?: string } = {},
): PostVersionRecord {
  const {
    contentMarkdown = "# Diagram trigger policy\n\nArchitecture flow.\n",
    ...recordOverrides
  } = overrides;
  const content = createPostVersionContentFromMarkdown(contentMarkdown);

  return {
    ...content,
    createdAt: baseTimestamp,
    createdBy: "system",
    description: "Diagram trigger policy",
    id: "version-diagram",
    personaVersionId: "hlog-persona-v1",
    postId: "post-diagram",
    researchPackId: "research-pack-diagram",
    title: "Diagram trigger policy",
    versionNo: 1,
    ...recordOverrides,
  };
}

describe("diagram asset trigger policy", () => {
  it("does not schedule diagram generation for every article", () => {
    const plan = planDiagramGenerationJob({
      diagramJobsCreatedToday: 0,
      post: createPost({
        articleMode: "document_analysis",
        slug: "runtime-release-summary",
      }),
      runAt: baseTimestamp,
      topics: ["release-note", "tutorial"],
      version: createVersion(),
    });

    assert.equal(plan.status, "skipped");
    assert.equal(plan.reason, "unsupported_topic");
    assert.equal(plan.job, null);
  });

  it("schedules one retryable diagram job for architecture, workflow, infra, or data-flow topics", () => {
    const plan = planDiagramGenerationJob({
      diagramJobsCreatedToday: 0,
      post: createPost(),
      runAt: baseTimestamp,
      topics: ["workflow", "runtime"],
      version: createVersion(),
    });

    assert.equal(plan.status, "scheduled");
    assert.equal(plan.reason, null);
    assert.equal(plan.triggerTopic, "workflow");
    assert.equal(plan.job?.type, "diagram");
    assert.equal(plan.job?.importance, "retryable");
    assert.equal(
      plan.job?.idempotencyKey,
      "post-diagram:version-diagram:diagram",
    );
  });

  it("does not create a diagram job when the daily diagram quota is exhausted", () => {
    const plan = planDiagramGenerationJob({
      diagramJobsCreatedToday: 1,
      policy: {
        diagramGenerationMax: 1,
      },
      post: createPost(),
      runAt: baseTimestamp,
      topics: ["architecture"],
      version: createVersion(),
    });

    assert.equal(plan.status, "skipped");
    assert.equal(plan.reason, "quota_exceeded");
    assert.equal(plan.job, null);
  });

  it("records diagram generation failure as retryable without hiding the published post", () => {
    const plan = planDiagramGenerationJob({
      diagramJobsCreatedToday: 0,
      post: createPost(),
      runAt: baseTimestamp,
      topics: ["data-flow"],
      version: createVersion(),
    });

    assert.ok(plan.job);

    const result = recordDiagramGenerationFailure({
      error: "diagram provider timeout",
      finishedAt: "2026-07-08T00:01:00.000Z",
      job: plan.job,
      postStatus: "published",
    });

    assert.equal(result.postStatus, "published");
    assert.equal(result.job.status, "retrying");
    assert.equal(result.job.retryCount, 1);
    assert.equal(result.job.importance, "retryable");
    assert.equal(result.job.error, "diagram provider timeout");
  });
});

describe("diagram asset storage policy", () => {
  it("rejects diagram assets without alt text", () => {
    assert.throws(
      () =>
        storeDiagramAsset({
          alt: " ",
          assetPath: "/blog-assets/diagrams/diagram-trigger-policy.svg",
          createdAt: baseTimestamp,
          generatedBy: "handdrawn-diagram",
          id: "asset-diagram",
          post: createPost(),
          version: createVersion(),
        }),
      /alt text is required/,
    );
  });

  it("stores diagram assets with public-safe paths bound to a post version", () => {
    const asset = storeDiagramAsset({
      alt: "Workflow from source collection to published article",
      assetPath: "/blog-assets/diagrams/diagram-trigger-policy.svg",
      createdAt: baseTimestamp,
      generatedBy: "handdrawn-diagram",
      id: "asset-diagram",
      post: createPost(),
      version: createVersion(),
    });

    assert.deepEqual(asset, {
      alt: "Workflow from source collection to published article",
      createdAt: baseTimestamp,
      generatedBy: "handdrawn-diagram",
      id: "asset-diagram",
      path: "/blog-assets/diagrams/diagram-trigger-policy.svg",
      postId: "post-diagram",
      postVersionId: "version-diagram",
      type: "diagram",
    });
  });

  it("rejects private or local diagram asset paths", () => {
    assert.throws(
      () =>
        storeDiagramAsset({
          alt: "Unsafe diagram",
          assetPath: "D:\\personal-portfolio\\apps\\h-log\\private.svg",
          createdAt: baseTimestamp,
          generatedBy: "handdrawn-diagram",
          id: "asset-diagram",
          post: createPost(),
          version: createVersion(),
        }),
      /public-safe asset path/,
    );
  });

  it("keeps diagram asset replacement and deletion auditable", () => {
    const audit = recordDiagramAssetAuditAction({
      action: "replace",
      actorId: "system",
      createdAt: baseTimestamp,
      id: "asset-audit-1",
      postAssetId: "asset-diagram",
      reason: "diagram layout updated after content revision",
    });

    assert.deepEqual(audit, {
      action: "replace",
      actorId: "system",
      createdAt: baseTimestamp,
      id: "asset-audit-1",
      postAssetId: "asset-diagram",
      reason: "diagram layout updated after content revision",
    });
  });
});
