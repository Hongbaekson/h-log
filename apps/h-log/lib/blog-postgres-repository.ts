import type { Pool, PoolClient, QueryResultRow } from "pg";

import {
  assertPublishJobIdempotencyKey,
  selectPublicBlogRouteEntries,
  type BlogArticleMode,
  type BlogPostStatus,
  type PostAssetRecord,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionCreatedBy,
  type PostVersionRecord,
  type PublishJobRecord,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import {
  scanBlogPrivacyText,
  type BlogPrivacyScanPolicy,
} from "./blog-privacy-scanner.ts";

export type BlogPostAggregate = {
  assets: readonly PostAssetRecord[];
  post: PostRecord;
  publishJobs: readonly PublishJobRecord[];
  sources: readonly PostSourceRecord[];
  tags: readonly PostTagRecord[];
  version: PostVersionRecord;
};

export type PostgresBlogRepository = {
  findPublicBlogContent(): Promise<BlogContentStore>;
  savePublishJob(job: PublishJobRecord): Promise<PublishJobRecord>;
  savePost(aggregate: BlogPostAggregate): Promise<void>;
};

export type PostgresBlogRepositoryOptions = {
  privacyScanPolicy?: BlogPrivacyScanPolicy;
};

export function createPostgresBlogRepository(
  pool: Pool,
  options: PostgresBlogRepositoryOptions = {},
): PostgresBlogRepository {
  return {
    async findPublicBlogContent() {
      const [postResult, versionResult] = await Promise.all([
        pool.query("select * from posts order by id"),
        pool.query("select * from post_versions order by id"),
      ]);
      const posts = postResult.rows.map(mapPost);
      const versions = versionResult.rows.map(mapPostVersion);
      const publicEntries = selectPublicBlogRouteEntries(
        posts,
        versions,
        options.privacyScanPolicy,
      );
      const publicPostIds = publicEntries.map(({ post }) => post.id);
      const publicVersionIds = publicEntries.map(({ version }) => version.id);

      if (publicPostIds.length === 0) {
        return { assets: [], posts: [], sources: [], tags: [], versions: [] };
      }

      const [tagResult, sourceResult, assetResult] = await Promise.all([
        pool.query(
          "select * from post_tags where post_id = any($1::text[]) order by id",
          [publicPostIds],
        ),
        pool.query(
          "select * from post_sources where post_id = any($1::text[]) order by id",
          [publicPostIds],
        ),
        pool.query(
          `select * from post_assets
           where post_id = any($1::text[])
             and post_version_id = any($2::text[])
           order by id`,
          [publicPostIds, publicVersionIds],
        ),
      ]);

      const tags = tagResult.rows.map(mapPostTag);
      const sources = sourceResult.rows.map(mapPostSource);
      const assets = assetResult.rows.map(mapPostAsset);
      const privacySafeEntries = publicEntries.filter(({ post, version }) =>
        scanBlogPrivacyText(
          JSON.stringify({
            assets: assets.filter(
              (asset) =>
                asset.postId === post.id && asset.postVersionId === version.id,
            ),
            post,
            sources: sources.filter((source) => source.postId === post.id),
            tags: tags.filter((tag) => tag.postId === post.id),
            version,
          }),
          options.privacyScanPolicy,
        ).status === "passed",
      );
      const privacySafePostIds = new Set(
        privacySafeEntries.map(({ post }) => post.id),
      );
      const privacySafeVersionIds = new Set(
        privacySafeEntries.map(({ version }) => version.id),
      );

      return {
        assets: assets.filter(
          (asset) =>
            privacySafePostIds.has(asset.postId) &&
            privacySafeVersionIds.has(asset.postVersionId),
        ),
        posts: privacySafeEntries.map(({ post }) => post),
        sources: sources.filter((source) =>
          privacySafePostIds.has(source.postId),
        ),
        tags: tags.filter((tag) => privacySafePostIds.has(tag.postId)),
        versions: privacySafeEntries.map(({ version }) => version),
      };
    },

    async savePublishJob(job) {
      const client = await pool.connect();

      try {
        const versionResult = await client.query(
          `select id, content_hash
           from post_versions
           where id = $1 and post_id = $2`,
          [job.postVersionId, job.postId],
        );

        if (versionResult.rowCount === 0) {
          throw new Error(
            `publish job ${job.id}: post version ${job.postVersionId} not found`,
          );
        }

        assertPublishJobIdempotencyKey(job, {
          contentHash: versionResult.rows[0].content_hash,
          id: versionResult.rows[0].id,
        });

        return await insertPublishJob(client, job);
      } finally {
        client.release();
      }
    },

    async savePost(aggregate) {
      assertAggregateReferences(aggregate);
      const client = await pool.connect();

      try {
        await client.query("begin");
        await upsertPostWithoutCurrentVersion(client, aggregate.post);
        await insertPostVersion(client, aggregate.version);
        await client.query(
          "update posts set current_version_id = $2 where id = $1",
          [aggregate.post.id, aggregate.post.currentVersionId],
        );

        for (const tag of aggregate.tags) {
          await upsertPostTag(client, tag);
        }

        for (const source of aggregate.sources) {
          await upsertPostSource(client, source);
        }

        for (const asset of aggregate.assets) {
          await upsertPostAsset(client, asset);
        }

        for (const job of aggregate.publishJobs) {
          await insertPublishJob(client, job);
        }

        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function upsertPostWithoutCurrentVersion(
  client: PoolClient,
  post: PostRecord,
): Promise<void> {
  await client.query(
    `insert into posts (
       id, slug, title, description, article_mode, status,
       current_version_id, published_at, unpublished_at, retracted_at,
       created_at, updated_at
     ) values ($1, $2, $3, $4, $5, $6, null, $7, $8, $9, $10, $11)
     on conflict (id) do update set
       slug = excluded.slug,
       title = excluded.title,
       description = excluded.description,
       article_mode = excluded.article_mode,
       status = excluded.status,
       published_at = excluded.published_at,
       unpublished_at = excluded.unpublished_at,
       retracted_at = excluded.retracted_at,
       updated_at = excluded.updated_at`,
    [
      post.id,
      post.slug,
      post.title,
      post.description,
      post.articleMode,
      post.status,
      post.publishedAt,
      post.unpublishedAt,
      post.retractedAt,
      post.createdAt,
      post.updatedAt,
    ],
  );
}

async function insertPostVersion(
  client: PoolClient,
  version: PostVersionRecord,
): Promise<void> {
  await client.query(
    `insert into post_versions (
       id, post_id, version_no, title, description, content_markdown,
       content_html, content_hash, persona_version_id, research_pack_id,
       created_by, created_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      version.id,
      version.postId,
      version.versionNo,
      version.title,
      version.description,
      version.contentMarkdown,
      version.contentHtml,
      version.contentHash,
      version.personaVersionId,
      version.researchPackId,
      version.createdBy,
      version.createdAt,
    ],
  );
}

async function upsertPostTag(
  client: PoolClient,
  tag: PostTagRecord,
): Promise<void> {
  await client.query(
    `insert into post_tags (id, post_id, tag, created_at)
     values ($1, $2, $3, $4)
     on conflict (id) do update set tag = excluded.tag`,
    [tag.id, tag.postId, tag.tag, tag.createdAt],
  );
}

async function upsertPostSource(
  client: PoolClient,
  source: PostSourceRecord,
): Promise<void> {
  await client.query(
    `insert into post_sources (
       id, post_id, research_pack_id, url, title, publisher, source_role,
       fetched_at, summary, snapshot_hash
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (id) do update set
       research_pack_id = excluded.research_pack_id,
       url = excluded.url,
       title = excluded.title,
       publisher = excluded.publisher,
       source_role = excluded.source_role,
       fetched_at = excluded.fetched_at,
       summary = excluded.summary,
       snapshot_hash = excluded.snapshot_hash`,
    [
      source.id,
      source.postId,
      source.researchPackId,
      source.url,
      source.title,
      source.publisher,
      source.sourceRole,
      source.fetchedAt,
      source.summary,
      source.snapshotHash,
    ],
  );
}

async function upsertPostAsset(
  client: PoolClient,
  asset: PostAssetRecord,
): Promise<void> {
  await client.query(
    `insert into post_assets (
       id, post_id, post_version_id, type, path, alt, status, asset_hash,
       verified_at, generated_by, created_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (id) do update set
       status = excluded.status,
       asset_hash = excluded.asset_hash,
       verified_at = excluded.verified_at,
       path = excluded.path,
       alt = excluded.alt`,
    [
      asset.id,
      asset.postId,
      asset.postVersionId,
      asset.type,
      asset.path,
      asset.alt,
      asset.status,
      asset.assetHash,
      asset.verifiedAt,
      asset.generatedBy,
      asset.createdAt,
    ],
  );
}

async function insertPublishJob(
  client: PoolClient,
  job: PublishJobRecord,
): Promise<PublishJobRecord> {
  const inserted = await client.query(
    `insert into publish_jobs (
       id, post_id, post_version_id, type, importance, idempotency_key,
       status, retry_count, error, started_at, finished_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (idempotency_key) do nothing
     returning *`,
    [
      job.id,
      job.postId,
      job.postVersionId,
      job.type,
      job.importance,
      job.idempotencyKey,
      job.status,
      job.retryCount,
      job.error,
      job.startedAt,
      job.finishedAt,
    ],
  );

  if (inserted.rowCount) {
    return mapPublishJob(inserted.rows[0]);
  }

  const existing = await client.query(
    "select * from publish_jobs where idempotency_key = $1",
    [job.idempotencyKey],
  );

  if (existing.rowCount === 0) {
    throw new Error(`publish job ${job.id}: idempotent result not found`);
  }

  return mapPublishJob(existing.rows[0]);
}

function assertAggregateReferences(aggregate: BlogPostAggregate): void {
  const { post, version } = aggregate;

  if (version.postId !== post.id || post.currentVersionId !== version.id) {
    throw new Error(`post ${post.id}: aggregate version mismatch`);
  }

  const hasForeignReference = [
    ...aggregate.tags,
    ...aggregate.sources,
    ...aggregate.assets,
    ...aggregate.publishJobs,
  ].some((record) => record.postId !== post.id);

  if (hasForeignReference) {
    throw new Error(`post ${post.id}: aggregate contains a foreign record`);
  }

  const hasForeignVersion = [
    ...aggregate.assets,
    ...aggregate.publishJobs,
  ].some((record) => record.postVersionId !== version.id);

  if (hasForeignVersion) {
    throw new Error(`post ${post.id}: aggregate contains a foreign version record`);
  }

  for (const job of aggregate.publishJobs) {
    assertPublishJobIdempotencyKey(job, version);
  }
}

function mapPost(row: QueryResultRow): PostRecord {
  return {
    articleMode: row.article_mode as BlogArticleMode,
    createdAt: toTimestamp(row.created_at),
    currentVersionId: row.current_version_id,
    description: row.description,
    id: row.id,
    publishedAt: toNullableTimestamp(row.published_at),
    retractedAt: toNullableTimestamp(row.retracted_at),
    slug: row.slug,
    status: row.status as BlogPostStatus,
    title: row.title,
    unpublishedAt: toNullableTimestamp(row.unpublished_at),
    updatedAt: toTimestamp(row.updated_at),
  };
}

function mapPostVersion(row: QueryResultRow): PostVersionRecord {
  return {
    contentHash: row.content_hash,
    contentHtml: row.content_html,
    contentMarkdown: row.content_markdown,
    createdAt: toTimestamp(row.created_at),
    createdBy: row.created_by as PostVersionCreatedBy,
    description: row.description,
    id: row.id,
    personaVersionId: row.persona_version_id,
    postId: row.post_id,
    researchPackId: row.research_pack_id,
    title: row.title,
    versionNo: row.version_no,
  };
}

function mapPostTag(row: QueryResultRow): PostTagRecord {
  return {
    createdAt: toTimestamp(row.created_at),
    id: row.id,
    postId: row.post_id,
    tag: row.tag,
  };
}

function mapPostSource(row: QueryResultRow): PostSourceRecord {
  return {
    fetchedAt: toTimestamp(row.fetched_at),
    id: row.id,
    postId: row.post_id,
    publisher: row.publisher,
    researchPackId: row.research_pack_id,
    snapshotHash: row.snapshot_hash,
    sourceRole: row.source_role,
    summary: row.summary,
    title: row.title,
    url: row.url,
  };
}

function mapPostAsset(row: QueryResultRow): PostAssetRecord {
  return {
    alt: row.alt,
    assetHash: row.asset_hash,
    createdAt: toTimestamp(row.created_at),
    generatedBy: row.generated_by,
    id: row.id,
    path: row.path,
    postId: row.post_id,
    postVersionId: row.post_version_id,
    status: row.status,
    type: row.type,
    verifiedAt: toNullableTimestamp(row.verified_at),
  };
}

function mapPublishJob(row: QueryResultRow): PublishJobRecord {
  return {
    error: row.error,
    finishedAt: toNullableTimestamp(row.finished_at),
    id: row.id,
    idempotencyKey: row.idempotency_key,
    importance: row.importance,
    postId: row.post_id,
    postVersionId: row.post_version_id,
    retryCount: row.retry_count,
    startedAt: toNullableTimestamp(row.started_at),
    status: row.status,
    type: row.type,
  };
}

function toTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNullableTimestamp(value: Date | string | null): string | null {
  return value === null ? null : toTimestamp(value);
}
