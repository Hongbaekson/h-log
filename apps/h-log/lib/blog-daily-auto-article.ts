import {
  assertBlogPostStatusTransition,
  createPublishJobIdempotencyKey,
  createPostVersionContentFromMarkdown,
  getPublishJobImportance,
  requiredPublishJobTypes,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionRecord,
  type PublishJobRecord,
  type QualityGateResultRecord,
  type Timestamp,
} from "./blog-content-model.ts";
import {
  validateArticleWriterOutput,
  type ArticleWriterOutput,
  type NormalizedArticleWriterOutput,
} from "./blog-article-generation.ts";
import {
  buildApplyToMeContext,
  buildResearchPack,
  collectTopicCandidates,
  createTopicResearchRuntimeState,
  verifyArticleClaims,
  type ApplyToMeGenerationInput,
  type PersonalContextItemRecord,
  type ResearchPackRecord,
  type ResearchPackPostSourceRecord,
  type ResearchPackSourceInput,
  type TopicCandidateRecord,
  type TopicSourceInput,
} from "./blog-topic-research.ts";
import {
  createBlogUsageEvent,
  isUsageBudgetExceeded,
  UNLIMITED_USAGE_BUDGET,
  type BlogUsageLedger,
  type UsageBudgetPolicy,
  type UsageCostTotals,
  type UsageMeasurement,
} from "./blog-usage-ledger.ts";
import {
  createBlogPrivacyScanPolicyFromEnvironment,
  scanBlogPrivacyText,
  type BlogPrivacyScanPolicy,
} from "./blog-privacy-scanner.ts";

export type DailyAutoArticlePipelinePolicy = UsageBudgetPolicy & {
  minTopicScore: number;
};

export type GenerateArticleInput = {
  generationInput: ApplyToMeGenerationInput;
  postId: string;
  postVersionId: string;
  researchPack: ResearchPackRecord;
  sources: readonly ResearchPackPostSourceRecord[];
  topicCandidate: TopicCandidateRecord;
};

export type GenerateArticleResult = {
  output: ArticleWriterOutput;
  usage: UsageMeasurement;
};

export type PersistPublishingArticleInput = {
  post: PostRecord;
  publishJobs: readonly PublishJobRecord[];
  sources: readonly PostSourceRecord[];
  tags: readonly PostTagRecord[];
  version: PostVersionRecord;
};

export type DailyAutoArticlePipelineInput = {
  dayKey: string;
  generateArticle(input: GenerateArticleInput): Promise<GenerateArticleResult>;
  hasPersistedPostSlug(slug: string): Promise<boolean>;
  personalContextItems: readonly PersonalContextItemRecord[];
  persistPublishingArticle(
    input: PersistPublishingArticleInput,
  ): Promise<void>;
  policy?: Partial<DailyAutoArticlePipelinePolicy>;
  privacyScanPolicy?: BlogPrivacyScanPolicy;
  researchPackSources: readonly ResearchPackSourceInput[];
  requestedContextIds?: readonly string[];
  runAt: Timestamp;
  runId: string;
  topicSources: readonly TopicSourceInput[];
  usageLedger: BlogUsageLedger;
};

export type DailyAutoArticlePipelineStatus =
  | "budget_exceeded"
  | "duplicate_daily_publish"
  | "generation_failed"
  | "no_topic"
  | "publishing"
  | "weak_sources";

export type DailyAutoArticlePipelineResult = {
  failure?: {
    qualityGateResults: Pick<QualityGateResultRecord, "gateName" | "message">[];
    stage: "article_validation" | "claim_verification";
  };
  post: PostRecord | null;
  status: DailyAutoArticlePipelineStatus;
  version: PostVersionRecord | null;
};

const DEFAULT_DAILY_AUTO_ARTICLE_POLICY: DailyAutoArticlePipelinePolicy = {
  ...UNLIMITED_USAGE_BUDGET,
  minTopicScore: 1,
};

export async function runDailyAutoArticlePipeline(
  input: DailyAutoArticlePipelineInput,
): Promise<DailyAutoArticlePipelineResult> {
  const privacyScanPolicy =
    input.privacyScanPolicy ??
    createBlogPrivacyScanPolicyFromEnvironment(process.env);
  const policy = {
    ...DEFAULT_DAILY_AUTO_ARTICLE_POLICY,
    ...input.policy,
  };
  const postId = `post-${toIdSegment(input.dayKey)}`;

  let usageCostTotals = await input.usageLedger.getUsageCostTotals(input.runAt);

  if (isUsageBudgetExceeded(usageCostTotals, policy)) {
    return emptyResult("budget_exceeded");
  }

  const collection = collectTopicCandidates({
    collectedAt: input.runAt,
    sources: input.topicSources,
    state: createTopicResearchRuntimeState(),
  });
  for (const event of collection.usageEvents) {
    const usageEvent = createBlogUsageEvent({
      createdAt: event.createdAt,
      eventType: event.eventType,
      id: `${input.runId}:${event.eventType}:${event.sourceId}`,
      measurement: {
        estimatedCost: event.estimatedCost,
        inputTokens: null,
        model: null,
        outputTokens: null,
        provider: event.provider,
      },
      runId: input.runId,
      status: event.status,
    });
    await input.usageLedger.recordUsageEvent(usageEvent);
    usageCostTotals = addUsageCost(usageCostTotals, usageEvent.estimatedCost);
  }

  if (isUsageBudgetExceeded(usageCostTotals, policy)) {
    return emptyResult("budget_exceeded");
  }

  const topicCandidate = rankTopicCandidates(collection.candidates).find(
    (candidate) => candidate.score >= policy.minTopicScore,
  );

  if (!topicCandidate) {
    return emptyResult("no_topic");
  }

  const { postSources, researchPack } = buildResearchPack({
    createdAt: input.runAt,
    selectedAngle: topicCandidate.relevanceReason,
    sources: input.researchPackSources,
    topicCandidate,
  });

  if (!researchPack.canSupportStrongClaims) {
    return emptyResult("weak_sources");
  }

  const applyToMe = buildApplyToMeContext({
    createdAt: input.runAt,
    personalContextItems: input.personalContextItems,
    requestedContextIds:
      input.requestedContextIds ??
      input.personalContextItems.map((context) => context.id),
    researchPack,
    topicCandidate,
  });

  if (!applyToMe.generationInput) {
    return emptyResult("generation_failed");
  }

  const postVersionId = `version-${toIdSegment(input.dayKey)}`;
  const generationInputPrivacyScan = scanBlogPrivacyText(
    JSON.stringify({
      generationInput: applyToMe.generationInput,
      researchPack,
      topicCandidate,
    }),
    privacyScanPolicy,
  );

  if (generationInputPrivacyScan.status === "blocked") {
    return emptyResult("generation_failed");
  }

  const generation = await input.generateArticle({
    generationInput: applyToMe.generationInput,
    postId,
    postVersionId,
    researchPack,
    sources: postSources,
    topicCandidate,
  });
  if (!generation?.usage) {
    throw new Error("LLM usage event is required");
  }
  const llmUsageEvent = createBlogUsageEvent({
    createdAt: input.runAt,
    eventType: "llm",
    id: `${input.runId}:llm`,
    measurement: generation.usage,
    runId: input.runId,
    status: "success",
  });
  await input.usageLedger.recordUsageEvent(llmUsageEvent);
  usageCostTotals = addUsageCost(
    usageCostTotals,
    llmUsageEvent.estimatedCost,
  );

  if (isUsageBudgetExceeded(usageCostTotals, policy)) {
    return emptyResult("budget_exceeded");
  }

  const writerOutput = generation.output;
  const existingPublishedSlugs = (await input.hasPersistedPostSlug(writerOutput.slug))
    ? [writerOutput.slug]
    : [];
  const validation = validateArticleWriterOutput({
    existingPublishedSlugs,
    generatedAt: input.runAt,
    output: writerOutput,
    postId,
    postVersionId,
    privacyScanPolicy,
  });

  if (!validation.normalizedOutput || validation.status !== "passed") {
    return emptyResult("generation_failed", {
      qualityGateResults: validation.qualityGateResults.map(
        ({ gateName, message }) => ({ gateName, message }),
      ),
      stage: "article_validation",
    });
  }

  const claimVerification = verifyArticleClaims({
    checkedAt: input.runAt,
    claims: validation.normalizedOutput.claims.map((claim) => ({
      claimText: claim.text,
      claimType: claim.type,
      confidence: claim.confidence,
      evidencePath: claim.evidencePath ?? undefined,
      evidenceQuote: claim.evidenceQuote ?? undefined,
      id: claim.id,
      sourceId: claim.sourceId ?? undefined,
    })),
    postId,
    postSources,
    postVersionId,
  });

  if (claimVerification.status !== "passed") {
    return emptyResult("generation_failed", {
      qualityGateResults: claimVerification.qualityGateResults.map(
        ({ gateName, message }) => ({ gateName, message }),
      ),
      stage: "claim_verification",
    });
  }

  const version = toPostVersionRecord({
    input,
    postId,
    postVersionId,
    researchPackId: researchPack.id,
    writerOutput: validation.normalizedOutput,
  });
  const readyToPublishPost = toReadyToPublishPost({
    input,
    postId,
    version,
    writerOutput: validation.normalizedOutput,
  });

  assertBlogPostStatusTransition(readyToPublishPost.status, "publishing");
  const publishingPost: PostRecord = {
    ...readyToPublishPost,
    status: "publishing",
  };
  const publishJobs = createRequiredPublishJobs({
    post: publishingPost,
    runAt: input.runAt,
    version,
  });
  const sources = postSources.map((source): PostSourceRecord => ({
    ...source,
    postId,
  }));
  const tags = validation.normalizedOutput.tags.map(
    (tag): PostTagRecord => ({
      createdAt: input.runAt,
      id: `tag-${postId}-${toIdSegment(tag)}`,
      postId,
      tag,
    }),
  );

  await input.persistPublishingArticle({
    post: publishingPost,
    publishJobs,
    sources,
    tags,
    version,
  });

  return {
    post: publishingPost,
    status: "publishing",
    version,
  };
}

function rankTopicCandidates(
  candidates: readonly TopicCandidateRecord[],
): TopicCandidateRecord[] {
  return [...candidates].sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title, "ko"),
  );
}

function addUsageCost(
  totals: UsageCostTotals,
  estimatedCost: number,
): UsageCostTotals {
  return {
    dailyEstimatedCost: totals.dailyEstimatedCost + estimatedCost,
    monthlyEstimatedCost: totals.monthlyEstimatedCost + estimatedCost,
  };
}

function toReadyToPublishPost({
  input,
  postId,
  version,
  writerOutput,
}: {
  input: DailyAutoArticlePipelineInput;
  postId: string;
  version: PostVersionRecord;
  writerOutput: NormalizedArticleWriterOutput;
}): PostRecord {
  return {
    articleMode: writerOutput.articleMode,
    createdAt: input.runAt,
    currentVersionId: version.id,
    description: writerOutput.description,
    id: postId,
    publishedAt: null,
    retractedAt: null,
    slug: writerOutput.slug,
    status: "ready_to_publish",
    title: writerOutput.title,
    unpublishedAt: null,
    updatedAt: input.runAt,
  };
}

function toPostVersionRecord({
  input,
  postId,
  postVersionId,
  researchPackId,
  writerOutput,
}: {
  input: DailyAutoArticlePipelineInput;
  postId: string;
  postVersionId: string;
  researchPackId: string;
  writerOutput: NormalizedArticleWriterOutput;
}): PostVersionRecord {
  const content = createPostVersionContentFromMarkdown(
    writerOutput.contentMarkdown,
  );

  return {
    ...content,
    createdAt: input.runAt,
    createdBy: "system",
    description: writerOutput.description,
    id: postVersionId,
    personaVersionId: "hlog-persona-v1",
    postId,
    researchPackId,
    title: writerOutput.title,
    versionNo: 1,
  };
}

function createRequiredPublishJobs({
  post,
  runAt,
  version,
}: {
  post: PostRecord;
  runAt: Timestamp;
  version: PostVersionRecord;
}): PublishJobRecord[] {
  return requiredPublishJobTypes.map((type) => ({
    error: null,
    finishedAt: null,
    id: `${post.id}:${version.id}:${type}`,
    idempotencyKey: createPublishJobIdempotencyKey(type, version),
    importance: getPublishJobImportance(type),
    postId: post.id,
    postVersionId: version.id,
    retryCount: 0,
    startedAt: runAt,
    status: "queued",
    type,
  }));
}

function emptyResult(
  status: Exclude<DailyAutoArticlePipelineStatus, "publishing">,
  failure?: DailyAutoArticlePipelineResult["failure"],
): DailyAutoArticlePipelineResult {
  return {
    ...(failure ? { failure } : {}),
    post: null,
    status,
    version: null,
  };
}

function toIdSegment(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}
