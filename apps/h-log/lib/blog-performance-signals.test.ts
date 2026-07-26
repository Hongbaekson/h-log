import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createContentPerformanceAggregate,
  selectPersonaLearningCandidates,
} from "./blog-performance-signals.ts";

const baseAggregate = {
  id: "signal-post-1-view-2026-07-26",
  postId: "post-1",
  signalType: "post_view",
  value: 120,
  windowEnd: "2026-07-27T00:00:00.000Z",
  windowStart: "2026-07-26T00:00:00.000Z",
} as const;

describe("blog content performance signals", () => {
  it("rejects visitor identifiers and raw request metadata", () => {
    for (const field of [
      "visitorId",
      "sessionId",
      "cookieId",
      "ip",
      "userAgent",
      "referrer",
    ]) {
      assert.throws(
        () =>
          createContentPerformanceAggregate({
            ...baseAggregate,
            [field]: "private-request-value",
          }),
        new RegExp(`must not include visitor-level field ${field}`),
      );
    }
  });

  it("does not start persona learning without aggregate signals", () => {
    assert.deepEqual(
      selectPersonaLearningCandidates([], {
        minimumValues: {
          post_view: 100,
          search_result_click: 5,
        },
      }),
      [],
    );
  });

  it("keeps provider cost usage events outside the content signal contract", () => {
    assert.throws(
      () =>
        createContentPerformanceAggregate({
          ...baseAggregate,
          eventType: "llm",
          provider: "openai-codex",
        }),
      /contains unsupported field eventType/,
    );
  });

  it("selects only aggregate-qualified posts and exposes style fields only", () => {
    const signals = [
      createContentPerformanceAggregate(baseAggregate),
      createContentPerformanceAggregate({
        ...baseAggregate,
        id: "signal-post-1-search-click-2026-07-26",
        signalType: "search_result_click",
        value: 8,
      }),
      createContentPerformanceAggregate({
        ...baseAggregate,
        id: "signal-post-2-view-2026-07-26",
        postId: "post-2",
        value: 200,
      }),
    ];

    assert.deepEqual(
      selectPersonaLearningCandidates(signals, {
        minimumValues: {
          post_view: 100,
          search_result_click: 5,
        },
      }),
      [
        {
          learningFields: ["title", "structure", "angle"],
          postId: "post-1",
          qualifyingSignals: ["post_view", "search_result_click"],
          windowEnd: "2026-07-27T00:00:00.000Z",
          windowStart: "2026-07-26T00:00:00.000Z",
        },
      ],
    );
  });
});
