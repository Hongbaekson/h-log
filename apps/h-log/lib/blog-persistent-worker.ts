import type { Pool, QueryResultRow } from "pg";

import {
  assertBlogPostStatusTransition,
  postPublishRequiredJobTypes,
  prePublishRequiredJobTypes,
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

export type PersistentWorkerOperatorAlert = {
  createdAt: Timestamp;
  idempotencyKey: string;
  jobId: string;
  jobType: PublishJobType;
  postId: string;
  reason: string;
};

export type RunPersistentWorkerOnceResult =
  | { status: "idle" }
  | {
      job: PublishJobRecord;
      operatorAlert: PersistentWorkerOperatorAlert | null;
      postStatus: BlogPostStatus;
      status: "failed" | "retrying" | "succeeded";
    };

export async function runPersistentWorkerOnce({
  adapter,
  importance,
  pool,
  postId,
  runAt,
  workerId,
}: {
  adapter: PersistentWorkerAdapter;
  importance?: PublishJobImportance;
  pool: Pool;
  postId?: string;
  runAt: Timestamp;
  workerId: string;
}): Promise<RunPersistentWorkerOnceResult> {
  const claimed = await pool.query(
    `with next_job as (
       select job.id
       from publish_jobs job
       join posts post on post.id = job.post_id
       where (
         job.status in ('queued', 'retrying')
         or (job.status = 'running' and job.lease_expires_at <= $1)
       )
       and ($5::text is null or job.post_id = $5)
       and ($6::text is null or job.importance = $6)
       and (
         (
           job.importance = 'required'
           and job.type = any($3::text[])
           and post.status in ('publishing', 'verifying')
         )
         or (
           job.importance = 'required'
           and job.type = any($4::text[])
           and post.status = 'published'
         )
         or (job.importance = 'retryable' and post.status = 'published')
       )
       order by case
         when job.type = any($3::text[]) then 0
         when job.type = any($4::text[]) then 1
         else 2
       end,
       job.id
       for update skip locked
       limit 1
     )
     update publish_jobs
     set status = 'running',
         lease_owner = $2,
         lease_expires_at = $1::timestamptz + interval '5 minutes',
         started_at = $1,
         finished_at = null
     where id = (select id from next_job)
     returning *`,
    [
      runAt,
      workerId,
      [...prePublishRequiredJobTypes],
      [...postPublishRequiredJobTypes],
      postId ?? null,
      importance ?? null,
    ],
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
    const repeatedSameFailure =
      job.importance === "retryable" &&
      job.retryCount >= 1 &&
      job.error === adapterResult.error;
    const retryLimitReached =
      failure.job.status === "retrying" &&
      failure.job.retryCount >= DEFAULT_POST_PUBLISH_RETRY_LIMIT;
    const finishedJob: PublishJobRecord =
      repeatedSameFailure || retryLimitReached
        ? { ...failure.job, status: "failed" }
        : failure.job;
    const retryStopped = repeatedSameFailure || retryLimitReached;
    const client = await pool.connect();

    try {
      await client.query("begin");
      const updated = await client.query(
        `update publish_jobs
         set status = $2,
             error = $3,
             retry_count = $4,
             finished_at = $5,
             lease_owner = null,
             lease_expires_at = null
         where id = $1 and status = 'running' and lease_owner = $6`,
        [
          finishedJob.id,
          finishedJob.status,
          finishedJob.error,
          finishedJob.retryCount,
          finishedJob.finishedAt,
          workerId,
        ],
      );

      if (updated.rowCount !== 1) {
        throw new Error(`publish job ${job.id}: lease lost by worker ${workerId}`);
      }

      if (retryStopped) {
        await client.query(
          `insert into usage_events (
             id, run_id, event_type, provider, status, created_at
           ) values ($1, $2, $3, $4, 'retry_stopped', $5)`,
          [
            `${job.id}:retry-stop:${finishedJob.retryCount}`,
            job.id,
            job.type,
            job.type,
            runAt,
          ],
        );
      }

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
      operatorAlert: retryStopped
        ? {
            createdAt: runAt,
            idempotencyKey: job.idempotencyKey,
            jobId: job.id,
            jobType: job.type,
            postId: job.postId,
            reason: repeatedSameFailure
              ? `${job.type} retry stopped after the same failure repeated twice: ${adapterResult.error}`
              : `${job.type} retry limit reached: ${adapterResult.error}`,
          }
        : null,
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
    const updated = await client.query(
      `update publish_jobs
       set status = $2,
           error = $3,
           retry_count = $4,
           finished_at = $5,
           lease_owner = null,
           lease_expires_at = null
       where id = $1 and status = 'running' and lease_owner = $6`,
      [
        finishedJob.id,
        finishedJob.status,
        finishedJob.error,
        finishedJob.retryCount,
        finishedJob.finishedAt,
        workerId,
      ],
    );

    if (updated.rowCount !== 1) {
      throw new Error(`publish job ${job.id}: lease lost by worker ${workerId}`);
    }

    if (
      finishedJob.importance === "required" &&
      (prePublishRequiredJobTypes as readonly string[]).includes(
        finishedJob.type,
      ) &&
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
             and type = any($3::text[])
             and status <> 'succeeded'
         ) as value`,
        [
          finishedJob.postId,
          finishedJob.postVersionId,
          [...prePublishRequiredJobTypes],
        ],
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

  return {
    job: finishedJob,
    operatorAlert: null,
    postStatus: nextPostStatus,
    status: "succeeded",
  };
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
