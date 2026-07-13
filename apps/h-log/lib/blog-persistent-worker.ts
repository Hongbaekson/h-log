import type { Pool, QueryResultRow } from "pg";

import {
  assertBlogPostStatusTransition,
  recordPublishJobFailure,
  type BlogPostStatus,
  type PublishJobImportance,
  type PublishJobRecord,
  type PublishJobStatus,
  type PublishJobType,
  type Timestamp,
} from "./blog-content-model.ts";
import { DEFAULT_POST_PUBLISH_RETRY_LIMIT } from "./blog-post-publish-retryable-jobs.ts";

export type PersistentWorkerAdapterResult =
  | { status: "failed"; error: string }
  | { status: "succeeded" };

export type PersistentWorkerAdapter = {
  run(job: PublishJobRecord): Promise<PersistentWorkerAdapterResult>;
};

export type RunPersistentWorkerOnceResult =
  | { status: "idle" }
  | {
      job: PublishJobRecord;
      postStatus: BlogPostStatus;
      status: "failed" | "retrying" | "succeeded";
    };

export async function runPersistentWorkerOnce({
  adapter,
  pool,
  runAt,
}: {
  adapter: PersistentWorkerAdapter;
  pool: Pool;
  runAt: Timestamp;
}): Promise<RunPersistentWorkerOnceResult> {
  const claimed = await pool.query(
    `with next_job as (
       select id
       from publish_jobs
       where status in ('queued', 'retrying')
       order by id
       for update skip locked
       limit 1
     )
     update publish_jobs
     set status = 'running', error = null, started_at = $1, finished_at = null
     where id = (select id from next_job)
     returning *`,
    [runAt],
  );

  if (claimed.rowCount === 0) {
    return { status: "idle" };
  }

  const job = mapPublishJob(claimed.rows[0]);
  const postResult = await pool.query(
    "select status, current_version_id from posts where id = $1",
    [job.postId],
  );
  const postStatus = postResult.rows[0]?.status as BlogPostStatus | undefined;
  const currentVersionId = postResult.rows[0]?.current_version_id as
    | string
    | null
    | undefined;

  if (!postStatus) {
    throw new Error(`publish job ${job.id}: post ${job.postId} not found`);
  }

  let adapterResult: PersistentWorkerAdapterResult;

  try {
    adapterResult = await adapter.run(job);
  } catch (error) {
    adapterResult = {
      error: error instanceof Error ? error.message : String(error),
      status: "failed",
    };
  }

  if (adapterResult.status === "failed") {
    const failure = recordPublishJobFailure({
      error: adapterResult.error,
      finishedAt: runAt,
      job,
      postStatus,
    });
    const finishedJob: PublishJobRecord =
      failure.job.status === "retrying" &&
      failure.job.retryCount >= DEFAULT_POST_PUBLISH_RETRY_LIMIT
        ? { ...failure.job, status: "failed" }
        : failure.job;
    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query(
        `update publish_jobs
         set status = $2, error = $3, retry_count = $4, finished_at = $5
         where id = $1`,
        [
          finishedJob.id,
          finishedJob.status,
          finishedJob.error,
          finishedJob.retryCount,
          finishedJob.finishedAt,
        ],
      );

      if (failure.postStatus !== postStatus) {
        assertBlogPostStatusTransition(postStatus, failure.postStatus);
        await client.query(
          "update posts set status = $2, updated_at = $3 where id = $1",
          [job.postId, failure.postStatus, runAt],
        );
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    return {
      job: finishedJob,
      postStatus: failure.postStatus,
      status: finishedJob.status === "retrying" ? "retrying" : "failed",
    };
  }

  const finishedJob: PublishJobRecord = {
    ...job,
    error: null,
    finishedAt: runAt,
    status: "succeeded",
  };
  const client = await pool.connect();
  let nextPostStatus = postStatus;

  try {
    await client.query("begin");
    await client.query(
      `update publish_jobs
       set status = $2, error = $3, retry_count = $4, finished_at = $5
       where id = $1`,
      [
        finishedJob.id,
        finishedJob.status,
        finishedJob.error,
        finishedJob.retryCount,
        finishedJob.finishedAt,
      ],
    );

    if (
      finishedJob.importance === "required" &&
      currentVersionId === finishedJob.postVersionId &&
      (postStatus === "publishing" || postStatus === "verifying")
    ) {
      const incomplete = await client.query(
        `select exists (
           select 1
           from publish_jobs
           where post_id = $1
             and post_version_id = $2
             and importance = 'required'
             and status <> 'succeeded'
         ) as value`,
        [finishedJob.postId, finishedJob.postVersionId],
      );

      if (!incomplete.rows[0]?.value) {
        if (postStatus === "publishing") {
          assertBlogPostStatusTransition("publishing", "verifying");
        }
        assertBlogPostStatusTransition("verifying", "published");
        await client.query(
          `update posts
           set status = 'published', published_at = coalesce(published_at, $2), updated_at = $2
           where id = $1 and current_version_id = $3`,
          [finishedJob.postId, runAt, finishedJob.postVersionId],
        );
        nextPostStatus = "published";
      }
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return { job: finishedJob, postStatus: nextPostStatus, status: "succeeded" };
}

function mapPublishJob(row: QueryResultRow): PublishJobRecord {
  return {
    error: row.error,
    finishedAt: toNullableTimestamp(row.finished_at),
    id: row.id,
    idempotencyKey: row.idempotency_key,
    importance: row.importance as PublishJobImportance,
    postId: row.post_id,
    postVersionId: row.post_version_id,
    retryCount: row.retry_count,
    startedAt: toNullableTimestamp(row.started_at),
    status: row.status as PublishJobStatus,
    type: row.type as PublishJobType,
  };
}

function toNullableTimestamp(value: Date | string | null): Timestamp | null {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}
