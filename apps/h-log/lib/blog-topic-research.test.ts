import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectTopicCandidates,
  createTopicResearchRuntimeState,
  scoreTopicCandidate,
  topicResearchSourceTypes,
  type TopicSourceInput,
} from "./blog-topic-research.ts";

const collectedAt = "2026-07-01T00:00:00.000Z";

function createSource(
  overrides: Partial<TopicSourceInput> = {},
): TopicSourceInput {
  return {
    estimatedCost: 0.002,
    id: "source-1",
    publisher: "Example",
    signals: {
      backendAutomationFit: true,
      directVerificationAvailable: true,
      expertiseRelevance: true,
      operationalLesson: true,
      originalSourceAvailable: true,
    },
    sourceType: "official_release_note",
    summary: "A release note summary with enough context for ranking.",
    title: "Runtime release note",
    url: "https://example.com/releases/runtime",
    ...overrides,
  };
}

describe("blog topic research source collector contract", () => {
  it("deduplicates normalized source URLs before creating topic candidates", () => {
    const result = collectTopicCandidates({
      collectedAt,
      sources: [
        createSource({
          id: "source-1",
          url: "https://example.com/releases/runtime?utm_source=geeknews#comments",
        }),
        createSource({
          id: "source-2",
          url: "https://example.com/releases/runtime/",
        }),
      ],
    });

    assert.deepEqual(
      result.candidates.map((candidate) => candidate.sourceId),
      ["source-1"],
    );
    assert.equal(result.candidates[0]?.url, "https://example.com/releases/runtime");
    assert.equal(result.rejectedSources[0]?.sourceId, "source-2");
    assert.equal(result.rejectedSources[0]?.reason, "duplicate_url");
    assert.equal(result.usageEvents.length, 1);
  });

  it("keeps discovery-only sources out of claim support even with high scores", () => {
    const result = collectTopicCandidates({
      collectedAt,
      sources: [
        createSource({
          id: "source-geeknews",
          publisher: "GeekNews",
          signals: {
            backendAutomationFit: true,
            communityInterestSignal: true,
            directVerificationAvailable: true,
            expertiseRelevance: true,
            operationalLesson: true,
            originalSourceAvailable: true,
          },
          sourceType: "geeknews",
          title: "Developer reaction to runtime release",
          url: "https://news.hada.io/topic?id=12345",
        }),
      ],
    });
    const candidate = result.candidates[0];

    assert.ok(candidate);
    assert.equal(candidate.score, 130);
    assert.equal(candidate.sourceRole, "discovery");
    assert.equal(candidate.canSupportClaims, false);
    assert.equal(
      candidate.claimSourcePolicy,
      "needs_original_or_official_source",
    );
  });

  it("applies ranking signals, cache TTL, daily limits, and source fetch cost records", () => {
    const state = createTopicResearchRuntimeState();
    const first = collectTopicCandidates({
      collectedAt,
      policy: {
        dailySourceLimit: 1,
        sourceCacheTtlMs: 60_000,
      },
      sources: [
        createSource({
          id: "source-strong",
          signals: {
            backendAutomationFit: true,
            directVerificationAvailable: true,
            expertiseRelevance: true,
            operationalLesson: true,
            originalSourceAvailable: true,
          },
        }),
        createSource({
          id: "source-over-limit",
          url: "https://example.com/releases/another-runtime",
        }),
      ],
      state,
    });
    const cached = collectTopicCandidates({
      collectedAt: "2026-07-01T00:00:30.000Z",
      policy: {
        sourceCacheTtlMs: 60_000,
      },
      sources: [
        createSource({
          id: "source-cache-hit",
        }),
      ],
      state,
    });

    assert.equal(scoreTopicCandidate(first.candidates[0]?.signals), 115);
    assert.deepEqual(
      first.rejectedSources.map((source) => source.reason),
      ["daily_source_limit_reached"],
    );
    assert.deepEqual(first.usageEvents, [
      {
        createdAt: collectedAt,
        estimatedCost: 0.002,
        eventType: "source_fetch",
        provider: "Example",
        sourceId: "source-strong",
        status: "success",
      },
    ]);
    assert.deepEqual(cached.candidates, []);
    assert.equal(cached.rejectedSources[0]?.reason, "source_cache_hit");
    assert.equal(state.usageEvents.length, 1);
  });

  it("lists the source types supported by the first topic research phase", () => {
    assert.deepEqual(topicResearchSourceTypes, [
      "geeknews",
      "yozm_it",
      "company_tech_blog",
      "official_release_note",
      "hacker_news",
      "github",
      "security_ops_feed",
      "reddit",
    ]);
  });
});
