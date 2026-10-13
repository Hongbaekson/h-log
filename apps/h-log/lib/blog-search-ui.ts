import type {
  BlogSearchHttpResponse,
  BlogSearchRequestAssessment,
  BlogSearchResult,
} from "./blog-search.ts";
import { formatPublicBlogDate } from "./blog-public-presentation.ts";
import type { PublicBlogPagination } from "./blog-public.ts";

export type BlogBrowseState = { query: string; tag: string | null; page: number };
export type BlogBrowseParams = { q?: string | string[]; tag?: string | string[]; page?: string | string[] };

export function parseBlogBrowseParams(params: BlogBrowseParams): BlogBrowseState {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const rawPage = first(params.page);
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  return {
    query: first(params.q).trim().replace(/\s+/g, " "),
    tag: first(params.tag).trim() || null,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function buildBlogBrowseHref(state: BlogBrowseState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.tag) params.set("tag", state.tag);
  if (state.page > 1) params.set("page", String(state.page));
  return params.size ? `/blog?${params}` : "/blog";
}

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
  slug: string;
  tags: string[];
  title: string;
};

export type BlogSearchUiSnapshot = {
  items: BlogSearchUiResultItem[];
  message: string | null;
  query: string;
  pagination: PublicBlogPagination | null;
  status: BlogSearchUiStatus;
};

export type BlogSearchUiSnapshotInput = {
  errorMessage?: string;
  loading?: boolean;
  query: string;
  response?: BlogSearchHttpResponse;
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
      message: getBlockedSearchMessage(input.response.reason),
      query,
      status: "blocked",
    });
  }

  if (input.response.results.length === 0) {
    return createSnapshot({
      message: "일치하는 공개 글이 없습니다.",
      query,
      pagination: input.response.pagination,
      status: "empty",
    });
  }

  return createSnapshot({
    items: input.response.results.map((result) => toBlogSearchUiResultItem(result, query)),
    query,
    pagination: input.response.pagination,
    status: "results",
  });
}

function createSnapshot(input: {
  items?: BlogSearchUiResultItem[];
  message?: string | null;
  query: string;
  pagination?: PublicBlogPagination;
  status: BlogSearchUiStatus;
}): BlogSearchUiSnapshot {
  return {
    items: input.items ?? [],
    message: input.message ?? null,
    query: input.query,
    pagination: input.pagination ?? null,
    status: input.status,
  };
}

function toBlogSearchUiResultItem(
  result: BlogSearchResult,
  query: string,
): BlogSearchUiResultItem {
  return {
    description: result.description,
    href: result.href,
    matchReasonLabel: getBlogSearchMatchReasonLabel(result, query),
    publishedAt: result.publishedAt,
    publishedDateLabel: formatPublicBlogDate(result.publishedAt),
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
  result: BlogSearchResult,
  query: string,
): string {
  const tokens = [...new Set(query.toLocaleLowerCase("ko-KR").split(/\s+/).filter(Boolean))];
  for (const [label, text] of [["제목", result.title], ["요약", result.description], ["태그", result.tags.join(" ")]]) {
    const matches = tokens.filter((token) => text.toLocaleLowerCase("ko-KR").includes(token));
    if (matches.length) return `${label}에서 일치: ${matches.join(" · ")}`;
  }
  return "검색어와 관련된 내용이 있는 글입니다.";
}
