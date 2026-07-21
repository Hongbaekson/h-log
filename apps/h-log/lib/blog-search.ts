import {
  selectPublicBlogRouteEntries,
  type PostChunkRecord,
  type PublicBlogRouteEntry,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import {
  createBlogUsageEvent,
  isUsageBudgetExceeded,
  UNLIMITED_USAGE_BUDGET,
  type BlogUsageEventRecord,
  type BlogUsageLedger,
  type UsageBudgetPolicy,
} from "./blog-usage-ledger.ts";

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

export type BlogSearchMatchReason =
  | "keyword"
  | "keyword_and_vector"
  | "vector";

export type BlogSearchInput = {
  limit?: number;
  query: string;
  vectorScores?: readonly BlogSearchVectorScore[];
};

export type BlogSearchResult = {
  description: string;
  href: string;
  keywordScore: number;
  matchReason: BlogSearchMatchReason;
  matchedBy: {
    keyword: boolean;
    vector: boolean;
  };
  postId: string;
  publishedAt: string;
  score: number;
  slug: string;
  tags: readonly string[];
  title: string;
  vectorScore: number;
};

export type RelatedPostSimilarity = {
  score: number;
  targetPostId: string;
};

export type RelatedPostSimilarityReason =
  | "embedding_similarity"
  | "tag_overlap";

export type RelatedPostInput = {
  limit?: number;
  similarities: readonly RelatedPostSimilarity[];
  sourcePostId: string;
};

export type RelatedPostSimilarityInput = {
  chunks: readonly PostChunkRecord[];
  limit?: number;
  sourcePostId: string;
};

export type RelatedPostCandidate = {
  href: string;
  matchedBy: {
    embedding: boolean;
    tag: boolean;
  };
  postId: string;
  sharedTags: string[];
  similarity: number;
  similarityPercent: number;
  similarityReason: RelatedPostSimilarityReason;
  slug: string;
  title: string;
};

export type BlogSearchRequestPolicy = {
  maxQueryLength: number;
  maxRequestsPerWindow: number;
  maxTokenLength: number;
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
    | "abnormal_query"
    | "budget_exceeded"
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
  maxQueryLength: 120,
  maxRequestsPerWindow: 20,
  maxTokenLength: 40,
  minQueryLength: 2,
  repeatQueryWindowMs: 30_000,
  requestWindowMs: 60_000,
};

export type BlogSearchApiPolicy = BlogSearchRequestPolicy &
  UsageBudgetPolicy & {
    queryCacheTtlMs: number;
    resultLimit: number;
  };

export type BlogSearchEmbeddingInput = {
  normalizedQuery: string;
  purpose: Extract<BlogSearchEmbeddingPurpose, "search">;
};

export type BlogSearchEmbeddingOutput = {
  estimatedCost?: number;
  inputTokens?: number;
  model: string;
  outputTokens?: number;
  provider: string;
  vectorScores?: readonly BlogSearchVectorScore[];
};

export type BlogSearchEmbeddingAdapter = {
  embedSearchQuery(
    input: BlogSearchEmbeddingInput,
  ): Promise<BlogSearchEmbeddingOutput>;
};

export type BlogSearchUsageEvent = BlogUsageEventRecord & {
  eventType: "embedding";
  purpose: BlogSearchEmbeddingPurpose;
  status: "success";
};

export type BlogSearchApiResponse = {
  cached: boolean;
  guardReason: BlogSearchRequestAssessment["reason"];
  results: BlogSearchResult[];
  status: "blocked" | "ok";
};

export type BlogSearchRuntimeState = {
  queryCache: Map<string, BlogSearchQueryCacheEntry>;
  requestHistory: BlogSearchRequestHistoryEntry[];
  usageEvents: BlogSearchUsageEvent[];
};

export type HandleBlogSearchApiRequestInput = {
  clientId: string;
  embeddingAdapter?: BlogSearchEmbeddingAdapter;
  policy?: Partial<BlogSearchApiPolicy>;
  query: string;
  requestedAt?: number;
  state?: BlogSearchRuntimeState;
  store: BlogContentStore;
  usageLedger?: BlogUsageLedger;
};

type BlogSearchQueryCacheEntry = {
  expiresAt: number;
  response: BlogSearchApiResponse;
};

const DEFAULT_BLOG_SEARCH_API_POLICY: BlogSearchApiPolicy = {
  ...DEFAULT_BLOG_SEARCH_REQUEST_POLICY,
  ...UNLIMITED_USAGE_BUDGET,
  queryCacheTtlMs: 5 * 60_000,
  resultLimit: 10,
};
const TAG_FALLBACK_MAX_SCORE = 0.35;

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
      const matchedBy = {
        keyword: keywordScore > 0,
        vector: vectorScore > 0,
      };

      if (keywordScore <= 0 && vectorScore <= 0) {
        return [];
      }

      return [
        {
          description: entry.version.description,
          href: `/blog/${entry.post.slug}`,
          keywordScore,
          matchReason: getBlogSearchMatchReason(matchedBy),
          matchedBy,
          postId: entry.post.id,
          publishedAt: entry.post.publishedAt ?? entry.post.updatedAt,
          score: Number((keywordScore * 0.6 + vectorScore * 0.4).toFixed(6)),
          slug: entry.post.slug,
          tags: getPostTags(entry.post.id, store),
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
  const sourceTags = getPostTags(input.sourcePostId, store);

  return input.similarities
    .flatMap((similarity): RelatedPostCandidate[] => {
      if (similarity.targetPostId === input.sourcePostId) {
        return [];
      }

      const entry = publicEntryByPostId.get(similarity.targetPostId);

      if (!entry) {
        return [];
      }

      const sharedTags = getSharedTags(sourceTags, getPostTags(entry.post.id, store));
      const score = clampScore(similarity.score);

      return [
        {
          href: `/blog/${entry.post.slug}`,
          matchedBy: {
            embedding: true,
            tag: sharedTags.length > 0,
          },
          postId: entry.post.id,
          sharedTags,
          similarity: score,
          similarityPercent: toSimilarityPercent(score),
          similarityReason: "embedding_similarity",
          slug: entry.post.slug,
          title: entry.version.title,
        },
      ];
    })
    .sort(compareRelatedPostCandidates)
    .slice(0, normalizeLimit(input.limit));
}

export function selectPublishedRelatedPostsBySimilarity(
  store: BlogContentStore,
  input: RelatedPostSimilarityInput,
): RelatedPostCandidate[] {
  const publicEntries = selectPublicBlogRouteEntries(store.posts, store.versions);
  const sourceEntry = publicEntries.find(
    (entry) => entry.post.id === input.sourcePostId,
  );

  if (!sourceEntry) {
    return [];
  }

  const sourceChunks = getFreshPostChunksForEntry(input.chunks, sourceEntry);
  const sourceTags = getPostTags(sourceEntry.post.id, store);

  return publicEntries
    .flatMap((entry): RelatedPostCandidate[] => {
      if (entry.post.id === sourceEntry.post.id) {
        return [];
      }

      const targetChunks = getFreshPostChunksForEntry(input.chunks, entry);
      const embeddingScore = scoreChunkEmbeddingSimilarity(
        sourceChunks,
        targetChunks,
      );
      const sharedTags = getSharedTags(sourceTags, getPostTags(entry.post.id, store));
      const tagScore = scoreTagFallback(sourceTags, entry.post.id, store, sharedTags);
      const hasEmbeddingMatch = embeddingScore > 0;

      if (!hasEmbeddingMatch && tagScore <= 0) {
        return [];
      }

      const score = hasEmbeddingMatch ? embeddingScore : tagScore;

      return [
        {
          href: `/blog/${entry.post.slug}`,
          matchedBy: {
            embedding: hasEmbeddingMatch,
            tag: sharedTags.length > 0,
          },
          postId: entry.post.id,
          sharedTags,
          similarity: score,
          similarityPercent: toSimilarityPercent(score),
          similarityReason: hasEmbeddingMatch
            ? "embedding_similarity"
            : "tag_overlap",
          slug: entry.post.slug,
          title: entry.version.title,
        },
      ];
    })
    .sort(compareRelatedPostCandidates)
    .slice(0, normalizeLimit(input.limit));
}

export function createBlogSearchRuntimeState(): BlogSearchRuntimeState {
  return {
    queryCache: new Map(),
    requestHistory: [],
    usageEvents: [],
  };
}

export async function handleBlogSearchApiRequest(
  input: HandleBlogSearchApiRequestInput,
): Promise<BlogSearchApiResponse> {
  const requestedAt = input.requestedAt ?? Date.now();
  const state = input.state ?? createBlogSearchRuntimeState();
  const policy = {
    ...DEFAULT_BLOG_SEARCH_API_POLICY,
    ...input.policy,
  };
  const cacheProbe = assessBlogSearchRequest({
    clientId: input.clientId,
    history: state.requestHistory,
    policy,
    query: input.query,
    requestedAt,
  });
  const cached = getFreshBlogSearchCacheEntry(
    state.queryCache,
    cacheProbe.cacheKey,
    requestedAt,
  );
  const assessment = assessBlogSearchRequest({
    cacheHit: Boolean(cached),
    clientId: input.clientId,
    history: state.requestHistory,
    policy,
    query: input.query,
    requestedAt,
  });

  if (cached && assessment.reason === "cache_hit") {
    const publicPostIds = new Set(
      selectPublicBlogRouteEntries(input.store.posts, input.store.versions).map(
        ({ post }) => post.id,
      ),
    );

    return {
      ...cached.response,
      cached: true,
      guardReason: "cache_hit",
      results: cached.response.results.filter(({ postId }) =>
        publicPostIds.has(postId),
      ),
    };
  }

  if (assessment.status === "blocked") {
    return {
      cached: false,
      guardReason: assessment.reason,
      results: [],
      status: "blocked",
    };
  }

  let vectorScores: readonly BlogSearchVectorScore[] = [];

  if (assessment.shouldUseEmbedding && input.embeddingAdapter) {
    if (!input.usageLedger) {
      throw new Error("search embedding usage ledger is required");
    }

    const totals = await input.usageLedger.getUsageCostTotals(
      new Date(requestedAt).toISOString(),
    );

    if (isUsageBudgetExceeded(totals, policy)) {
      return {
        cached: false,
        guardReason: "budget_exceeded",
        results: [],
        status: "blocked",
      };
    }

    const embedding = await input.embeddingAdapter.embedSearchQuery({
      normalizedQuery: assessment.normalizedQuery,
      purpose: "search",
    });

    vectorScores = embedding.vectorScores ?? [];
    const usageEvent = toBlogSearchUsageEvent(
      embedding,
      assessment.normalizedQuery,
      requestedAt,
      crypto.randomUUID(),
    );
    await input.usageLedger.recordUsageEvent(usageEvent);
    state.usageEvents.push(usageEvent);
  }

  const response: BlogSearchApiResponse = {
    cached: false,
    guardReason: assessment.reason,
    results: searchPublishedBlogPosts(input.store, {
      limit: policy.resultLimit,
      query: assessment.normalizedQuery,
      vectorScores,
    }),
    status: "ok",
  };

  state.requestHistory.push({
    clientId: input.clientId,
    normalizedQuery: assessment.normalizedQuery,
    requestedAt,
  });
  state.queryCache.set(assessment.cacheKey, {
    expiresAt: requestedAt + policy.queryCacheTtlMs,
    response,
  });
  pruneExpiredBlogSearchCacheEntries(state.queryCache, requestedAt);

  return response;
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

  if (isAbnormalSearchQuery(normalizedQuery, policy)) {
    return {
      cacheKey,
      normalizedQuery,
      reason: "abnormal_query",
      shouldReadFromCache: false,
      shouldUseEmbedding: false,
      status: "blocked",
    };
  }

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

function getFreshBlogSearchCacheEntry(
  queryCache: Map<string, BlogSearchQueryCacheEntry>,
  cacheKey: string,
  requestedAt: number,
): BlogSearchQueryCacheEntry | undefined {
  const cached = queryCache.get(cacheKey);

  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= requestedAt) {
    queryCache.delete(cacheKey);
    return undefined;
  }

  return cached;
}

function pruneExpiredBlogSearchCacheEntries(
  queryCache: Map<string, BlogSearchQueryCacheEntry>,
  requestedAt: number,
): void {
  for (const [cacheKey, cached] of queryCache) {
    if (cached.expiresAt <= requestedAt) {
      queryCache.delete(cacheKey);
    }
  }
}

function toBlogSearchUsageEvent(
  embedding: BlogSearchEmbeddingOutput,
  normalizedQuery: string,
  requestedAt: number,
  runId: string,
): BlogSearchUsageEvent {
  return {
    ...createBlogUsageEvent({
      createdAt: new Date(requestedAt).toISOString(),
      eventType: "embedding",
      id: `${runId}:embedding:search`,
      measurement: {
        estimatedCost: embedding.estimatedCost ?? 0,
        inputTokens:
          embedding.inputTokens ?? estimateBlogSearchInputTokens(normalizedQuery),
        model: embedding.model,
        outputTokens: embedding.outputTokens ?? 0,
        provider: embedding.provider,
      },
      runId,
      status: "success",
    }),
    eventType: "embedding",
    purpose: "search",
    status: "success",
  };
}

function isAbnormalSearchQuery(
  normalizedQuery: string,
  policy: BlogSearchRequestPolicy,
): boolean {
  if (normalizedQuery.length > policy.maxQueryLength) {
    return true;
  }

  if (
    normalizedQuery
      .split(" ")
      .filter(Boolean)
      .some((token) => token.length > policy.maxTokenLength)
  ) {
    return true;
  }

  return /(?:https?:\/\/|localhost|127\.0\.0\.1|<script|[{}<>]|\.\.\/)/.test(
    normalizedQuery,
  );
}

function estimateBlogSearchInputTokens(normalizedQuery: string): number {
  return Math.max(1, Math.ceil(normalizedQuery.length / 4));
}

function getFreshPostChunksForEntry(
  chunks: readonly PostChunkRecord[],
  entry: PublicBlogRouteEntry,
): PostChunkRecord[] {
  return chunks.filter(
    (chunk) =>
      chunk.postId === entry.post.id &&
      chunk.postVersionId === entry.version.id &&
      chunk.contentHash === entry.version.contentHash &&
      chunk.embedding.length > 0,
  );
}

function scoreChunkEmbeddingSimilarity(
  sourceChunks: readonly PostChunkRecord[],
  targetChunks: readonly PostChunkRecord[],
): number {
  let bestScore = 0;

  for (const sourceChunk of sourceChunks) {
    for (const targetChunk of targetChunks) {
      bestScore = Math.max(
        bestScore,
        cosineSimilarity(sourceChunk.embedding, targetChunk.embedding),
      );
    }
  }

  return clampScore(bestScore);
}

function cosineSimilarity(
  sourceEmbedding: readonly number[],
  targetEmbedding: readonly number[],
): number {
  if (
    sourceEmbedding.length === 0 ||
    targetEmbedding.length === 0 ||
    sourceEmbedding.length !== targetEmbedding.length
  ) {
    return 0;
  }

  let dotProduct = 0;
  let sourceNorm = 0;
  let targetNorm = 0;

  for (let index = 0; index < sourceEmbedding.length; index += 1) {
    const sourceValue = sourceEmbedding[index] ?? 0;
    const targetValue = targetEmbedding[index] ?? 0;

    if (!Number.isFinite(sourceValue) || !Number.isFinite(targetValue)) {
      return 0;
    }

    dotProduct += sourceValue * targetValue;
    sourceNorm += sourceValue ** 2;
    targetNorm += targetValue ** 2;
  }

  if (sourceNorm <= 0 || targetNorm <= 0) {
    return 0;
  }

  return clampScore(dotProduct / (Math.sqrt(sourceNorm) * Math.sqrt(targetNorm)));
}

function scoreTagFallback(
  sourceTags: readonly string[],
  targetPostId: string,
  store: BlogContentStore,
  sharedTags: readonly string[],
): number {
  if (sharedTags.length === 0) {
    return 0;
  }

  const targetTags = getPostTags(targetPostId, store);
  const tagUnionSize = new Set([...sourceTags, ...targetTags]).size;

  if (tagUnionSize === 0) {
    return 0;
  }

  return clampScore((sharedTags.length / tagUnionSize) * TAG_FALLBACK_MAX_SCORE);
}

function getPostTags(postId: string, store: BlogContentStore): string[] {
  const seen = new Set<string>();

  return store.tags.flatMap((tagRecord) => {
    if (tagRecord.postId !== postId || seen.has(tagRecord.tag)) {
      return [];
    }

    seen.add(tagRecord.tag);
    return [tagRecord.tag];
  });
}

function getSharedTags(
  sourceTags: readonly string[],
  targetTags: readonly string[],
): string[] {
  const targetTagSet = new Set(targetTags);

  return sourceTags.filter((tag) => targetTagSet.has(tag));
}

function compareRelatedPostCandidates(
  a: RelatedPostCandidate,
  b: RelatedPostCandidate,
): number {
  const embeddingRank =
    Number(b.matchedBy.embedding) - Number(a.matchedBy.embedding);

  return (
    embeddingRank ||
    b.similarity - a.similarity ||
    b.sharedTags.length - a.sharedTags.length ||
    a.slug.localeCompare(b.slug, "ko")
  );
}

function toSimilarityPercent(score: number): number {
  return Math.round(clampScore(score) * 100);
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

function getBlogSearchMatchReason(matchedBy: {
  keyword: boolean;
  vector: boolean;
}): BlogSearchMatchReason {
  if (matchedBy.keyword && matchedBy.vector) {
    return "keyword_and_vector";
  }

  if (matchedBy.vector) {
    return "vector";
  }

  return "keyword";
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
