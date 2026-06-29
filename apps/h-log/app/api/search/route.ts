import { type NextRequest, NextResponse } from "next/server";

import { blogContentStore } from "@/lib/blog-public-data";
import {
  createBlogSearchRuntimeState,
  handleBlogSearchApiRequest,
  type BlogSearchApiResponse,
  type BlogSearchEmbeddingAdapter,
} from "@/lib/blog-search";

export const runtime = "nodejs";

const searchRuntimeState = createBlogSearchRuntimeState();
const localKeywordOnlyEmbeddingAdapter: BlogSearchEmbeddingAdapter = {
  async embedSearchQuery() {
    return {
      model: "keyword-only",
      provider: "h-log-local",
      vectorScores: [],
    };
  },
};

export async function GET(request: NextRequest) {
  const response = await handleBlogSearchApiRequest({
    clientId: getSearchClientId(request),
    embeddingAdapter: localKeywordOnlyEmbeddingAdapter,
    query: request.nextUrl.searchParams.get("q") ?? "",
    state: searchRuntimeState,
    store: blogContentStore,
  });

  return NextResponse.json(
    {
      cached: response.cached,
      reason: response.guardReason,
      results: response.results,
      status: response.status,
    },
    {
      status: getSearchHttpStatus(response),
    },
  );
}

function getSearchClientId(request: NextRequest): string {
  return request.headers.get("x-real-ip")?.trim() || "local";
}

function getSearchHttpStatus(response: BlogSearchApiResponse): number {
  if (response.status === "ok") {
    return 200;
  }

  if (
    response.guardReason === "duplicate_query" ||
    response.guardReason === "rate_limited"
  ) {
    return 429;
  }

  return 400;
}
