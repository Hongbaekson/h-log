import {
  assertBlogPostStatusTransition,
  createPublishJobIdempotencyKey,
  createPostVersionContentFromMarkdown,
  getPublishJobImportance,
  requiredPublishJobTypes,
  type PostGenerationRunRecord,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionRecord,
  type PublishJobRecord,
  type QualityGateResultRecord,
  type Timestamp,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import {
  createArticleGenerationRunRecord,
  validateArticleWriterOutput,
  type ArticleWriterOutput,
  type NormalizedArticleWriterOutput,
} from "./blog-article-generation.ts";
import {
  buildApplyToMeContext,
  buildResearchPack,
  collectTopicCandidates,
  createTopicResearchRuntimeState,
  type ApplyToMeGenerationInput,
  type PersonalContextItemRecord,
  type ResearchPackRecord,
  type ResearchPackPostSourceRecord,
  type ResearchPackSourceInput,
  type TopicCandidateRecord,
  type TopicResearchRuntimeState,
  type TopicSourceInput,
} from "./blog-topic-research.ts";
import {
  createBlogUsageEvent,
  isUsageBudgetExceeded,
  UNLIMITED_USAGE_BUDGET,
  type BlogUsageEventRecord,
  type BlogUsageLedger,
  type UsageBudgetPolicy,
  type UsageCostTotals,
  type UsageMeasurement,
} from "./blog-usage-ledger.ts";
import {
  createBlogPrivacyScanPolicyFromEnvironment,
  scanBlogPrivacyText,
  type BlogPrivacyScanPolicy,
  type BlogPrivacyScanResult,
} from "./blog-privacy-scanner.ts";

export type DailyAutoArticleMutableStore = {
  posts: PostRecord[];
  sources: PostSourceRecord[];
  tags: PostTagRecord[];
  versions: PostVersionRecord[];
};

export type DailyAutoArticlePipelineState = {
  generationRuns: PostGenerationRunRecord[];
  publishJobs: PublishJobRecord[];
  qualityGateResults: QualityGateResultRecord[];
  store: DailyAutoArticleMutableStore;
  topicResearchState: TopicResearchRuntimeState;
  usageEvents: BlogUsageEventRecord[];
};

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
  state: DailyAutoArticlePipelineState;
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
  post: PostRecord | null;
  status: DailyAutoArticlePipelineStatus;
  store: BlogContentStore;
  version: PostVersionRecord | null;
};

const DEFAULT_DAILY_AUTO_ARTICLE_POLICY: DailyAutoArticlePipelinePolicy = {
  ...UNLIMITED_USAGE_BUDGET,
  minTopicScore: 1,
};

export function createDailyAutoArticlePipelineState(): DailyAutoArticlePipelineState {
  return {
    generationRuns: [],
    publishJobs: [],
    qualityGateResults: [],
    store: {
      posts: [],
      sources: [],
      tags: [],
      versions: [],
    },
    topicResearchState: createTopicResearchRuntimeState(),
    usageEvents: [],
  };
}

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

  if (input.state.store.posts.some((post) => post.id === postId)) {
    return emptyResult(input, "duplicate_daily_publish");
  }

  let usageCostTotals = await input.usageLedger.getUsageCostTotals(input.runAt);

  if (isUsageBudgetExceeded(usageCostTotals, policy)) {
    return emptyResult(input, "budget_exceeded");
  }

  const collection = collectTopicCandidates({
    collectedAt: input.runAt,
    sources: input.topicSources,
    state: input.state.topicResearchState,
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
    input.state.usageEvents.push(usageEvent);
    usageCostTotals = addUsageCost(usageCostTotals, usageEvent.estimatedCost);
  }

  if (isUsageBudgetExceeded(usageCostTotals, policy)) {
    return emptyResult(input, "budget_exceeded");
  }

  const topicCandidate = rankTopicCandidates(collection.candidates).find(
    (candidate) => candidate.score >= policy.minTopicScore,
  );

  if (!topicCandidate) {
    return emptyResult(input, "no_topic");
  }

  const { postSources, researchPack } = buildResearchPack({
    createdAt: input.runAt,
    selectedAngle: topicCandidate.relevanceReason,
    sources: input.researchPackSources,
    topicCandidate,
  });

  if (!researchPack.canSupportStrongClaims) {
    return emptyResult(input, "weak_sources");
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
    return emptyResult(input, "generation_failed");
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
    input.state.qualityGateResults.push(
      createPreGenerationPrivacyFailure({
        generatedAt: input.runAt,
        postId,
        postVersionId,
        privacyScan: generationInputPrivacyScan,
      }),
    );
    return emptyResult(input, "generation_failed");
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
  input.state.usageEvents.push(llmUsageEvent);
  usageCostTotals = addUsageCost(
    usageCostTotals,
    llmUsageEvent.estimatedCost,
  );

  if (isUsageBudgetExceeded(usageCostTotals, policy)) {
    return emptyResult(input, "budget_exceeded");
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
  input.state.qualityGateResults.push(...validation.qualityGateResults);

  if (!validation.normalizedOutput || validation.status !== "passed") {
    return emptyResult(input, "generation_failed");
  }

  input.state.generationRuns.push(
    createArticleGenerationRunRecord({
      applyToMeResultId: applyToMe.applyToMeResult.id,
      createdAt: input.runAt,
      gateResult: "passed",
      inputSourceIds: postSources.map((source) => source.id),
      model: generation.usage.model ?? "daily-auto-article-adapter",
      output: validation.normalizedOutput,
      personaVersion: "hlog-persona-v1",
      postId,
      postVersionId,
      promptHash: `${input.runId}:prompt`,
    }),
  );

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
  input.state.publishJobs.push(...publishJobs);
  input.state.store.posts.push(publishingPost);
  input.state.store.sources.push(...sources);
  input.state.store.tags.push(...tags);
  input.state.store.versions.push(version);

  return {
    post: publishingPost,
    status: "publishing",
    store: input.state.store,
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

function createPreGenerationPrivacyFailure({
  generatedAt,
  postId,
  postVersionId,
  privacyScan,
}: {
  generatedAt: Timestamp;
  postId: string;
  postVersionId: string;
  privacyScan: BlogPrivacyScanResult;
}): QualityGateResultRecord {
  return {
    createdAt: generatedAt,
    gateName: "article_quality_gate:privacy_risk",
    id: `quality-gate:${postId}:${postVersionId}:privacy-risk-llm-input`,
    message: `llm_input ${privacyScan.auditMessage}`,
    postId,
    postVersionId,
    status: "failed",
  };
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
  input: DailyAutoArticlePipelineInput,
  status: Exclude<DailyAutoArticlePipelineStatus, "publishing">,
): DailyAutoArticlePipelineResult {
  return {
    post: null,
    status,
    store: input.state.store,
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
