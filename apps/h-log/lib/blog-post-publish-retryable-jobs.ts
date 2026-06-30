import {
  assertPostVersionContentHashMatches,
  getPublishJobImportance,
  isCurrentPublishedVersion,
  recordPublishJobFailure,
  type BlogPostStatus,
  type PostRecord,
  type PostVersionRecord,
  type PublishJobRecord,
  type RetryablePublishJobType,
  type Timestamp,
} from "./blog-content-model.ts";

export const DEFAULT_POST_PUBLISH_RETRY_LIMIT = 3;

export type PostPublishExternalJobType = Extract<
  RetryablePublishJobType,
  "discord" | "indexnow"
>;

export type IndexNowSubmissionInput = {
  contentHash: string;
  idempotencyKey: string;
  postId: string;
  slug: string;
  urlList: readonly string[];
  versionId: string;
};

export type DiscordPublishNotificationInput = {
  contentHash: string;
  href: string;
  idempotencyKey: string;
  postId: string;
  publishedAt: string;
  slug: string;
  title: string;
  versionId: string;
};

export type PostPublishRetryableJobAdapterResult = {
  provider: string;
  status: "failed" | "success";
  error?: string;
};

export type PostPublishRetryableJobAdapter = {
  sendDiscordNotification?(
    input: DiscordPublishNotificationInput,
  ): Promise<PostPublishRetryableJobAdapterResult>;
  submitIndexNow?(
    input: IndexNowSubmissionInput,
  ): Promise<PostPublishRetryableJobAdapterResult>;
};

export type PostPublishUsageEvent = {
  createdAt: Timestamp;
  eventType: PostPublishExternalJobType;
  idempotencyKey: string;
  provider: string;
  status: "failed" | "success";
};

export type PostPublishOperatorAlert = {
  createdAt: Timestamp;
  idempotencyKey: string;
  jobId: string;
  jobType: PostPublishExternalJobType;
  postId: string;
  reason: string;
};

export type RunPostPublishRetryableJobInput = {
  adapter: PostPublishRetryableJobAdapter;
  allowExternalSideEffects?: boolean;
  job: PublishJobRecord;
  maxRetryCount?: number;
  origin: string;
  post: PostRecord;
  postStatus: BlogPostStatus;
  runAt: Timestamp;
  version: PostVersionRecord;
};

export type RunPostPublishRetryableJobResult = {
  job: PublishJobRecord;
  operatorAlert: PostPublishOperatorAlert | null;
  postStatus: BlogPostStatus;
  status:
    | "failed_retry_scheduled"
    | "retry_limit_reached"
    | "side_effect_disabled"
    | "succeeded";
  usageEvent: PostPublishUsageEvent | null;
};

export async function runPostPublishRetryableJob(
  input: RunPostPublishRetryableJobInput,
): Promise<RunPostPublishRetryableJobResult> {
  const jobType = assertPostPublishExternalJob(input.job);
  const maxRetryCount = input.maxRetryCount ?? DEFAULT_POST_PUBLISH_RETRY_LIMIT;

  assertPublishedCurrentVersion(input);
  assertPostPublishJobIdempotency(input.job, input.post, input.version, jobType);

  if (!input.allowExternalSideEffects) {
    return {
      job: input.job,
      operatorAlert: null,
      postStatus: input.postStatus,
      status: "side_effect_disabled",
      usageEvent: null,
    };
  }

  if (input.job.retryCount >= maxRetryCount) {
    return toRetryLimitReachedResult({
      error: `retry limit reached before ${jobType} delivery`,
      input,
      jobType,
      retryCount: input.job.retryCount,
    });
  }

  const adapterResult = await callAdapter(input, jobType);

  if (adapterResult.status === "success") {
    return {
      job: {
        ...input.job,
        error: null,
        finishedAt: input.runAt,
        importance: "retryable",
        status: "succeeded",
      },
      operatorAlert: null,
      postStatus: input.postStatus,
      status: "succeeded",
      usageEvent: toUsageEvent(input, jobType, adapterResult.provider, "success"),
    };
  }

  const failure = recordPublishJobFailure({
    error: adapterResult.error ?? `${jobType} delivery failed`,
    finishedAt: input.runAt,
    job: input.job,
    postStatus: input.postStatus,
  });

  if (failure.job.retryCount >= maxRetryCount) {
    return toRetryLimitReachedResult({
      error: failure.job.error ?? `${jobType} delivery failed`,
      input,
      jobType,
      provider: adapterResult.provider,
      retryCount: failure.job.retryCount,
    });
  }

  return {
    job: failure.job,
    operatorAlert: null,
    postStatus: failure.postStatus,
    status: "failed_retry_scheduled",
    usageEvent: toUsageEvent(input, jobType, adapterResult.provider, "failed"),
  };
}

async function callAdapter(
  input: RunPostPublishRetryableJobInput,
  jobType: PostPublishExternalJobType,
): Promise<PostPublishRetryableJobAdapterResult> {
  try {
    if (jobType === "indexnow") {
      const submitIndexNow = input.adapter.submitIndexNow;

      if (!submitIndexNow) {
        return {
          error: "IndexNow adapter is not configured",
          provider: "indexnow",
          status: "failed",
        };
      }

      return await submitIndexNow(buildIndexNowSubmissionInput(input));
    }

    const sendDiscordNotification = input.adapter.sendDiscordNotification;

    if (!sendDiscordNotification) {
      return {
        error: "Discord adapter is not configured",
        provider: "discord",
        status: "failed",
      };
    }

    return await sendDiscordNotification(buildDiscordPublishNotificationInput(input));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      provider: jobType,
      status: "failed",
    };
  }
}

function buildIndexNowSubmissionInput(
  input: RunPostPublishRetryableJobInput,
): IndexNowSubmissionInput {
  return {
    contentHash: input.version.contentHash,
    idempotencyKey: input.job.idempotencyKey,
    postId: input.post.id,
    slug: input.post.slug,
    urlList: [`${normalizeOrigin(input.origin)}/blog/${input.post.slug}`],
    versionId: input.version.id,
  };
}

function buildDiscordPublishNotificationInput(
  input: RunPostPublishRetryableJobInput,
): DiscordPublishNotificationInput {
  return {
    contentHash: input.version.contentHash,
    href: `${normalizeOrigin(input.origin)}/blog/${input.post.slug}`,
    idempotencyKey: input.job.idempotencyKey,
    postId: input.post.id,
    publishedAt: input.post.publishedAt ?? input.post.updatedAt,
    slug: input.post.slug,
    title: input.version.title,
    versionId: input.version.id,
  };
}

function assertPostPublishExternalJob(
  job: PublishJobRecord,
): PostPublishExternalJobType {
  if (job.type !== "indexnow" && job.type !== "discord") {
    throw new Error(`publish job ${job.id}: unsupported external job ${job.type}`);
  }

  if (getPublishJobImportance(job.type) !== "retryable") {
    throw new Error(`publish job ${job.id}: external job must be retryable`);
  }

  return job.type;
}

function assertPublishedCurrentVersion(
  input: RunPostPublishRetryableJobInput,
): void {
  if (input.postStatus !== "published" || input.post.status !== "published") {
    throw new Error(
      `publish job ${input.job.id}: post must be published before external delivery`,
    );
  }

  if (!isCurrentPublishedVersion(input.post, input.version)) {
    throw new Error(
      `publish job ${input.job.id}: post current version does not match job version`,
    );
  }

  if (
    input.job.postId !== input.post.id ||
    input.job.postVersionId !== input.version.id
  ) {
    throw new Error(`publish job ${input.job.id}: job target does not match post version`);
  }

  assertPostVersionContentHashMatches(input.version);
}

function assertPostPublishJobIdempotency(
  job: PublishJobRecord,
  post: PostRecord,
  version: PostVersionRecord,
  jobType: PostPublishExternalJobType,
): void {
  const expected = `${post.id}:${version.id}:${jobType}`;

  if (job.idempotencyKey !== expected) {
    throw new Error(
      `publish job ${job.id}: expected idempotency key ${expected}, received ${job.idempotencyKey}`,
    );
  }
}

function toRetryLimitReachedResult({
  error,
  input,
  jobType,
  provider,
  retryCount,
}: {
  error: string;
  input: RunPostPublishRetryableJobInput;
  jobType: PostPublishExternalJobType;
  provider?: string;
  retryCount: number;
}): RunPostPublishRetryableJobResult {
  const job: PublishJobRecord = {
    ...input.job,
    error,
    finishedAt: input.runAt,
    importance: "retryable",
    retryCount,
    status: "failed",
  };

  return {
    job,
    operatorAlert: {
      createdAt: input.runAt,
      idempotencyKey: input.job.idempotencyKey,
      jobId: input.job.id,
      jobType,
      postId: input.post.id,
      reason: `${jobType} retry limit reached: ${error}`,
    },
    postStatus: input.postStatus,
    status: "retry_limit_reached",
    usageEvent: provider ? toUsageEvent(input, jobType, provider, "failed") : null,
  };
}

function toUsageEvent(
  input: RunPostPublishRetryableJobInput,
  eventType: PostPublishExternalJobType,
  provider: string,
  status: PostPublishUsageEvent["status"],
): PostPublishUsageEvent {
  return {
    createdAt: input.runAt,
    eventType,
    idempotencyKey: input.job.idempotencyKey,
    provider,
    status,
  };
}

function normalizeOrigin(origin: string): string {
  const parsed = new URL(origin);

  if (parsed.protocol !== "https:") {
    throw new Error("post-publish external origin must be an HTTPS URL");
  }

  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";

  return parsed.toString().replace(/\/$/, "");
}
