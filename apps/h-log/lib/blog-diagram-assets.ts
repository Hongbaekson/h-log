import {
  createPublishJobIdempotencyKey,
  getPublishJobImportance,
  isCurrentPublishedVersion,
  recordPublishJobFailure,
  type BlogPostStatus,
  type PostAssetRecord,
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

export type StoreDiagramAssetInput = {
  alt: string;
  assetHash: string;
  assetPath: string;
  createdAt: Timestamp;
  generatedBy: string;
  id: string;
  post: PostRecord;
  verifiedAssetHash: string;
  verifiedAt: Timestamp;
  version: PostVersionRecord;
};

export type DiagramAssetAuditAction = "delete" | "replace";

export type DiagramAssetAuditRecord = {
  action: DiagramAssetAuditAction;
  actorId: string;
  createdAt: Timestamp;
  id: string;
  postAssetId: string;
  reason: string;
};

export type RecordDiagramAssetAuditActionInput = DiagramAssetAuditRecord;

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

export function storeDiagramAsset(
  input: StoreDiagramAssetInput,
): PostAssetRecord {
  if (!isCurrentPublishedVersion(input.post, input.version)) {
    throw new Error("diagram asset must target the current published version");
  }

  const alt = input.alt.trim();
  const assetHash = normalizeAssetHash(input.assetHash);
  const assetPath = input.assetPath.trim();
  const generatedBy = input.generatedBy.trim();
  const verifiedAssetHash = normalizeAssetHash(input.verifiedAssetHash);
  const verifiedAt = input.verifiedAt.trim();

  if (!alt) {
    throw new Error("diagram asset alt text is required");
  }

  if (!isPublicSafeDiagramAssetPath(assetPath)) {
    throw new Error("diagram asset requires a public-safe asset path");
  }

  assertNoSensitiveText("alt text", alt);
  assertNoSensitiveText("asset path", assetPath);

  if (!generatedBy) {
    throw new Error("diagram asset generated_by is required");
  }

  if (!verifiedAt) {
    throw new Error("diagram asset verified_at is required");
  }

  if (assetHash !== verifiedAssetHash) {
    throw new Error("diagram asset hash mismatch");
  }

  return {
    alt,
    assetHash,
    createdAt: input.createdAt,
    generatedBy,
    id: input.id,
    path: assetPath,
    postId: input.post.id,
    postVersionId: input.version.id,
    status: "ready",
    type: "diagram",
    verifiedAt,
  };
}

export function isRenderableDiagramAsset(
  asset: PostAssetRecord,
  post: PostRecord,
  version: PostVersionRecord,
): boolean {
  return (
    isCurrentPublishedVersion(post, version) &&
    asset.type === "diagram" &&
    asset.postId === post.id &&
    asset.postVersionId === version.id &&
    asset.status === "ready" &&
    asset.verifiedAt !== null &&
    isAssetHash(asset.assetHash) &&
    asset.alt.trim().length > 0 &&
    isPublicSafeDiagramAssetPath(asset.path)
  );
}

export function recordDiagramAssetAuditAction(
  input: RecordDiagramAssetAuditActionInput,
): DiagramAssetAuditRecord {
  const reason = input.reason.trim();

  if (!reason) {
    throw new Error("diagram asset audit reason is required");
  }

  return {
    ...input,
    reason,
  };
}

function createDiagramPublishJob(
  input: PlanDiagramGenerationJobInput,
): PublishJobRecord {
  return {
    error: null,
    finishedAt: null,
    id: `${input.post.id}:${input.version.id}:diagram`,
    idempotencyKey: createPublishJobIdempotencyKey("diagram", input.version),
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

function isPublicSafeDiagramAssetPath(assetPath: string): boolean {
  return (
    assetPath.startsWith("/blog-assets/") &&
    /\.(png|svg|webp)$/i.test(assetPath) &&
    !assetPath.includes("\\") &&
    !assetPath.includes("..") &&
    !assetPath.includes("://") &&
    !assetPath.startsWith("//")
  );
}

function normalizeAssetHash(assetHash: string): string {
  const normalized = assetHash.trim().toLowerCase();

  if (!isAssetHash(normalized)) {
    throw new Error("diagram asset requires a SHA-256 asset hash");
  }

  return normalized;
}

function isAssetHash(assetHash: string | null): assetHash is string {
  return assetHash !== null && /^[a-f0-9]{64}$/i.test(assetHash);
}

function assertNoSensitiveText(field: string, value: string): void {
  if (/(api[_-]?key|token|secret|password)/i.test(value)) {
    throw new Error(`diagram asset ${field} contains sensitive text`);
  }

  if (/\b(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)\b/i.test(value)) {
    throw new Error(`diagram asset ${field} contains private host text`);
  }
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
