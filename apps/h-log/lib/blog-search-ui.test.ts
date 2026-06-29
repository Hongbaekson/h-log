import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createBlogSearchUiSnapshot,
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
  it("maps cached search results into published result view items", () => {
    const snapshot = createBlogSearchUiSnapshot({
      query: "pgvector",
      response: {
        cached: true,
        guardReason: "cache_hit",
        results: [baseResult],
        status: "ok",
      },
    });

    assert.equal(snapshot.status, "results");
    assert.equal(snapshot.cached, true);
    assert.equal(snapshot.items[0]?.href, "/blog/postgres-restore");
    assert.equal(snapshot.items[0]?.matchReasonLabel, "키워드 + 유사도");
    assert.equal(snapshot.items[0]?.publishedDateLabel, "2026. 06. 27.");
    assert.equal(snapshot.items[0]?.scoreLabel, "90%");
    assert.deepEqual(snapshot.items[0]?.tags, ["DB", "운영"]);
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
          guardReason: "search_ready",
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
        guardReason: "rate_limited",
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
