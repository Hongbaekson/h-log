import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyToMeArticleModes,
  buildApplyToMeContext,
  buildResearchPack,
  collectTopicCandidates,
  createTopicResearchRuntimeState,
  scoreTopicCandidate,
  topicResearchSourceTypes,
  verifyArticleClaims,
  type PersonalContextItemRecord,
  type ResearchPackSourceInput,
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

function createResearchPackSource(
  overrides: Partial<ResearchPackSourceInput> = {},
): ResearchPackSourceInput {
  return {
    excerpt: "Official release excerpt used for claim-level verification.",
    fetchedAt: collectedAt,
    id: "source-official",
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
    createdAt: collectedAt,
    id: "context-hlog-worker",
    publicSafe: true,
    summary: "Public-safe summary about operating the H-Log automation worker.",
    title: "H-Log worker boundary",
    updatedAt: collectedAt,
    version: 1,
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

describe("blog topic research pack boundary", () => {
  it("builds a non-public research pack without storing full source text", () => {
    const fullSourceText =
      "FULL_SOURCE_BODY_SHOULD_NOT_BE_STORED ".repeat(40).trim();
    const topic = collectTopicCandidates({
      collectedAt,
      sources: [createSource({ id: "source-official" })],
    }).candidates[0];

    assert.ok(topic);

    const result = buildResearchPack({
      createdAt: collectedAt,
      selectedAngle: "Apply the release note to the H-Log worker boundary.",
      sources: [
        createResearchPackSource({
          excerpt: "Short official evidence excerpt.",
          rawContent: fullSourceText,
        }),
      ],
      topicCandidate: topic,
    });

    assert.equal(result.researchPack.isPublicContent, false);
    assert.deepEqual(result.researchPack.sourceIds, ["source-official"]);
    assert.equal(result.postSources[0]?.sourceRole, "official");
    assert.equal(result.postSources[0]?.snapshotHash, result.sourceSnapshots[0]?.hash);
    assert.equal(result.sourceSnapshots[0]?.excerpt, "Short official evidence excerpt.");
    assert.equal(JSON.stringify(result).includes(fullSourceText), false);
    assert.equal("rawContent" in result.sourceSnapshots[0]!, false);
  });

  it("rejects full source text in snapshots and blocks discovery-only strong claim support", () => {
    const fullSourceText =
      "This is the entire collected article body and must not become an excerpt. ".repeat(
        20,
      ).trim();
    const topic = collectTopicCandidates({
      collectedAt,
      sources: [
        createSource({
          id: "source-geeknews",
          publisher: "GeekNews",
          sourceType: "geeknews",
          url: "https://news.hada.io/topic?id=12345",
        }),
      ],
    }).candidates[0];

    assert.ok(topic);
    assert.throws(
      () =>
        buildResearchPack({
          createdAt: collectedAt,
          selectedAngle: "Use community reaction as a discovery signal.",
          sources: [
            createResearchPackSource({
              excerpt: fullSourceText,
              id: "source-geeknews",
              publisher: "GeekNews",
              rawContent: fullSourceText,
              sourceRole: "discovery",
              url: "https://news.hada.io/topic?id=12345",
            }),
          ],
          topicCandidate: topic,
        }),
      /excerpt must not store full source text/,
    );

    const result = buildResearchPack({
      createdAt: collectedAt,
      selectedAngle: "Use community reaction as a discovery signal.",
      sources: [
        createResearchPackSource({
          excerpt: "Short community reaction excerpt.",
          id: "source-geeknews",
          publisher: "GeekNews",
          rawContent: fullSourceText,
          sourceRole: "discovery",
          url: "https://news.hada.io/topic?id=12345",
        }),
      ],
      topicCandidate: topic,
    });

    assert.equal(result.researchPack.canSupportStrongClaims, false);
    assert.equal(
      result.researchPack.claimSupportPolicy,
      "needs_official_or_original_source",
    );
    assert.deepEqual(result.researchPack.officialOrOriginalSourceIds, []);
  });
});

describe("blog topic apply-to-me context ledger", () => {
  it("blocks direct-experience copy when no safe ledger item supports it", () => {
    const topic = collectTopicCandidates({
      collectedAt,
      sources: [createSource({ id: "source-official" })],
    }).candidates[0];

    assert.ok(topic);

    const pack = buildResearchPack({
      createdAt: collectedAt,
      selectedAngle: "Apply the release note to the H-Log worker boundary.",
      sources: [createResearchPackSource()],
      topicCandidate: topic,
    }).researchPack;

    const result = buildApplyToMeContext({
      createdAt: collectedAt,
      directExperienceClaims: [
        {
          personalContextId: null,
          text: "I ran this change in my portfolio automation stack.",
        },
      ],
      evidencePaths: ["evidence/apply-to-me/public-safe-command.txt"],
      personalContextItems: [
        createPersonalContextItem({
          allowedUsage: "applied_analysis",
        }),
      ],
      requestedArticleMode: "experiment",
      requestedContextIds: ["context-hlog-worker"],
      researchPack: pack,
      topicCandidate: topic,
    });

    assert.equal(result.applyToMeResult.status, "failed_generation");
    assert.equal(
      result.applyToMeResult.blockReason,
      "missing_direct_experience_context",
    );
    assert.equal(result.generationInput, null);
  });

  it("keeps forbidden or private context out of generation input", () => {
    const topic = collectTopicCandidates({
      collectedAt,
      sources: [createSource({ id: "source-official" })],
    }).candidates[0];

    assert.ok(topic);

    const pack = buildResearchPack({
      createdAt: collectedAt,
      selectedAngle: "Compare the release note with the public H-Log setup.",
      sources: [createResearchPackSource()],
      topicCandidate: topic,
    }).researchPack;
    const result = buildApplyToMeContext({
      createdAt: collectedAt,
      personalContextItems: [
        createPersonalContextItem({
          allowedUsage: "direct_experience",
        }),
        createPersonalContextItem({
          allowedUsage: "forbidden",
          id: "context-private-internal",
          publicSafe: false,
          summary: "This private context must never be sent to generation.",
          title: "Non-public internal context",
        }),
      ],
      requestedArticleMode: "applied_analysis",
      requestedContextIds: ["context-hlog-worker", "context-private-internal"],
      researchPack: pack,
      topicCandidate: topic,
    });

    assert.equal(result.applyToMeResult.status, "failed_generation");
    assert.equal(result.applyToMeResult.blockReason, "unsafe_personal_context");
    assert.deepEqual(result.applyToMeResult.blockedContextItemIds, [
      "context-private-internal",
    ]);
    assert.equal(result.generationInput, null);
    assert.equal(
      JSON.stringify(result).includes("Non-public internal context"),
      false,
    );
  });

  it("requires evidence for experiment mode and builds public-safe generation input", () => {
    const topic = collectTopicCandidates({
      collectedAt,
      sources: [createSource({ id: "source-official" })],
    }).candidates[0];

    assert.ok(topic);

    const pack = buildResearchPack({
      createdAt: collectedAt,
      selectedAngle: "Check the release note against the public H-Log worker.",
      sources: [createResearchPackSource()],
      topicCandidate: topic,
    }).researchPack;
    const context = createPersonalContextItem({
      allowedUsage: "direct_experience",
    });
    const blocked = buildApplyToMeContext({
      createdAt: collectedAt,
      directExperienceClaims: [
        {
          personalContextId: context.id,
          text: "I reproduced this against the H-Log worker boundary.",
        },
      ],
      personalContextItems: [context],
      requestedArticleMode: "experiment",
      requestedContextIds: [context.id],
      researchPack: pack,
      topicCandidate: topic,
    });

    assert.equal(blocked.applyToMeResult.status, "failed_generation");
    assert.equal(
      blocked.applyToMeResult.blockReason,
      "missing_experiment_evidence",
    );

    const ready = buildApplyToMeContext({
      commandsOrChecks: ["npm run test -- blog-topic-research"],
      createdAt: collectedAt,
      directExperienceClaims: [
        {
          personalContextId: context.id,
          text: "I reproduced this against the H-Log worker boundary.",
        },
      ],
      evidencePaths: ["evidence/apply-to-me/public-safe-test-output.txt"],
      personalContextItems: [context],
      requestedArticleMode: "experiment",
      requestedContextIds: [context.id],
      researchPack: pack,
      topicCandidate: topic,
    });

    assert.deepEqual(applyToMeArticleModes, [
      "experiment",
      "applied_analysis",
      "document_analysis",
      "project_record",
      "ops_incident",
    ]);
    assert.equal(ready.applyToMeResult.status, "ready_for_generation");
    assert.equal(ready.applyToMeResult.articleMode, "experiment");
    assert.deepEqual(ready.generationInput?.personalContextIds, [
      "context-hlog-worker",
    ]);
    assert.equal(
      ready.generationInput?.personalContextSummaries[0]?.summary,
      context.summary,
    );
  });
});

describe("blog topic claim verification source policy", () => {
  it("fails strong factual claims that have no source or evidence", () => {
    const result = verifyArticleClaims({
      checkedAt: collectedAt,
      claims: [
        {
          claimText: "Runtime 9 changes the production API behavior.",
          claimType: "api",
          id: "claim-api-change",
        },
      ],
      postId: "post-1",
      postSources: [],
      postVersionId: "version-1",
    });

    assert.equal(result.status, "failed");
    assert.deepEqual(
      result.qualityGateResults.map((gate) => gate.message),
      ["claim claim-api-change requires an official/original source or evidence path"],
    );
    assert.equal(result.articleClaims[0]?.verified, false);
    assert.equal(result.articleClaims[0]?.claimCategory, "factual");
  });

  it("blocks discovery-only and contradicted factual claims while separating opinion", () => {
    const topic = collectTopicCandidates({
      collectedAt,
      sources: [createSource({ id: "source-official" })],
    }).candidates[0];

    assert.ok(topic);

    const pack = buildResearchPack({
      createdAt: collectedAt,
      selectedAngle: "Verify runtime claims before generation.",
      sources: [
        createResearchPackSource({
          id: "source-official",
          sourceRole: "official",
        }),
        createResearchPackSource({
          id: "source-geeknews",
          publisher: "GeekNews",
          sourceRole: "discovery",
          url: "https://news.hada.io/topic?id=12345",
        }),
      ],
      topicCandidate: topic,
    });
    const result = verifyArticleClaims({
      checkedAt: collectedAt,
      claims: [
        {
          claimText: "Runtime 9 is supported until 2030.",
          claimType: "support",
          id: "claim-discovery-only",
          sourceId: "source-geeknews",
        },
        {
          claimText: "Runtime 9 has no migration cost.",
          claimType: "performance",
          id: "claim-contradicted",
          sourceAssessment: "contradicts",
          sourceId: "source-official",
        },
        {
          claimText: "This tradeoff is not worth changing H-Log yet.",
          claimType: "opinion",
          id: "claim-opinion",
        },
      ],
      postId: "post-1",
      postSources: pack.postSources,
      postVersionId: "version-1",
    });

    assert.equal(result.status, "failed");
    assert.deepEqual(
      result.qualityGateResults.map((gate) => gate.gateName),
      [
        "claim_source_policy:claim-discovery-only",
        "claim_source_policy:claim-contradicted",
      ],
    );
    assert.deepEqual(
      result.articleClaims.map((claim) => ({
        category: claim.claimCategory,
        id: claim.id,
        verified: claim.verified,
      })),
      [
        {
          category: "factual",
          id: "claim-discovery-only",
          verified: false,
        },
        {
          category: "factual",
          id: "claim-contradicted",
          verified: false,
        },
        {
          category: "opinion",
          id: "claim-opinion",
          verified: false,
        },
      ],
    );
  });
});
