import {
  selectPublicBlogRouteEntries,
  type PublicBlogRouteEntry,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";

export const BLOG_SEARCH_EMBEDDING_PURPOSES = [
  "search",
  "related_posts",
] as const;

export type BlogSearchEmbeddingPurpose =
  (typeof BLOG_SEARCH_EMBEDDING_PURPOSES)[number];

export type BlogSearchVectorScore = {
  postId: string;
  score: number;
};

export type BlogSearchInput = {
  limit?: number;
  query: string;
  vectorScores?: readonly BlogSearchVectorScore[];
};

export type BlogSearchResult = {
  description: string;
  href: string;
  keywordScore: number;
  matchedBy: {
    keyword: boolean;
    vector: boolean;
  };
  postId: string;
  score: number;
  slug: string;
  title: string;
  vectorScore: number;
};

export type RelatedPostSimilarity = {
  score: number;
  targetPostId: string;
};

export type RelatedPostInput = {
  limit?: number;
  similarities: readonly RelatedPostSimilarity[];
  sourcePostId: string;
};

export type RelatedPostCandidate = {
  href: string;
  postId: string;
  similarity: number;
  slug: string;
  title: string;
};

export type BlogSearchRequestPolicy = {
  maxRequestsPerWindow: number;
  minQueryLength: number;
  repeatQueryWindowMs: number;
  requestWindowMs: number;
};

export type BlogSearchRequestHistoryEntry = {
  clientId: string;
  normalizedQuery: string;
  requestedAt: number;
};

export type BlogSearchRequestAssessmentInput = {
  cacheHit?: boolean;
  clientId?: string;
  history?: readonly BlogSearchRequestHistoryEntry[];
  policy?: Partial<BlogSearchRequestPolicy>;
  query: string;
  requestedAt: number;
};

export type BlogSearchRequestAssessment = {
  cacheKey: string;
  normalizedQuery: string;
  reason:
    | "cache_hit"
    | "duplicate_query"
    | "query_too_short"
    | "rate_limited"
    | "search_ready";
  shouldReadFromCache: boolean;
  shouldUseEmbedding: boolean;
  status: "allowed" | "blocked";
};

export const DEFAULT_BLOG_SEARCH_REQUEST_POLICY: BlogSearchRequestPolicy = {
  maxRequestsPerWindow: 20,
  minQueryLength: 2,
  repeatQueryWindowMs: 30_000,
  requestWindowMs: 60_000,
};

export function searchPublishedBlogPosts(
  store: BlogContentStore,
  input: BlogSearchInput,
): BlogSearchResult[] {
  const normalizedQuery = normalizeSearchQuery(input.query);
  const vectorScoreByPostId = new Map(
    (input.vectorScores ?? []).map((score) => [score.postId, clampScore(score.score)]),
  );

  return selectPublicBlogRouteEntries(store.posts, store.versions)
    .flatMap((entry) => {
      const keywordScore = scoreKeywordMatch(entry, store, normalizedQuery);
      const vectorScore = vectorScoreByPostId.get(entry.post.id) ?? 0;

      if (keywordScore <= 0 && vectorScore <= 0) {
        return [];
      }

      return [
        {
          description: entry.version.description,
          href: `/blog/${entry.post.slug}`,
          keywordScore,
          matchedBy: {
            keyword: keywordScore > 0,
            vector: vectorScore > 0,
          },
          postId: entry.post.id,
          score: Number((keywordScore * 0.6 + vectorScore * 0.4).toFixed(6)),
          slug: entry.post.slug,
          title: entry.version.title,
          vectorScore,
        },
      ];
    })
    .sort(compareSearchResults)
    .slice(0, normalizeLimit(input.limit));
}

export function selectPublishedRelatedPostCandidates(
  store: BlogContentStore,
  input: RelatedPostInput,
): RelatedPostCandidate[] {
  const publicEntries = selectPublicBlogRouteEntries(store.posts, store.versions);
  const sourceIsPublic = publicEntries.some(
    (entry) => entry.post.id === input.sourcePostId,
  );

  if (!sourceIsPublic) {
    return [];
  }

  const publicEntryByPostId = new Map(
    publicEntries.map((entry) => [entry.post.id, entry]),
  );

  return input.similarities
    .flatMap((similarity) => {
      if (similarity.targetPostId === input.sourcePostId) {
        return [];
      }

      const entry = publicEntryByPostId.get(similarity.targetPostId);

      if (!entry) {
        return [];
      }

      return [
        {
          href: `/blog/${entry.post.slug}`,
          postId: entry.post.id,
          similarity: clampScore(similarity.score),
          slug: entry.post.slug,
          title: entry.version.title,
        },
      ];
    })
    .sort((a, b) => b.similarity - a.similarity || a.slug.localeCompare(b.slug, "ko"))
    .slice(0, normalizeLimit(input.limit));
}

export function assessBlogSearchRequest(
  input: BlogSearchRequestAssessmentInput,
): BlogSearchRequestAssessment {
  const policy = {
    ...DEFAULT_BLOG_SEARCH_REQUEST_POLICY,
    ...input.policy,
  };
  const normalizedQuery = normalizeSearchQuery(input.query);
  const cacheKey = normalizedQuery;

  if (normalizedQuery.length < policy.minQueryLength) {
    return {
      cacheKey,
      normalizedQuery,
      reason: "query_too_short",
      shouldReadFromCache: false,
      shouldUseEmbedding: false,
      status: "blocked",
    };
  }

  if (input.cacheHit) {
    return {
      cacheKey,
      normalizedQuery,
      reason: "cache_hit",
      shouldReadFromCache: true,
      shouldUseEmbedding: false,
      status: "allowed",
    };
  }

  const recentHistory = (input.history ?? []).filter((entry) => {
    if (input.clientId && entry.clientId !== input.clientId) {
      return false;
    }

    return input.requestedAt - entry.requestedAt <= policy.requestWindowMs;
  });
  const duplicateHistory = recentHistory.find(
    (entry) =>
      entry.normalizedQuery === normalizedQuery &&
      input.requestedAt - entry.requestedAt <= policy.repeatQueryWindowMs,
  );

  if (duplicateHistory) {
    return {
      cacheKey,
      normalizedQuery,
      reason: "duplicate_query",
      shouldReadFromCache: true,
      shouldUseEmbedding: false,
      status: "blocked",
    };
  }

  if (recentHistory.length >= policy.maxRequestsPerWindow) {
    return {
      cacheKey,
      normalizedQuery,
      reason: "rate_limited",
      shouldReadFromCache: true,
      shouldUseEmbedding: false,
      status: "blocked",
    };
  }

  return {
    cacheKey,
    normalizedQuery,
    reason: "search_ready",
    shouldReadFromCache: true,
    shouldUseEmbedding: true,
    status: "allowed",
  };
}

function scoreKeywordMatch(
  entry: PublicBlogRouteEntry,
  store: BlogContentStore,
  normalizedQuery: string,
): number {
  const tokens = normalizedQuery.split(" ").filter(Boolean);

  if (tokens.length === 0) {
    return 0;
  }

  const tags = store.tags
    .filter((tag) => tag.postId === entry.post.id)
    .map((tag) => tag.tag)
    .join(" ");
  const haystack = normalizeSearchQuery(
    [
      entry.post.title,
      entry.post.description,
      entry.version.title,
      entry.version.description,
      entry.version.contentMarkdown,
      tags,
    ].join(" "),
  );
  const matchedTokenCount = tokens.filter((token) => haystack.includes(token)).length;

  return matchedTokenCount === 0 ? 0 : matchedTokenCount / tokens.length;
}

function compareSearchResults(a: BlogSearchResult, b: BlogSearchResult): number {
  return b.score - a.score || a.slug.localeCompare(b.slug, "ko");
}

function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function normalizeLimit(limit: number | undefined): number {
  return typeof limit === "number" && Number.isInteger(limit) && limit > 0
    ? limit
    : 10;
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  if (score < 0) {
    return 0;
  }

  if (score > 1) {
    return 1;
  }

  return score;
}
