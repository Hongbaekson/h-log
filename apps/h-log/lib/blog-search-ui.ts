import type {
  BlogSearchApiResponse,
  BlogSearchMatchReason,
  BlogSearchRequestAssessment,
  BlogSearchResult,
} from "./blog-search.ts";

export type BlogSearchUiStatus =
  | "blocked"
  | "empty"
  | "error"
  | "idle"
  | "loading"
  | "results";

export type BlogSearchUiResultItem = {
  description: string;
  href: string;
  matchReasonLabel: string;
  publishedAt: string;
  publishedDateLabel: string;
  scoreLabel: string;
  slug: string;
  tags: string[];
  title: string;
};

export type BlogSearchUiSnapshot = {
  cached: boolean;
  items: BlogSearchUiResultItem[];
  message: string | null;
  query: string;
  reason: BlogSearchRequestAssessment["reason"] | null;
  status: BlogSearchUiStatus;
};

export type BlogSearchUiSnapshotInput = {
  errorMessage?: string;
  loading?: boolean;
  query: string;
  response?: BlogSearchApiResponse;
};

export function createBlogSearchUiSnapshot(
  input: BlogSearchUiSnapshotInput,
): BlogSearchUiSnapshot {
  const query = input.query.trim();

  if (input.loading) {
    return createSnapshot({
      message: "검색 중입니다.",
      query,
      status: "loading",
    });
  }

  if (input.errorMessage) {
    return createSnapshot({
      message: "검색을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      query,
      status: "error",
    });
  }

  if (!input.response) {
    return createSnapshot({
      query,
      status: query ? "empty" : "idle",
    });
  }

  if (input.response.status === "blocked") {
    return createSnapshot({
      cached: input.response.cached,
      message: getBlockedSearchMessage(input.response.guardReason),
      query,
      reason: input.response.guardReason,
      status: "blocked",
    });
  }

  if (input.response.results.length === 0) {
    return createSnapshot({
      cached: input.response.cached,
      message: "일치하는 공개 글이 없습니다.",
      query,
      reason: input.response.guardReason,
      status: "empty",
    });
  }

  return createSnapshot({
    cached: input.response.cached,
    items: input.response.results.map(toBlogSearchUiResultItem),
    query,
    reason: input.response.guardReason,
    status: "results",
  });
}

function createSnapshot(input: {
  cached?: boolean;
  items?: BlogSearchUiResultItem[];
  message?: string | null;
  query: string;
  reason?: BlogSearchRequestAssessment["reason"] | null;
  status: BlogSearchUiStatus;
}): BlogSearchUiSnapshot {
  return {
    cached: input.cached ?? false,
    items: input.items ?? [],
    message: input.message ?? null,
    query: input.query,
    reason: input.reason ?? null,
    status: input.status,
  };
}

function toBlogSearchUiResultItem(
  result: BlogSearchResult,
): BlogSearchUiResultItem {
  return {
    description: result.description,
    href: result.href,
    matchReasonLabel: getBlogSearchMatchReasonLabel(result.matchReason),
    publishedAt: result.publishedAt,
    publishedDateLabel: formatBlogSearchDate(result.publishedAt),
    scoreLabel: `${Math.round(clampScore(result.score) * 100)}%`,
    slug: result.slug,
    tags: [...result.tags],
    title: result.title,
  };
}

function getBlockedSearchMessage(
  reason: BlogSearchRequestAssessment["reason"],
): string {
  if (reason === "query_too_short") {
    return "검색어는 2자 이상 입력해 주세요.";
  }

  if (reason === "rate_limited") {
    return "검색 요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (reason === "duplicate_query") {
    return "같은 검색이 반복되었습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (reason === "abnormal_query") {
    return "검색어를 줄이거나 특수 문자를 제거해 주세요.";
  }

  return "검색 요청을 처리할 수 없습니다.";
}

function getBlogSearchMatchReasonLabel(
  reason: BlogSearchMatchReason,
): string {
  if (reason === "keyword_and_vector") {
    return "키워드 + 유사도";
  }

  if (reason === "vector") {
    return "유사도";
  }

  return "키워드";
}

function formatBlogSearchDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function clampScore(score: number): number {
  if (!Number.isFinite(score) || score < 0) {
    return 0;
  }

  if (score > 1) {
    return 1;
  }

  return score;
}
