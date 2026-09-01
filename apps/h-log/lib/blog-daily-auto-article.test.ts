import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectPublicBlogRouteEntries } from "./blog-content-model.ts";
import {
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
    hasPersistedPostSlug: () => Promise.resolve(false),
    persistPublishingArticle: () => Promise.resolve(),
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
  it("passes verified research source metadata to the article writer", async () => {
    let receivedSources: unknown;
    const baseInput = createPipelineInput();
    const result = await runDailyAutoArticlePipeline(
      createPipelineInput({
        generateArticle: (input) => {
          receivedSources = input.sources;
          return baseInput.generateArticle(input);
        },
      }),
    );

    assert.equal(result.status, "publishing");
    assert.ok(Array.isArray(receivedSources));
    assert.equal(receivedSources.length, 1);
    assert.deepEqual(
      {
        fetchedAt: receivedSources[0]?.fetchedAt,
        id: receivedSources[0]?.id,
        postId: receivedSources[0]?.postId,
        publisher: receivedSources[0]?.publisher,
        researchPackId: receivedSources[0]?.researchPackId,
        sourceRole: receivedSources[0]?.sourceRole,
        summary: receivedSources[0]?.summary,
        title: receivedSources[0]?.title,
        url: receivedSources[0]?.url,
      },
      {
        fetchedAt: runAt,
        id: "source-runtime",
        postId: null,
        publisher: "Example Runtime",
        researchPackId: "research-pack-topic-source-runtime",
        sourceRole: "official",
        summary: "A concise source summary for the research pack.",
        title: "Runtime release note",
        url: "https://example.com/releases/runtime",
      },
    );
    assert.match(receivedSources[0]?.snapshotHash ?? "", /^[a-f0-9]{64}$/);
  });

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

  it("blocks persistence when the generated slug already exists", async () => {
    const checkedSlugs: string[] = [];
    let persistenceCalls = 0;
    const result = await runDailyAutoArticlePipeline(
      createPipelineInput({
        hasPersistedPostSlug: async (slug: string) => {
          checkedSlugs.push(slug);
          return true;
        },
        persistPublishingArticle: async () => {
          persistenceCalls += 1;
        },
      }),
    );

    assert.equal(result.status, "generation_failed");
    assert.deepEqual(result.failure, {
      qualityGateResults: [
        {
          gateName: "article_quality_gate:duplicate_topic",
          message: "article duplicates an existing published topic",
        },
      ],
      stage: "article_validation",
    });
    assert.deepEqual(checkedSlugs, ["runtime-release-note"]);
    assert.equal(persistenceCalls, 0);
  });

  it("hands off a redacted privacy failure without writer output", async () => {
    const fakeToken = `sk-${"x".repeat(24)}`;
    const internalUrl = "http://authoring.internal/drafts/1";
    const baseInput = createPipelineInput();
    const result = await runDailyAutoArticlePipeline(
      createPipelineInput({
        generateArticle: async (input) => {
          const generation = await baseInput.generateArticle(input);

          return {
            ...generation,
            output: createWriterOutput({
              contentMarkdown: `# Hidden draft\n\n${internalUrl}\n\n${fakeToken}\n`,
            }),
          };
        },
      }),
    );

    assert.equal(result.status, "generation_failed");
    assert.equal(result.failure?.stage, "article_validation");
    assert.deepEqual(
      result.failure?.qualityGateResults.map((gate) => gate.gateName),
      ["article_quality_gate:privacy_risk"],
    );
    assert.match(
      result.failure?.qualityGateResults[0]?.message ?? "",
      /\[REDACTED\]/,
    );
    assert.equal(JSON.stringify(result).includes(fakeToken), false);
    assert.equal(JSON.stringify(result).includes(internalUrl), false);
  });

  it("blocks sensitive generation input before calling the LLM adapter", async () => {
    const fakeToken = `sk-${"x".repeat(24)}`;
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
      }),
    );

    assert.equal(result.status, "generation_failed");
    assert.equal(generationCalls, 0);
  });

  it("blocks persistence when a factual claim references an unknown research source", async () => {
    const baseInput = createPipelineInput();
    const claimText = "Runtime 9 changes one API behavior.";
    const sourceUrl = "https://example.com/releases/runtime";
    let persistenceCalls = 0;
    const result = await runDailyAutoArticlePipeline(
      createPipelineInput({
        generateArticle: async (input) => {
          const generation = await baseInput.generateArticle(input);

          return {
            ...generation,
            output: createWriterOutput({
              claims: [
                {
                  confidence: 0.91,
                  id: "claim-runtime-api",
                  sourceId: "source-invented",
                  sourceUrl,
                  text: claimText,
                  type: "api",
                },
              ],
            }),
          };
        },
        persistPublishingArticle: async () => {
          persistenceCalls += 1;
        },
      }),
    );

    assert.equal(result.status, "generation_failed");
    assert.deepEqual(result.failure, {
      qualityGateResults: [
        {
          gateName: "claim_source_policy:claim-runtime-api",
          message:
            "claim claim-runtime-api references unknown source source-invented",
        },
      ],
      stage: "claim_verification",
    });
    assert.equal(JSON.stringify(result).includes(claimText), false);
    assert.equal(JSON.stringify(result).includes(sourceUrl), false);
    assert.equal(persistenceCalls, 0);
  });

  it("persists a generated article privately before persistent publish jobs run", async () => {
    const baseInput = createPipelineInput();
    let generationCalls = 0;
    let persistenceCalls = 0;
    const persistedAggregates: Parameters<
      DailyAutoArticlePipelineInput["persistPublishingArticle"]
    >[0][] = [];
    let persistedPostStatus: string | null = null;
    let persistedJobStatuses: string[] = [];
    const persistPublishingArticle: DailyAutoArticlePipelineInput["persistPublishingArticle"] =
      async (aggregate) => {
        persistenceCalls += 1;
        persistedAggregates.push(aggregate);
        persistedPostStatus = aggregate.post.status;
        persistedJobStatuses = aggregate.publishJobs.map((job) => job.status);
      };
    const result = await runDailyAutoArticlePipeline(
      createPipelineInput({
        generateArticle: (input) => {
          generationCalls += 1;
          return baseInput.generateArticle(input);
        },
        persistPublishingArticle,
      }),
    );

    assert.equal(result.status, "publishing");
    assert.equal(result.post?.status, "publishing");
    assert.equal(persistedPostStatus, "publishing");
    assert.deepEqual(
      persistedJobStatuses,
      Array.from({ length: 6 }, () => "queued"),
    );
    assert.equal(generationCalls, 1);
    assert.equal(persistenceCalls, 1);
    const persistedAggregate = persistedAggregates[0];
    assert.ok(persistedAggregate);
    assert.equal(
      selectPublicBlogRouteEntries(
        [persistedAggregate.post],
        [persistedAggregate.version],
      ).length,
      0,
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
      const result = await runDailyAutoArticlePipeline(
        createPipelineInput({
          ...testCase.input,
        }),
      );

      assert.equal(result.status, testCase.status);
      assert.equal(result.post, null);
      assert.equal(result.version, null);
    }
  });

});
