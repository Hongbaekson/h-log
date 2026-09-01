import { type NextRequest, NextResponse } from "next/server";

import { loadPublicBlogContentStore } from "@/lib/blog-public-source";
import {
  createBlogSearchRuntimeState,
  handleBlogSearchApiRequest,
  type BlogSearchApiResponse,
} from "@/lib/blog-search";

export const runtime = "nodejs";

const searchRuntimeState = createBlogSearchRuntimeState();

export async function GET(request: NextRequest) {
  const store = await loadPublicBlogContentStore();
  const response = await handleBlogSearchApiRequest({
    clientId: getSearchClientId(request),
    query: request.nextUrl.searchParams.get("q") ?? "",
    state: searchRuntimeState,
    store,
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
    response.guardReason === "budget_exceeded" ||
    response.guardReason === "rate_limited"
  ) {
    return 429;
  }

  return 400;
}
