import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createBlogSearchUiSnapshot,
  parseBlogBrowseParams,
  buildBlogBrowseHref,
  type BlogSearchUiSnapshotInput,
} from "./blog-search-ui.ts";

const baseResult = {
  description: "PostgreSQL pgvector restore rehearsal",
  href: "/blog/postgres-restore",
  keywordScore: 1,
  matchReason: "keyword_and_vector",
  matchedBy: {
    keyword: true,
    vector: true,
  },
  postId: "post-postgres-restore",
  publishedAt: "2026-06-27T09:00:00.000Z",
  score: 0.9,
  slug: "postgres-restore",
  tags: ["DB", "운영"],
  title: "PostgreSQL 복구 리허설",
  vectorScore: 0.75,
} as const;

describe("blog search UI snapshot", () => {
  it("normalizes URL state and preserves query/tag when changing pages", () => {
    const state = parseBlogBrowseParams({ q: ["  Redis   Pub/Sub ", "ignored"], tag: " DB ", page: "2" });
    assert.deepEqual(state, { query: "Redis Pub/Sub", tag: "DB", page: 2 });
    const url = new URL(buildBlogBrowseHref(state), "https://example.com");
    assert.equal(url.pathname, "/blog");
    assert.equal(url.searchParams.get("q"), "Redis Pub/Sub");
    assert.equal(url.searchParams.get("tag"), "DB");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(buildBlogBrowseHref({ query: "", tag: null, page: 1 }), "/blog");
    for (const page of ["-1", "0", "1.5", "NaN", "1e2", "9007199254740992"]) {
      assert.equal(parseBlogBrowseParams({ page }).page, 1, page);
    }
  });

  it("maps cached search results into published result view items", () => {
    const snapshot = createBlogSearchUiSnapshot({
      query: "pgvector",
      response: {
        cached: true,
        reason: "cache_hit",
        pagination: { currentPage: 1, pageSize: 6, totalItems: 1, totalPages: 1 },
        results: [baseResult],
        status: "ok",
      },
    });

    assert.equal(snapshot.status, "results");
    assert.equal(snapshot.items[0]?.href, "/blog/postgres-restore");
    assert.equal(snapshot.items[0]?.matchReasonLabel, "요약에서 일치: pgvector");
    assert.equal(snapshot.items[0]?.publishedDateLabel, "2026. 06. 27.");
    assert.equal("scoreLabel" in snapshot.items[0], false);
    assert.equal(snapshot.pagination?.totalItems, 1);
    assert.deepEqual(snapshot.items[0]?.tags, ["DB", "운영"]);
  });

  it("keeps an invalid published date as the original label", () => {
    const snapshot = createBlogSearchUiSnapshot({
      query: "pgvector",
      response: {
        cached: false,
        reason: "search_ready",
        pagination: { currentPage: 1, pageSize: 6, totalItems: 1, totalPages: 1 },
        results: [{ ...baseResult, publishedAt: "invalid-date" }],
        status: "ok",
      },
    });

    assert.equal(snapshot.items[0]?.publishedAt, "invalid-date");
    assert.equal(snapshot.items[0]?.publishedDateLabel, "invalid-date");
  });

  it("maps loading, empty, rate-limited, and error states", () => {
    assert.equal(
      createBlogSearchUiSnapshot({
        loading: true,
        query: "pgvector",
      }).status,
      "loading",
    );

    assert.equal(
      createBlogSearchUiSnapshot({
        query: "없는글",
        response: {
          cached: false,
          reason: "search_ready",
          pagination: { currentPage: 1, pageSize: 6, totalItems: 0, totalPages: 1 },
          results: [],
          status: "ok",
        },
      }).status,
      "empty",
    );

    const rateLimited = createBlogSearchUiSnapshot({
      query: "pgvector",
      response: {
        cached: false,
        reason: "rate_limited",
        pagination: { currentPage: 1, pageSize: 6, totalItems: 0, totalPages: 1 },
        results: [],
        status: "blocked",
      },
    });

    assert.equal(rateLimited.status, "blocked");
    assert.equal(rateLimited.message, "검색 요청이 많습니다. 잠시 후 다시 시도해 주세요.");

    const failedInput: BlogSearchUiSnapshotInput = {
      errorMessage: "network error",
      query: "pgvector",
    };

    assert.equal(createBlogSearchUiSnapshot(failedInput).status, "error");
  });
});
