import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostTagRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import {
  BLOG_SEARCH_EMBEDDING_PURPOSES,
  assessBlogSearchRequest,
  searchPublishedBlogPosts,
  selectPublishedRelatedPostCandidates,
} from "./blog-search.ts";

const baseTimestamp = "2026-06-27T00:00:00.000Z";

function createPost(
  slug: string,
  overrides: Partial<PostRecord> = {},
): PostRecord {
  const id = `post-${slug}`;

  return {
    articleMode: "document_analysis",
    createdAt: baseTimestamp,
    currentVersionId: `version-${slug}`,
    description: `${slug} description`,
    id,
    publishedAt: "2026-06-27T09:00:00.000Z",
    retractedAt: null,
    slug,
    status: "published",
    title: slug,
    unpublishedAt: null,
    updatedAt: baseTimestamp,
    ...overrides,
  };
}

function createVersion(
  slug: string,
  overrides: Partial<PostVersionRecord> & {
    contentMarkdown?: string;
  } = {},
): PostVersionRecord {
  const { contentMarkdown = `# ${slug}\n\n${slug} body.\n`, ...recordOverrides } =
    overrides;
  const content = createPostVersionContentFromMarkdown(contentMarkdown);

  return {
    ...content,
    createdAt: baseTimestamp,
    createdBy: "admin",
    description: `${slug} description`,
    id: `version-${slug}`,
    personaVersionId: null,
    postId: `post-${slug}`,
    researchPackId: null,
    title: slug,
    versionNo: 1,
    ...recordOverrides,
  };
}

function createTag(slug: string, tag: string): PostTagRecord {
  return {
    createdAt: baseTimestamp,
    id: `tag-${slug}-${tag}`,
    postId: `post-${slug}`,
    tag,
  };
}

function createStore(): BlogContentStore {
  return {
    posts: [
      createPost("oci-runtime", {
        description: "OCI Docker Compose runtime smoke",
        title: "OCI 런타임 점검",
      }),
      createPost("postgres-restore", {
        description: "PostgreSQL pgvector restore rehearsal",
        title: "PostgreSQL 복구 리허설",
      }),
      createPost("hidden-preview", {
        status: "ready_to_publish",
        title: "비공개 pgvector 검색 초안",
      }),
      createPost("failed-search", {
        status: "failed_verification",
        title: "실패한 검색 글",
      }),
    ],
    sources: [],
    tags: [
      createTag("oci-runtime", "OCI"),
      createTag("postgres-restore", "DB"),
      createTag("hidden-preview", "비공개"),
      createTag("failed-search", "검색"),
    ],
    versions: [
      createVersion("oci-runtime", {
        contentMarkdown: "# OCI 런타임 점검\n\nDocker Compose와 Nginx smoke 기록.\n",
        title: "OCI 런타임 점검",
      }),
      createVersion("postgres-restore", {
        contentMarkdown: "# PostgreSQL 복구 리허설\n\npgvector restore smoke 기록.\n",
        title: "PostgreSQL 복구 리허설",
      }),
      createVersion("hidden-preview", {
        contentMarkdown: "# 비공개 pgvector 검색 초안\n\n아직 공개 전인 검색 글.\n",
        title: "비공개 pgvector 검색 초안",
      }),
      createVersion("failed-search", {
        contentMarkdown: "# 실패한 검색 글\n\n검증 실패 상태의 검색 글.\n",
        title: "실패한 검색 글",
      }),
    ],
  };
}

describe("blog search contract", () => {
  it("merges keyword and vector scores without exposing non-published posts", () => {
    const results = searchPublishedBlogPosts(createStore(), {
      query: "pgvector",
      vectorScores: [
        { postId: "post-hidden-preview", score: 0.99 },
        { postId: "post-postgres-restore", score: 0.72 },
        { postId: "post-failed-search", score: 0.88 },
      ],
    });

    assert.deepEqual(
      results.map((result) => result.slug),
      ["postgres-restore"],
    );
    assert.equal(results[0]?.matchedBy.keyword, true);
    assert.equal(results[0]?.matchedBy.vector, true);
    assert.equal(results[0]?.score > 0.72, true);
  });

  it("selects related post candidates only from published targets", () => {
    const related = selectPublishedRelatedPostCandidates(createStore(), {
      sourcePostId: "post-oci-runtime",
      similarities: [
        { score: 0.94, targetPostId: "post-hidden-preview" },
        { score: 0.81, targetPostId: "post-postgres-restore" },
        { score: 0.77, targetPostId: "post-oci-runtime" },
      ],
    });

    assert.deepEqual(
      related.map((candidate) => candidate.slug),
      ["postgres-restore"],
    );
    assert.equal(related[0]?.similarity, 0.81);
  });

  it("defines search request cost guards before embedding is called", () => {
    const now = Date.parse(baseTimestamp);

    assert.deepEqual(BLOG_SEARCH_EMBEDDING_PURPOSES, [
      "search",
      "related_posts",
    ]);
    assert.equal(
      BLOG_SEARCH_EMBEDDING_PURPOSES.includes(
        "chat" as (typeof BLOG_SEARCH_EMBEDDING_PURPOSES)[number],
      ),
      false,
    );
    assert.deepEqual(
      assessBlogSearchRequest({
        query: "a",
        requestedAt: now,
      }),
      {
        cacheKey: "a",
        normalizedQuery: "a",
        reason: "query_too_short",
        shouldReadFromCache: false,
        shouldUseEmbedding: false,
        status: "blocked",
      },
    );
    assert.deepEqual(
      assessBlogSearchRequest({
        query: "pgvector",
        requestedAt: now,
        cacheHit: true,
      }),
      {
        cacheKey: "pgvector",
        normalizedQuery: "pgvector",
        reason: "cache_hit",
        shouldReadFromCache: true,
        shouldUseEmbedding: false,
        status: "allowed",
      },
    );
    assert.equal(
      assessBlogSearchRequest({
        history: [
          {
            clientId: "visitor-1",
            normalizedQuery: "pgvector",
            requestedAt: now - 1_000,
          },
        ],
        clientId: "visitor-1",
        query: "pgvector",
        requestedAt: now,
      }).reason,
      "duplicate_query",
    );
    assert.equal(
      assessBlogSearchRequest({
        clientId: "visitor-1",
        history: [
          { clientId: "visitor-1", normalizedQuery: "oci", requestedAt: now - 3_000 },
          { clientId: "visitor-1", normalizedQuery: "nginx", requestedAt: now - 2_000 },
        ],
        policy: {
          maxRequestsPerWindow: 2,
          minQueryLength: 2,
          repeatQueryWindowMs: 30_000,
          requestWindowMs: 60_000,
        },
        query: "pgvector",
        requestedAt: now,
      }).reason,
      "rate_limited",
    );
  });
});
