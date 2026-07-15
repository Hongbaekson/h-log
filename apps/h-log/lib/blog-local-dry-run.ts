import type { Pool } from "pg";

import {
  createPublishJobIdempotencyKey,
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionRecord,
  type PublishJobRecord,
  type Timestamp,
} from "./blog-content-model.ts";
import {
  createPostgresBlogRepository,
  type BlogPostAggregate,
} from "./blog-postgres-repository.ts";
import { runPersistentWorkerOnce } from "./blog-persistent-worker.ts";

const SUCCESS_POST_ID = "post-local-dry-run-success";
const FAILURE_POST_ID = "post-local-dry-run-failure";

export type LocalBlogDryRunResult = {
  failure: LocalBlogDryRunPostResult;
  success: LocalBlogDryRunPostResult;
};

type LocalBlogDryRunPostResult = {
  contentHash: string;
  postId: string;
  slug: string;
  versionId: string;
};

export async function runLocalBlogDryRun({
  pool,
  runAt,
}: {
  pool: Pool;
  runAt: Timestamp;
}): Promise<LocalBlogDryRunResult> {
  const unrelatedJob = await pool.query(
    `select id
     from publish_jobs
     where status in ('queued', 'retrying')
       and post_id <> all($1::text[])
     limit 1`,
    [[SUCCESS_POST_ID, FAILURE_POST_ID]],
  );

  if (unrelatedJob.rowCount) {
    throw new Error(
      `local dry-run refused to process pending job ${unrelatedJob.rows[0].id}`,
    );
  }

  await pool.query("delete from posts where id = any($1::text[])", [
    [SUCCESS_POST_ID, FAILURE_POST_ID],
  ]);

  const success = createDryRunAggregate({
    jobId: "local-dry-run-01-success-render",
    postId: SUCCESS_POST_ID,
    runAt,
    slug: "local-dry-run-success",
    title: "Fake provider local dry-run",
  });
  const failure = createDryRunAggregate({
    jobId: "local-dry-run-02-failure-render",
    postId: FAILURE_POST_ID,
    runAt,
    slug: "local-dry-run-failure",
    title: "Fake provider failed dry-run",
  });
  const repository = createPostgresBlogRepository(pool);

  await repository.savePost(success);
  await repository.savePost(failure);

  const succeeded = await runPersistentWorkerOnce({
    adapter: {
      async run() {
        return { status: "succeeded" };
      },
    },
    pool,
    runAt,
    workerId: "local-dry-run-success",
  });

  if (
    succeeded.status !== "succeeded" ||
    succeeded.job.postId !== SUCCESS_POST_ID ||
    succeeded.postStatus !== "published"
  ) {
    throw new Error("local dry-run success fixture did not publish");
  }

  const failed = await runPersistentWorkerOnce({
    adapter: {
      async run() {
        return {
          error: "fake required provider failed",
          status: "failed",
        };
      },
    },
    pool,
    runAt,
    workerId: "local-dry-run-failure",
  });

  if (
    failed.status !== "failed" ||
    failed.job.postId !== FAILURE_POST_ID ||
    failed.postStatus !== "failed_publish"
  ) {
    throw new Error("local dry-run failure fixture did not stay private");
  }

  return {
    failure: toResult(failure),
    success: toResult(success),
  };
}

function createDryRunAggregate({
  jobId,
  postId,
  runAt,
  slug,
  title,
}: {
  jobId: string;
  postId: string;
  runAt: Timestamp;
  slug: string;
  title: string;
}): BlogPostAggregate {
  const versionId = `${postId}-version-1`;
  const content = createPostVersionContentFromMarkdown(
    `# ${title}\n\nFake provider local dry-run content.\n`,
  );
  const post: PostRecord = {
    articleMode: "project_record",
    createdAt: runAt,
    currentVersionId: versionId,
    description: "Bounded local fake-provider publishing verification.",
    id: postId,
    publishedAt: null,
    retractedAt: null,
    slug,
    status: "publishing",
    title,
    unpublishedAt: null,
    updatedAt: runAt,
  };
  const version: PostVersionRecord = {
    ...content,
    createdAt: runAt,
    createdBy: "system",
    description: post.description,
    id: versionId,
    personaVersionId: "fake-provider-v1",
    postId,
    researchPackId: "fake-topic-local-dry-run",
    title,
    versionNo: 1,
  };
  const source: PostSourceRecord = {
    fetchedAt: runAt,
    id: `${postId}-source`,
    postId,
    publisher: "H-Log local dry-run",
    researchPackId: version.researchPackId,
    snapshotHash: content.contentHash,
    sourceRole: "official",
    summary: "Public-safe fake topic used only for local verification.",
    title: "Fake provider topic seed",
    url: "https://example.com/h-log-local-dry-run",
  };
  const tag: PostTagRecord = {
    createdAt: runAt,
    id: `${postId}-tag`,
    postId,
    tag: "H-Log",
  };
  const job: PublishJobRecord = {
    error: null,
    finishedAt: null,
    id: jobId,
    idempotencyKey: createPublishJobIdempotencyKey("render", version),
    importance: "required",
    postId,
    postVersionId: versionId,
    retryCount: 0,
    startedAt: null,
    status: "queued",
    type: "render",
  };

  return {
    assets: [],
    post,
    publishJobs: [job],
    sources: [source],
    tags: [tag],
    version,
  };
}

function toResult(aggregate: BlogPostAggregate): LocalBlogDryRunPostResult {
  return {
    contentHash: aggregate.version.contentHash,
    postId: aggregate.post.id,
    slug: aggregate.post.slug,
    versionId: aggregate.version.id,
  };
}
