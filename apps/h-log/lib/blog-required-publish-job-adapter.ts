import type { Pool } from "pg";

import {
  assertPublishJobIdempotencyKey,
  createPostVersionContentFromMarkdown,
  createPostVersionContentHash,
  postPublishRequiredJobTypes,
  prePublishRequiredJobTypes,
  requiredPublishJobTypes,
  type BlogPostStatus,
  type PublishJobRecord,
  type RequiredPublishJobType,
} from "./blog-content-model.ts";
import type {
  PersistentWorkerAdapter,
  PersistentWorkerAdapterResult,
} from "./blog-persistent-worker.ts";
import {
  scanBlogPrivacyText,
  type BlogPrivacyScanPolicy,
} from "./blog-privacy-scanner.ts";

type Fetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type RequiredPublishJobCandidate = {
  post: {
    currentVersionId: string | null;
    id: string;
    slug: string;
    status: BlogPostStatus;
  };
  privacyText: string;
  version: {
    contentHash: string;
    contentHtml: string;
    contentMarkdown: string;
    id: string;
    postId: string;
  };
};

export type RequiredPublishJobAdapterOptions = {
  fetch?: Fetch;
  loadCandidate(
    job: PublishJobRecord,
  ): Promise<RequiredPublishJobCandidate>;
  privacyScanPolicy?: BlogPrivacyScanPolicy;
  publicBaseUrl: string;
};

export function createRequiredPublishJobAdapter({
  fetch: fetchImpl = globalThis.fetch,
  loadCandidate,
  privacyScanPolicy,
  publicBaseUrl,
}: RequiredPublishJobAdapterOptions): PersistentWorkerAdapter {
  const publicOrigin = normalizePublicOrigin(publicBaseUrl);

  return {
    async run(job) {
      if (!isRequiredPublishJobType(job.type)) {
        return failed(job.type, "unsupported by required adapter");
      }

      let candidate: RequiredPublishJobCandidate;

      try {
        candidate = await loadCandidate(job);
        assertCandidateMatchesJob(candidate, job);
      } catch {
        return failed(job.type, "candidate load or identity check failed");
      }

      if (isPrePublishRequiredJobType(job.type)) {
        return runPrePublishCheck(job.type, candidate, privacyScanPolicy);
      }

      if (candidate.post.status !== "published") {
        return {
          error: `${job.type} requires a published post`,
          status: "failed",
        };
      }

      return runPostPublishCheck({
        candidate,
        fetch: fetchImpl,
        publicOrigin,
        type: job.type,
      });
    },
  };
}

export function createPostgresRequiredPublishJobAdapter({
  fetch,
  pool,
  privacyScanPolicy,
  publicBaseUrl,
}: {
  fetch?: Fetch;
  pool: Pool;
  privacyScanPolicy?: BlogPrivacyScanPolicy;
  publicBaseUrl: string;
}): PersistentWorkerAdapter {
  return createRequiredPublishJobAdapter({
    fetch,
    loadCandidate: (job) => loadPostgresCandidate(pool, job),
    privacyScanPolicy,
    publicBaseUrl,
  });
}

function runPrePublishCheck(
  type: (typeof prePublishRequiredJobTypes)[number],
  candidate: RequiredPublishJobCandidate,
  privacyScanPolicy: BlogPrivacyScanPolicy | undefined,
): PersistentWorkerAdapterResult {
  if (candidate.post.status !== "publishing" && candidate.post.status !== "verifying") {
    return failed(type, "requires a private publishing post");
  }

  if (type === "privacy_scan") {
    const result = scanBlogPrivacyText(candidate.privacyText, privacyScanPolicy);

    return result.status === "passed"
      ? { status: "succeeded" }
      : {
          error: `privacy_scan failed: ${result.auditMessage}`,
          status: "failed",
        };
  }

  const expectedHash = createPostVersionContentHash(candidate.version);

  return expectedHash === candidate.version.contentHash
    ? { status: "succeeded" }
    : failed(type, "canonical content_hash mismatch");
}

async function runPostPublishCheck({
  candidate,
  fetch,
  publicOrigin,
  type,
}: {
  candidate: RequiredPublishJobCandidate;
  fetch: Fetch;
  publicOrigin: string;
  type: (typeof postPublishRequiredJobTypes)[number];
}): Promise<PersistentWorkerAdapterResult> {
  const publicUrl = `${publicOrigin}/blog/${candidate.post.slug}`;
  const markdownUrl = `${publicUrl}.md`;

  if (type === "public_url") {
    return fetchStatus200(fetch, publicUrl, type);
  }

  if (type === "sitemap") {
    const result = await fetchText(fetch, `${publicOrigin}/sitemap.xml`, type);

    if (result.status === "failed") {
      return result;
    }

    return result.text.includes(publicUrl)
      ? { status: "succeeded" }
      : failed(type, "published URL is missing");
  }

  const result = await fetchText(fetch, markdownUrl, type);

  if (result.status === "failed") {
    return result;
  }

  if (type === "md_url") {
    return result.text === candidate.version.contentMarkdown
      ? { status: "succeeded" }
      : failed(type, "published Markdown does not match current version");
  }

  const published = createPostVersionContentFromMarkdown(result.text);

  return published.contentHash === candidate.version.contentHash
    ? { status: "succeeded" }
    : failed(type, "published Markdown content_hash mismatch");
}

async function fetchStatus200(
  fetch: Fetch,
  url: string,
  type: RequiredPublishJobType,
): Promise<PersistentWorkerAdapterResult> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    return response.status === 200
      ? { status: "succeeded" }
      : failed(type, `expected HTTP 200, received ${response.status}`);
  } catch {
    return failed(type, "request failed");
  }
}

async function fetchText(
  fetch: Fetch,
  url: string,
  type: RequiredPublishJobType,
): Promise<
  | { error: string; status: "failed" }
  | { status: "succeeded"; text: string }
> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status !== 200) {
      return failed(type, `expected HTTP 200, received ${response.status}`);
    }

    return { status: "succeeded", text: await response.text() };
  } catch {
    return failed(type, "request failed");
  }
}

async function loadPostgresCandidate(
  pool: Pool,
  job: PublishJobRecord,
): Promise<RequiredPublishJobCandidate> {
  const candidate = await pool.query(
    `select p.id as post_id,
            p.slug,
            p.status,
            p.current_version_id,
            v.id as version_id,
            v.post_id as version_post_id,
            v.content_markdown,
            v.content_html,
            v.content_hash
     from posts p
     join post_versions v on v.id = $2 and v.post_id = p.id
     where p.id = $1`,
    [job.postId, job.postVersionId],
  );
  const row = candidate.rows[0];

  if (!row) {
    throw new Error("required publish candidate not found");
  }

  const [post, version, tags, sources, assets] = await Promise.all([
    pool.query("select * from posts where id = $1", [job.postId]),
    pool.query("select * from post_versions where id = $1", [job.postVersionId]),
    pool.query("select * from post_tags where post_id = $1 order by id", [
      job.postId,
    ]),
    pool.query("select * from post_sources where post_id = $1 order by id", [
      job.postId,
    ]),
    pool.query(
      "select * from post_assets where post_id = $1 and post_version_id = $2 order by id",
      [job.postId, job.postVersionId],
    ),
  ]);

  return {
    post: {
      currentVersionId: row.current_version_id,
      id: row.post_id,
      slug: row.slug,
      status: row.status as BlogPostStatus,
    },
    privacyText: JSON.stringify({
      assets: assets.rows,
      post: post.rows[0],
      sources: sources.rows,
      tags: tags.rows,
      version: version.rows[0],
    }),
    version: {
      contentHash: row.content_hash,
      contentHtml: row.content_html,
      contentMarkdown: row.content_markdown,
      id: row.version_id,
      postId: row.version_post_id,
    },
  };
}

function assertCandidateMatchesJob(
  candidate: RequiredPublishJobCandidate,
  job: PublishJobRecord,
): void {
  if (
    candidate.post.id !== job.postId ||
    candidate.post.currentVersionId !== job.postVersionId ||
    candidate.version.id !== job.postVersionId ||
    candidate.version.postId !== job.postId
  ) {
    throw new Error("publish job candidate identity mismatch");
  }

  assertPublishJobIdempotencyKey(job, candidate.version);
}

function normalizePublicOrigin(value: string): string {
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("publicBaseUrl must be an HTTP(S) origin without credentials");
  }

  return url.origin;
}

function isRequiredPublishJobType(
  type: string,
): type is RequiredPublishJobType {
  return (requiredPublishJobTypes as readonly string[]).includes(type);
}

function isPrePublishRequiredJobType(
  type: RequiredPublishJobType,
): type is (typeof prePublishRequiredJobTypes)[number] {
  return (prePublishRequiredJobTypes as readonly string[]).includes(type);
}

function failed(
  type: string,
  reason: string,
): { error: string; status: "failed" } {
  return { error: `${type} failed: ${reason}`, status: "failed" };
}
