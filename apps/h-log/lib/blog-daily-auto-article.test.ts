import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectPublicBlogRouteEntries } from "./blog-content-model.ts";
import {
  createDailyAutoArticlePipelineState,
  runDailyAutoArticlePipeline,
  type DailyAutoArticlePipelineInput,
} from "./blog-daily-auto-article.ts";
import type { ArticleWriterOutput } from "./blog-article-generation.ts";
import type {
  PersonalContextItemRecord,
  ResearchPackSourceInput,
  TopicSourceInput,
} from "./blog-topic-research.ts";

const runAt = "2026-07-08T00:00:00.000Z";

function createTopicSource(
  overrides: Partial<TopicSourceInput> = {},
): TopicSourceInput {
  return {
    applyCategories: ["H-Log"],
    applyTargets: ["worker"],
    estimatedCost: 0.002,
    id: "source-runtime",
    publisher: "Example Runtime",
    relevanceReason: "Runtime release affects the H-Log worker boundary.",
    signals: {
      backendAutomationFit: true,
      directVerificationAvailable: true,
      expertiseRelevance: true,
      operationalLesson: true,
      originalSourceAvailable: true,
    },
    sourceType: "official_release_note",
    summary: "Runtime release note summary for article generation.",
    title: "Runtime release note",
    url: "https://example.com/releases/runtime",
    ...overrides,
  };
}

function createResearchPackSource(
  overrides: Partial<ResearchPackSourceInput> = {},
): ResearchPackSourceInput {
  return {
    claimMetadata: [
      {
        claimId: "claim-runtime-api",
        claimText: "Runtime 9 changes one API behavior.",
        sourceId: "source-runtime",
      },
    ],
    excerpt: "Official release excerpt used for claim-level verification.",
    fetchedAt: runAt,
    id: "source-runtime",
    publisher: "Example Runtime",
    rawContent:
      "Official full source body that must never be stored in source snapshots. ".repeat(
        20,
      ),
    sourceRole: "official",
    summary: "A concise source summary for the research pack.",
    title: "Runtime release note",
    url: "https://example.com/releases/runtime",
    ...overrides,
  };
}

function createPersonalContextItem(
  overrides: Partial<PersonalContextItemRecord> = {},
): PersonalContextItemRecord {
  return {
    allowedUsage: "applied_analysis",
    category: "Portfolio / Site",
    createdAt: runAt,
    id: "context-hlog-worker",
    publicSafe: true,
    summary: "Public-safe summary about operating the H-Log automation worker.",
    title: "H-Log worker boundary",
    updatedAt: runAt,
    version: 1,
    ...overrides,
  };
}

function createWriterOutput(
  overrides: Partial<ArticleWriterOutput> = {},
): ArticleWriterOutput {
  return {
    articleMode: "applied_analysis",
    blockReason: null,
    claims: [
      {
        confidence: 0.91,
        id: "claim-runtime-api",
        sourceId: "source-runtime",
        sourceUrl: "https://example.com/releases/runtime",
        text: "Runtime 9 changes one API behavior.",
        type: "api",
      },
    ],
    contentMarkdown:
      "# Runtime release note\n\nPublic-source based analysis for H-Log.\n",
    description: "Runtime release note impact on the H-Log worker boundary.",
    evidencePaths: ["evidence/runtime-release.md"],
    personalContextIds: ["context-hlog-worker"],
    publishDecision: "publish",
    slug: "runtime-release-note",
    sources: ["https://example.com/releases/runtime"],
    tags: ["운영", "H-Log"],
    title: "Runtime release note affects the H-Log worker boundary",
    ...overrides,
  };
}

function createPipelineInput(
  overrides: Partial<DailyAutoArticlePipelineInput> = {},
): DailyAutoArticlePipelineInput {
  return {
    dayKey: "2026-07-08",
    generateArticle: () =>
      Promise.resolve({
        output: createWriterOutput(),
        usage: {
          estimatedCost: 0.01,
          inputTokens: 1000,
          model: "fake-writer",
          outputTokens: 400,
          provider: "fake-provider",
        },
      }),
    personalContextItems: [createPersonalContextItem()],
    researchPackSources: [createResearchPackSource()],
    runAt,
    runId: "daily-run-2026-07-08",
    runRequiredPublishJob: () => Promise.resolve({ status: "succeeded" }),
    state: createDailyAutoArticlePipelineState(),
    topicSources: [createTopicSource()],
    usageLedger: {
      getUsageCostTotals: () =>
        Promise.resolve({ dailyEstimatedCost: 0, monthlyEstimatedCost: 0 }),
      recordUsageEvent: () => Promise.resolve(),
    },
    ...overrides,
  };
}

describe("daily auto article pipeline", () => {
  it("rejects an LLM result that has no usage event", async () => {
    await assert.rejects(
      runDailyAutoArticlePipeline(
        createPipelineInput({
          generateArticle: () => Promise.resolve(createWriterOutput() as never),
        }),
      ),
      /LLM usage event is required/,
    );
  });

  it("blocks a new LLM call when the persisted daily budget is exhausted", async () => {
    let generationCalls = 0;
    const input = createPipelineInput({
      generateArticle: async () => {
        generationCalls += 1;
        return createPipelineInput().generateArticle({} as never);
      },
      policy: {
        dailyEstimatedCostLimit: 1,
        monthlyEstimatedCostLimit: 10,
      },
      usageLedger: {
        getUsageCostTotals: () =>
          Promise.resolve({ dailyEstimatedCost: 1, monthlyEstimatedCost: 4 }),
        recordUsageEvent: () => Promise.resolve(),
      },
    });

    const result = await runDailyAutoArticlePipeline(input);

    assert.equal(result.status, "budget_exceeded");
    assert.equal(generationCalls, 0);
  });

  it("blocks sensitive generation input before calling the LLM adapter", async () => {
    const fakeToken = `sk-${"x".repeat(24)}`;
    const state = createDailyAutoArticlePipelineState();
    let generationCalls = 0;
    const result = await runDailyAutoArticlePipeline(
      createPipelineInput({
        generateArticle: async () => {
          generationCalls += 1;
          return createPipelineInput().generateArticle({} as never);
        },
        personalContextItems: [
          createPersonalContextItem({
            summary: `Public-safe label was wrong: api_key=${fakeToken}`,
          }),
        ],
        state,
      }),
    );

    assert.equal(result.status, "generation_failed");
    assert.equal(generationCalls, 0);
    assert.deepEqual(
      state.qualityGateResults.map((gate) => gate.gateName),
      ["article_quality_gate:privacy_risk"],
    );
    assert.match(state.qualityGateResults[0]?.message ?? "", /\[REDACTED\]/);
    assert.equal(JSON.stringify(state.qualityGateResults).includes(fakeToken), false);
  });

  it("publishes at most one article when the same daily cron is duplicated", async () => {
    const state = createDailyAutoArticlePipelineState();
    const first = await runDailyAutoArticlePipeline(
      createPipelineInput({ state }),
    );
    const second = await runDailyAutoArticlePipeline(
      createPipelineInput({
        runId: "daily-run-2026-07-08-duplicate",
        state,
      }),
    );

    assert.equal(first.status, "published");
    assert.equal(second.status, "duplicate_daily_publish");
    assert.equal(state.store.posts.length, 1);
    assert.equal(state.store.versions.length, 1);
    assert.equal(
      selectPublicBlogRouteEntries(state.store.posts, state.store.versions)
        .length,
      1,
    );
  });

  it("keeps no_topic, weak_sources, and budget_exceeded runs private", async () => {
    const cases: readonly {
      input: Partial<DailyAutoArticlePipelineInput>;
      status: "budget_exceeded" | "no_topic" | "weak_sources";
    }[] = [
      {
        input: {
          topicSources: [],
        },
        status: "no_topic",
      },
      {
        input: {
          researchPackSources: [
            createResearchPackSource({
              sourceRole: "discovery",
            }),
          ],
          topicSources: [
            createTopicSource({
              publisher: "GeekNews",
              sourceType: "geeknews",
              url: "https://news.hada.io/topic?id=12345",
            }),
          ],
        },
        status: "weak_sources",
      },
      {
        input: {
          policy: {
            dailyEstimatedCostLimit: 0.001,
            monthlyEstimatedCostLimit: 1,
          },
        },
        status: "budget_exceeded",
      },
    ];

    for (const testCase of cases) {
      const state = createDailyAutoArticlePipelineState();
      const result = await runDailyAutoArticlePipeline(
        createPipelineInput({
          state,
          ...testCase.input,
        }),
      );

      assert.equal(result.status, testCase.status);
      assert.equal(state.store.posts.length, 0);
      assert.deepEqual(
        selectPublicBlogRouteEntries(state.store.posts, state.store.versions),
        [],
      );
    }
  });

  it("stops required publish job retries at the configured limit", async () => {
    const state = createDailyAutoArticlePipelineState();
    let attempts = 0;

    const result = await runDailyAutoArticlePipeline(
      createPipelineInput({
        policy: {
          retryLimit: 2,
        },
        runRequiredPublishJob: () => {
          attempts += 1;

          return Promise.resolve({
            error: "public URL smoke failed",
            status: "failed",
          });
        },
        state,
      }),
    );

    assert.equal(result.status, "publish_failed");
    assert.equal(attempts, 2);
    assert.equal(state.store.posts.length, 0);
    assert.deepEqual(
      selectPublicBlogRouteEntries(state.store.posts, state.store.versions),
      [],
    );
  });
});
