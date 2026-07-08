import {
  getPublishJobImportance,
  isCurrentPublishedVersion,
  recordPublishJobFailure,
  type BlogPostStatus,
  type PostRecord,
  type PostVersionRecord,
  type PublishJobFailureResult,
  type PublishJobRecord,
  type Timestamp,
} from "./blog-content-model.ts";

export const diagramTriggerTopics = [
  "architecture",
  "workflow",
  "infra",
  "data-flow",
] as const;

export type DiagramTriggerTopic = (typeof diagramTriggerTopics)[number];

export type DiagramGenerationPolicy = {
  diagramGenerationMax: number;
};

export type PlanDiagramGenerationJobInput = {
  diagramJobsCreatedToday: number;
  policy?: Partial<DiagramGenerationPolicy>;
  post: PostRecord;
  runAt: Timestamp;
  topics: readonly string[];
  version: PostVersionRecord;
};

export type PlanDiagramGenerationJobResult =
  | {
      job: PublishJobRecord;
      reason: null;
      status: "scheduled";
      triggerTopic: DiagramTriggerTopic;
    }
  | {
      job: null;
      reason:
        | "not_current_published_version"
        | "quota_exceeded"
        | "unsupported_topic";
      status: "skipped";
      triggerTopic: null;
    };

export type RecordDiagramGenerationFailureInput = {
  error: string;
  finishedAt: Timestamp;
  job: PublishJobRecord;
  postStatus: BlogPostStatus;
};

const DEFAULT_DIAGRAM_GENERATION_POLICY: DiagramGenerationPolicy = {
  diagramGenerationMax: 1,
};

export function planDiagramGenerationJob(
  input: PlanDiagramGenerationJobInput,
): PlanDiagramGenerationJobResult {
  if (!isCurrentPublishedVersion(input.post, input.version)) {
    return skipped("not_current_published_version");
  }

  const triggerTopic = findDiagramTriggerTopic(input.topics);

  if (!triggerTopic) {
    return skipped("unsupported_topic");
  }

  const policy = {
    ...DEFAULT_DIAGRAM_GENERATION_POLICY,
    ...input.policy,
  };

  if (input.diagramJobsCreatedToday >= policy.diagramGenerationMax) {
    return skipped("quota_exceeded");
  }

  return {
    job: createDiagramPublishJob(input),
    reason: null,
    status: "scheduled",
    triggerTopic,
  };
}

export function recordDiagramGenerationFailure(
  input: RecordDiagramGenerationFailureInput,
): PublishJobFailureResult {
  if (input.job.type !== "diagram") {
    throw new Error(
      `publish job ${input.job.id}: expected diagram job, received ${input.job.type}`,
    );
  }

  return recordPublishJobFailure(input);
}

function createDiagramPublishJob(
  input: PlanDiagramGenerationJobInput,
): PublishJobRecord {
  return {
    error: null,
    finishedAt: null,
    id: `${input.post.id}:${input.version.id}:diagram`,
    idempotencyKey: `${input.post.id}:${input.version.id}:diagram`,
    importance: getPublishJobImportance("diagram"),
    postId: input.post.id,
    postVersionId: input.version.id,
    retryCount: 0,
    startedAt: input.runAt,
    status: "queued",
    type: "diagram",
  };
}

function findDiagramTriggerTopic(
  topics: readonly string[],
): DiagramTriggerTopic | null {
  const normalizedTopics = new Set(
    topics.map((topic) => topic.trim().toLowerCase()),
  );

  return (
    diagramTriggerTopics.find((topic) => normalizedTopics.has(topic)) ?? null
  );
}

function skipped(
  reason: Exclude<PlanDiagramGenerationJobResult["reason"], null>,
): PlanDiagramGenerationJobResult {
  return {
    job: null,
    reason,
    status: "skipped",
    triggerTopic: null,
  };
}
