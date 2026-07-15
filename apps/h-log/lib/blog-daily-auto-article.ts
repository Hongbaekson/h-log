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
  type ResearchPackSourceInput,
  type TopicCandidateRecord,
  type TopicResearchRuntimeState,
  type TopicResearchUsageEvent,
  type TopicSourceInput,
} from "./blog-topic-research.ts";

export type DailyAutoArticleMutableStore = {
  posts: PostRecord[];
  sources: PostSourceRecord[];
  tags: PostTagRecord[];
  versions: PostVersionRecord[];
};

export type DailyAutoArticlePipelineState = {
  dailyPublishedCounts: Map<string, number>;
  generationRuns: PostGenerationRunRecord[];
  publishJobs: PublishJobRecord[];
  qualityGateResults: QualityGateResultRecord[];
  store: DailyAutoArticleMutableStore;
  topicResearchState: TopicResearchRuntimeState;
  usageEvents: TopicResearchUsageEvent[];
};

export type DailyAutoArticlePipelinePolicy = {
  dailyPublishLimit: number;
  maxEstimatedCost: number;
  minTopicScore: number;
  retryLimit: number;
};

export type RunRequiredPublishJobResult =
  | {
      status: "succeeded";
    }
  | {
      error: string;
      status: "failed";
    };

export type RunRequiredPublishJobInput = {
  attempt: number;
  job: PublishJobRecord;
  post: PostRecord;
  runId: string;
  version: PostVersionRecord;
};

export type GenerateArticleInput = {
  generationInput: ApplyToMeGenerationInput;
  postId: string;
  postVersionId: string;
  researchPack: ResearchPackRecord;
  topicCandidate: TopicCandidateRecord;
};

export type DailyAutoArticlePipelineInput = {
  dayKey: string;
  generateArticle(input: GenerateArticleInput): Promise<ArticleWriterOutput>;
  personalContextItems: readonly PersonalContextItemRecord[];
  policy?: Partial<DailyAutoArticlePipelinePolicy>;
  researchPackSources: readonly ResearchPackSourceInput[];
  requestedContextIds?: readonly string[];
  runAt: Timestamp;
  runId: string;
  runRequiredPublishJob(
    input: RunRequiredPublishJobInput,
  ): Promise<RunRequiredPublishJobResult>;
  state: DailyAutoArticlePipelineState;
  topicSources: readonly TopicSourceInput[];
};

export type DailyAutoArticlePipelineStatus =
  | "budget_exceeded"
  | "duplicate_daily_publish"
  | "generation_failed"
  | "no_topic"
  | "publish_failed"
  | "published"
  | "weak_sources";

export type DailyAutoArticlePipelineResult = {
  post: PostRecord | null;
  status: DailyAutoArticlePipelineStatus;
  store: BlogContentStore;
  version: PostVersionRecord | null;
};

const DEFAULT_DAILY_AUTO_ARTICLE_POLICY: DailyAutoArticlePipelinePolicy = {
  dailyPublishLimit: 1,
  maxEstimatedCost: Number.POSITIVE_INFINITY,
  minTopicScore: 1,
  retryLimit: 2,
};

export function createDailyAutoArticlePipelineState(): DailyAutoArticlePipelineState {
  return {
    dailyPublishedCounts: new Map(),
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
  const policy = {
    ...DEFAULT_DAILY_AUTO_ARTICLE_POLICY,
    ...input.policy,
  };

  if (getDailyPublishedCount(input) >= policy.dailyPublishLimit) {
    return emptyResult(input, "duplicate_daily_publish");
  }

  const collection = collectTopicCandidates({
    collectedAt: input.runAt,
    sources: input.topicSources,
    state: input.state.topicResearchState,
  });
  input.state.usageEvents.push(...collection.usageEvents);

  if (getEstimatedCost(collection.usageEvents) > policy.maxEstimatedCost) {
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

  const postId = `post-${toIdSegment(input.dayKey)}`;
  const postVersionId = `version-${toIdSegment(input.dayKey)}`;
  const writerOutput = await input.generateArticle({
    generationInput: applyToMe.generationInput,
    postId,
    postVersionId,
    researchPack,
    topicCandidate,
  });
  const validation = validateArticleWriterOutput({
    existingPublishedSlugs: input.state.store.posts.flatMap((post) =>
      post.status === "published" ? [post.slug] : [],
    ),
    generatedAt: input.runAt,
    output: writerOutput,
    postId,
    postVersionId,
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
      model: "daily-auto-article-adapter",
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
  const publishingPost = toReadyToPublishPost({
    input,
    postId,
    version,
    writerOutput: validation.normalizedOutput,
  });

  assertBlogPostStatusTransition(publishingPost.status, "publishing");
  const publishJobs = createRequiredPublishJobs({
    post: { ...publishingPost, status: "publishing" },
    runAt: input.runAt,
    version,
  });
  const publishResult = await runRequiredPublishJobs({
    input,
    jobs: publishJobs,
    post: { ...publishingPost, status: "publishing" },
    policy,
    version,
  });
  input.state.publishJobs.push(...publishResult.jobs);

  if (!publishResult.succeeded) {
    return emptyResult(input, "publish_failed");
  }

  assertBlogPostStatusTransition("publishing", "verifying");
  assertBlogPostStatusTransition("verifying", "published");

  const publishedPost: PostRecord = {
    ...publishingPost,
    publishedAt: input.runAt,
    status: "published",
    updatedAt: input.runAt,
  };

  input.state.store.posts.push(publishedPost);
  input.state.store.versions.push(version);
  input.state.store.sources.push(
    ...postSources.map((source): PostSourceRecord => ({
      ...source,
      postId,
    })),
  );
  input.state.store.tags.push(
    ...validation.normalizedOutput.tags.map((tag): PostTagRecord => ({
      createdAt: input.runAt,
      id: `tag-${postId}-${toIdSegment(tag)}`,
      postId,
      tag,
    })),
  );
  input.state.dailyPublishedCounts.set(
    input.dayKey,
    getDailyPublishedCount(input) + 1,
  );

  return {
    post: publishedPost,
    status: "published",
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

function getEstimatedCost(usageEvents: readonly TopicResearchUsageEvent[]): number {
  return usageEvents.reduce((sum, event) => sum + event.estimatedCost, 0);
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

async function runRequiredPublishJobs({
  input,
  jobs,
  policy,
  post,
  version,
}: {
  input: DailyAutoArticlePipelineInput;
  jobs: readonly PublishJobRecord[];
  policy: DailyAutoArticlePipelinePolicy;
  post: PostRecord;
  version: PostVersionRecord;
}): Promise<{ jobs: PublishJobRecord[]; succeeded: boolean }> {
  const completedJobs: PublishJobRecord[] = [];

  for (const job of jobs) {
    const result = await runRequiredPublishJobWithRetry({
      input,
      job,
      policy,
      post,
      version,
    });

    completedJobs.push(result.job);

    if (!result.succeeded) {
      return {
        jobs: completedJobs,
        succeeded: false,
      };
    }
  }

  return {
    jobs: completedJobs,
    succeeded: true,
  };
}

async function runRequiredPublishJobWithRetry({
  input,
  job,
  policy,
  post,
  version,
}: {
  input: DailyAutoArticlePipelineInput;
  job: PublishJobRecord;
  policy: DailyAutoArticlePipelinePolicy;
  post: PostRecord;
  version: PostVersionRecord;
}): Promise<{ job: PublishJobRecord; succeeded: boolean }> {
  let lastError = "required publish job failed";

  for (let attempt = 1; attempt <= policy.retryLimit; attempt += 1) {
    const result = await input.runRequiredPublishJob({
      attempt,
      job: {
        ...job,
        retryCount: attempt - 1,
        status: "running",
      },
      post,
      runId: input.runId,
      version,
    });

    if (result.status === "succeeded") {
      return {
        job: {
          ...job,
          error: null,
          finishedAt: input.runAt,
          retryCount: attempt - 1,
          status: "succeeded",
        },
        succeeded: true,
      };
    }

    lastError = result.error;
  }

  return {
    job: {
      ...job,
      error: lastError,
      finishedAt: input.runAt,
      retryCount: Math.max(0, policy.retryLimit - 1),
      status: "failed",
    },
    succeeded: false,
  };
}

function getDailyPublishedCount(input: DailyAutoArticlePipelineInput): number {
  return input.state.dailyPublishedCounts.get(input.dayKey) ?? 0;
}

function emptyResult(
  input: DailyAutoArticlePipelineInput,
  status: Exclude<DailyAutoArticlePipelineStatus, "published">,
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
