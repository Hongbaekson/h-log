import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPublishJobIdempotencyKey,
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostVersionRecord,
  type PublishJobRecord,
} from "./blog-content-model.ts";
import {
  DEFAULT_POST_PUBLISH_RETRY_LIMIT,
  runPostPublishRetryableJob,
  type PostPublishRetryableJobAdapter,
} from "./blog-post-publish-retryable-jobs.ts";
import type { BlogUsageLedger } from "./blog-usage-ledger.ts";

const baseTimestamp = "2026-06-30T00:00:00.000Z";

function createPost(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    articleMode: "document_analysis",
    createdAt: baseTimestamp,
    currentVersionId: "version-public-seo",
    description: "Post publish SEO automation",
    id: "post-public-seo",
    publishedAt: baseTimestamp,
    retractedAt: null,
    slug: "public-seo",
    status: "published",
    title: "Public SEO",
    unpublishedAt: null,
    updatedAt: baseTimestamp,
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<PostVersionRecord> & { contentMarkdown?: string } = {},
): PostVersionRecord {
  const { contentMarkdown = "# Public SEO\n\nPublished body.\n", ...recordOverrides } =
    overrides;
  const content = createPostVersionContentFromMarkdown(contentMarkdown);

  return {
    ...content,
    createdAt: baseTimestamp,
    createdBy: "admin",
    description: "Post publish SEO automation",
    id: "version-public-seo",
    personaVersionId: null,
    postId: "post-public-seo",
    researchPackId: null,
    title: "Public SEO",
    versionNo: 1,
    ...recordOverrides,
  };
}

function createJob(overrides: Partial<PublishJobRecord> = {}): PublishJobRecord {
  const type = overrides.type ?? "indexnow";
  const version = createVersion({
    id: overrides.postVersionId ?? "version-public-seo",
  });

  return {
    error: null,
    finishedAt: null,
    id: "job-indexnow",
    idempotencyKey: createPublishJobIdempotencyKey(type, version),
    importance: "retryable",
    postId: "post-public-seo",
    postVersionId: "version-public-seo",
    retryCount: 0,
    startedAt: baseTimestamp,
    status: "queued",
    type: "indexnow",
    ...overrides,
  };
}

function createUsageLedger(): BlogUsageLedger {
  return {
    async getUsageCostTotals() {
      return { dailyEstimatedCost: 0, monthlyEstimatedCost: 0 };
    },
    async recordUsageEvent() {},
  };
}

describe("post-publish IndexNow and Discord retryable jobs", () => {
  it("blocks external delivery when the persisted daily budget is exhausted", async () => {
    let calls = 0;
    const usageLedger: BlogUsageLedger = {
      async getUsageCostTotals() {
        return { dailyEstimatedCost: 1, monthlyEstimatedCost: 2 };
      },
      async recordUsageEvent() {},
    };

    const result = await runPostPublishRetryableJob({
      adapter: {
        async submitIndexNow() {
          calls += 1;

          return { provider: "fake-indexnow", status: "success" };
        },
      },
      allowExternalSideEffects: true,
      budgetPolicy: {
        dailyEstimatedCostLimit: 1,
        monthlyEstimatedCostLimit: 10,
      },
      job: createJob(),
      origin: "https://h-log.example",
      post: createPost(),
      postStatus: "published",
      runAt: "2026-06-30T00:00:30.000Z",
      usageLedger,
      version: createVersion(),
    });

    assert.equal(result.status, "budget_exceeded");
    assert.equal(result.job.status, "failed");
    assert.equal(result.job.error, "budget_exceeded");
    assert.equal(result.postStatus, "published");
    assert.equal(result.usageEvent?.status, "budget_exceeded");
    assert.equal(calls, 0);
  });

  it("submits IndexNow through an adapter with a deterministic idempotency key", async () => {
    const calls: string[] = [];
    const idempotencyKey = createPublishJobIdempotencyKey(
      "indexnow",
      createVersion(),
    );
    const adapter: PostPublishRetryableJobAdapter = {
      async submitIndexNow(input) {
        calls.push(input.idempotencyKey);
        assert.deepEqual(input.urlList, ["https://h-log.example/blog/public-seo"]);

        return {
          provider: "fake-indexnow",
          status: "success",
        };
      },
    };

    const result = await runPostPublishRetryableJob({
      adapter,
      allowExternalSideEffects: true,
      job: createJob(),
      origin: "https://h-log.example",
      post: createPost(),
      postStatus: "published",
      runAt: "2026-06-30T00:01:00.000Z",
      usageLedger: createUsageLedger(),
      version: createVersion(),
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.postStatus, "published");
    assert.equal(result.job.status, "succeeded");
    assert.equal(result.job.error, null);
    assert.equal(result.job.retryCount, 0);
    assert.deepEqual(calls, [idempotencyKey]);
    assert.deepEqual(result.usageEvent, {
      createdAt: "2026-06-30T00:01:00.000Z",
      estimatedCost: 0,
      eventType: "indexnow",
      id: "job-indexnow:0:indexnow:success",
      idempotencyKey,
      inputTokens: null,
      model: null,
      outputTokens: null,
      provider: "fake-indexnow",
      runId: "job-indexnow",
      status: "success",
    });
  });

  it("keeps a published post public when Discord delivery fails", async () => {
    const idempotencyKey = createPublishJobIdempotencyKey(
      "discord",
      createVersion(),
    );
    const adapter: PostPublishRetryableJobAdapter = {
      async sendDiscordNotification(input) {
        assert.equal(input.href, "https://h-log.example/blog/public-seo");
        assert.equal(input.title, "Public SEO");
        throw new Error("Discord webhook returned 503");
      },
    };

    const result = await runPostPublishRetryableJob({
      adapter,
      allowExternalSideEffects: true,
      job: createJob({
        id: "job-discord",
        type: "discord",
      }),
      origin: "https://h-log.example",
      post: createPost(),
      postStatus: "published",
      runAt: "2026-06-30T00:02:00.000Z",
      usageLedger: createUsageLedger(),
      version: createVersion(),
    });

    assert.equal(result.status, "failed_retry_scheduled");
    assert.equal(result.postStatus, "published");
    assert.equal(result.job.status, "retrying");
    assert.equal(result.job.retryCount, 1);
    assert.equal(result.job.error, "Discord webhook returned 503");
    assert.equal(result.operatorAlert, null);
    assert.deepEqual(result.usageEvent, {
      createdAt: "2026-06-30T00:02:00.000Z",
      estimatedCost: 0,
      eventType: "discord",
      id: "job-discord:0:discord:failed",
      idempotencyKey,
      inputTokens: null,
      model: null,
      outputTokens: null,
      provider: "discord",
      runId: "job-discord",
      status: "failed",
    });
  });

  it("stops retrying after the retry limit and records an operator alert", async () => {
    let calls = 0;
    const adapter: PostPublishRetryableJobAdapter = {
      async submitIndexNow() {
        calls += 1;
        throw new Error("IndexNow timeout");
      },
    };

    const result = await runPostPublishRetryableJob({
      adapter,
      allowExternalSideEffects: true,
      job: createJob({
        retryCount: DEFAULT_POST_PUBLISH_RETRY_LIMIT - 1,
      }),
      origin: "https://h-log.example",
      post: createPost(),
      postStatus: "published",
      runAt: "2026-06-30T00:03:00.000Z",
      usageLedger: createUsageLedger(),
      version: createVersion(),
    });

    assert.equal(result.status, "retry_limit_reached");
    assert.equal(result.postStatus, "published");
    assert.equal(result.job.status, "failed");
    assert.equal(result.job.retryCount, DEFAULT_POST_PUBLISH_RETRY_LIMIT);
    assert.equal(result.operatorAlert?.jobType, "indexnow");
    assert.match(result.operatorAlert?.reason ?? "", /retry limit reached/);
    assert.equal(calls, 1);
  });

  it("does not call external adapters unless side effects are explicitly enabled", async () => {
    let calls = 0;
    const adapter: PostPublishRetryableJobAdapter = {
      async submitIndexNow() {
        calls += 1;

        return {
          provider: "fake-indexnow",
          status: "success",
        };
      },
    };

    const result = await runPostPublishRetryableJob({
      adapter,
      job: createJob(),
      origin: "https://h-log.example",
      post: createPost(),
      postStatus: "published",
      runAt: "2026-06-30T00:04:00.000Z",
      version: createVersion(),
    });

    assert.equal(result.status, "side_effect_disabled");
    assert.equal(result.postStatus, "published");
    assert.equal(result.job.status, "queued");
    assert.equal(result.usageEvent, null);
    assert.equal(calls, 0);
  });

  it("rejects non-deterministic idempotency keys before adapter calls", async () => {
    let calls = 0;
    const expectedKey = createPublishJobIdempotencyKey(
      "indexnow",
      createVersion(),
    );
    const adapter: PostPublishRetryableJobAdapter = {
      async submitIndexNow() {
        calls += 1;

        return {
          provider: "fake-indexnow",
          status: "success",
        };
      },
    };

    await assert.rejects(
      runPostPublishRetryableJob({
        adapter,
        allowExternalSideEffects: true,
        job: createJob({
          idempotencyKey: "random-key",
        }),
        origin: "https://h-log.example",
        post: createPost(),
        postStatus: "published",
        runAt: "2026-06-30T00:05:00.000Z",
        version: createVersion(),
      }),
      new RegExp(`expected idempotency key ${expectedKey}`),
    );
    assert.equal(calls, 0);
  });
});
