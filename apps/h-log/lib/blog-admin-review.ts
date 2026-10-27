import type { Pool } from "pg";
import { blogPostStatuses, createPostVersionContentHash, type BlogPostStatus } from "./blog-content-model.ts";
import { tryNormalizePublicSourceUrl } from "./public-source-url.ts";
import type { EditorialDraft } from "./blog-editorial-command.ts";

export const adminPostStatusLabels: Record<BlogPostStatus, string> = {
  queued: "작성 대기", researching: "자료 조사", drafted: "초안", gate_failed: "품질 검사 실패",
  ready_to_publish: "발행 준비", publishing: "발행 처리", verifying: "공개 검증", published: "발행됨",
  correction_pending: "수정 대기", corrected: "수정됨", unpublished: "비공개", retracted: "철회",
  failed_generation: "작성 실패", failed_publish: "발행 실패", failed_verification: "공개 검증 실패",
};
export type AdminPostReviewQuery = { page: number; status: BlogPostStatus | null; post: string | null; version: number | null };
export function parseAdminPostReviewQuery(input: Record<string, string | string[] | undefined>): AdminPostReviewQuery {
  const { page, status, post, version } = input;
  const integer = (value: unknown, max: number) => typeof value === "string" && /^[1-9]\d*$/.test(value) && Number(value) <= max;
  if (page !== undefined && !integer(page, 10000)
    || status !== undefined && status !== "" && !blogPostStatuses.includes(status as BlogPostStatus)
    || post !== undefined && (typeof post !== "string" || !post.length || post.length > 200 || /[\u0000-\u001f\u007f]/.test(post))
    || version !== undefined && (!post || !integer(version, 1000000))) throw new Error("invalid_review_query");
  return { page: page ? Number(page) : 1, status: status ? status as BlogPostStatus : null, post: post as string ?? null, version: version ? Number(version) : null };
}

export type AdminReviewPost = {
  id: string; title: string; status: BlogPostStatus; currentVersionId: string | null; updatedAt: string; commandRevision: number;
};
type ReviewVersion = {
  id: string; versionNo: number; title: string; description: string; contentMarkdown: string | null;
  contentHtml: string | null; contentHash: string; createdAt: string; createdBy: string; editorialReview: Pick<EditorialDraft, "claims" | "evidencePaths"> | null;
};
export type AdminPostReview = {
  post: AdminReviewPost; version: ReviewVersion | null; latestVersionNo: number | null; hashMatches: boolean | null;
  sources: { id: string; title: string; publisher: string; role: string; href: string | null; fetchedAt: string }[];
  checks: { id: string; type: string; status: string; responseCode: number | null; checkedAt: string }[];
  jobs: { id: string; type: string; importance: string; status: string; retryCount: number }[];
};
export type AdminPostsResult = { posts: AdminReviewPost[]; hasNext: boolean; review: AdminPostReview | null };

// This repository is only called after requireAdminOwner in blog-admin-review-server.
export async function readAdminPosts(pool: Pool, query: AdminPostReviewQuery): Promise<AdminPostsResult> {
  const client = await pool.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    await client.query("set local statement_timeout = '3s'");
    const { rows } = await client.query<AdminReviewPost>(
      `select id, left(title,512) as title, status, command_revision as "commandRevision", current_version_id as "currentVersionId", updated_at::text as "updatedAt"
       from posts where ($1::text is null or status=$1) order by updated_at desc, id limit 21 offset $2`,
      [query.status, (query.page - 1) * 20],
    );
    const result: AdminPostsResult = { posts: rows.slice(0, 20), hasNext: rows.length > 20, review: null };
    if (query.post) {
      const post = (await client.query<AdminReviewPost>(
        `select id, title, status, command_revision as "commandRevision", current_version_id as "currentVersionId", updated_at::text as "updatedAt" from posts where id=$1`, [query.post],
      )).rows[0];
      if (post) {
        const latestVersionNo = (await client.query<{ latest: number | null }>("select max(version_no) as latest from post_versions where post_id=$1", [post.id])).rows[0].latest;
        const version = (await client.query<ReviewVersion>(
          `select id, version_no as "versionNo", title, description, editorial_review as "editorialReview", content_hash as "contentHash", created_at::text as "createdAt", created_by as "createdBy",
           case when octet_length(content_markdown)<=262144 then content_markdown end as "contentMarkdown",
           case when octet_length(content_html)<=262144 then content_html end as "contentHtml"
           from post_versions where post_id=$1 and
           (case when $2::integer is not null then version_no=$2 when $3::text is not null then id=$3 else version_no=$4 end)`,
          [post.id, query.version, post.currentVersionId, latestVersionNo],
        )).rows[0] ?? null;
        if (version || query.version === null) {
          const sources = (await client.query<{ id: string; title: string; publisher: string; role: string; url: string; fetchedAt: string }>(
            `select id, left(title,512) as title, left(publisher,200) as publisher, source_role as role, url, fetched_at::text as "fetchedAt"
             from post_sources where post_id=$1 order by fetched_at desc, id limit 50`, [post.id],
          )).rows.map(({ url, ...source }) => ({ ...source, href: tryNormalizePublicSourceUrl(url) ?? null }));
          const checks = version ? (await client.query<AdminPostReview["checks"][number]>(
            `select id, check_type as type, status, response_code as "responseCode", checked_at::text as "checkedAt"
             from publish_verifications where post_id=$1 and post_version_id=$2 order by checked_at desc, id limit 50`, [post.id, version.id],
          )).rows : [];
          const jobs = version ? (await client.query<AdminPostReview["jobs"][number]>(
            `select id, type, importance, status, retry_count as "retryCount" from publish_jobs
             where post_id=$1 and post_version_id=$2 order by type,id limit 50`, [post.id, version.id],
          )).rows : [];
          const hashMatches = version?.contentMarkdown != null && version.contentHtml != null
            ? createPostVersionContentHash({ contentMarkdown: version.contentMarkdown, contentHtml: version.contentHtml }) === version.contentHash : null;
          result.review = { post, version, latestVersionNo, sources, checks, jobs, hashMatches };
        }
      }
    }
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}
