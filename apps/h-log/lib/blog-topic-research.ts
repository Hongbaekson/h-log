import { createHash } from "node:crypto";

import {
  type ArticleClaimRecord,
  type ArticleClaimType,
  blogArticleModes,
  type BlogArticleMode,
  type PostSourceRole,
  type QualityGateResultRecord,
  type Timestamp,
} from "./blog-content-model.ts";

export const topicResearchSourceTypes = [
  "geeknews",
  "yozm_it",
  "company_tech_blog",
  "official_release_note",
  "hacker_news",
  "github",
  "security_ops_feed",
  "reddit",
] as const;

export type TopicResearchSourceType =
  (typeof topicResearchSourceTypes)[number];

export type TopicCandidateSignals = {
  backendAutomationFit?: boolean;
  commonSummaryRisk?: boolean;
  communityInterestSignal?: boolean;
  directVerificationAvailable?: boolean;
  expertiseRelevance?: boolean;
  operationalLesson?: boolean;
  originalSourceAvailable?: boolean;
  privacyRisk?: boolean;
  weakSource?: boolean;
};

export type TopicSourceInput = {
  applyCategories?: readonly string[];
  applyTargets?: readonly string[];
  estimatedCost?: number;
  id: string;
  publisher: string;
  relevanceReason?: string;
  signals: TopicCandidateSignals;
  sourceType: TopicResearchSourceType;
  summary: string;
  title: string;
  url: string;
};

export type TopicCandidateRecord = {
  applyCategories: readonly string[];
  applyTargets: readonly string[];
  canSupportClaims: boolean;
  claimSourcePolicy:
    | "can_support_claims"
    | "needs_original_or_official_source";
  collectedAt: Timestamp;
  id: string;
  publisher: string;
  relevanceReason: string;
  rejectionReason: string | null;
  score: number;
  signals: TopicCandidateSignals;
  sourceId: string;
  sourceRole: PostSourceRole;
  sourceType: TopicResearchSourceType;
  status: "new" | "rejected" | "selected" | "used";
  summary: string;
  title: string;
  url: string;
};

export type ResearchPackClaimMetadata = {
  claimId: string;
  claimText: string;
  sourceId: string;
};

export type ResearchPackSourceInput = {
  claimMetadata?: readonly ResearchPackClaimMetadata[];
  excerpt: string;
  fetchedAt: Timestamp;
  id: string;
  publisher: string;
  rawContent?: string;
  sourceRole: PostSourceRole;
  summary: string;
  title: string;
  url: string;
};

export type ResearchPackRecord = {
  canSupportStrongClaims: boolean;
  claimSupportPolicy:
    | "has_official_or_original_source"
    | "needs_official_or_original_source";
  createdAt: Timestamp;
  id: string;
  isPublicContent: false;
  officialOrOriginalSourceIds: readonly string[];
  riskNotes: readonly string[];
  selectedAngle: string;
  sourceIds: readonly string[];
  summary: string;
  topicCandidateId: string;
};

export type ResearchPackPostSourceRecord = {
  fetchedAt: Timestamp;
  id: string;
  postId: null;
  publisher: string;
  researchPackId: string;
  snapshotHash: string;
  sourceRole: PostSourceRole;
  summary: string;
  title: string;
  url: string;
};

export type ResearchPackSourceSnapshotRecord = {
  claimMetadata: readonly ResearchPackClaimMetadata[];
  excerpt: string;
  extractedTextPath: null;
  fetchedAt: Timestamp;
  hash: string;
  id: string;
  sourceId: string;
  sourceRole: PostSourceRole;
};

export type BuildResearchPackInput = {
  createdAt: Timestamp;
  id?: string;
  riskNotes?: readonly string[];
  selectedAngle: string;
  sources: readonly ResearchPackSourceInput[];
  summary?: string;
  topicCandidate: TopicCandidateRecord;
};

export type BuildResearchPackResult = {
  postSources: ResearchPackPostSourceRecord[];
  researchPack: ResearchPackRecord;
  sourceSnapshots: ResearchPackSourceSnapshotRecord[];
};

export const personalContextAllowedUsages = [
  "direct_experience",
  "applied_analysis",
  "reference_only",
  "forbidden",
] as const;

export const applyToMeArticleModes = blogArticleModes;

export type PersonalContextAllowedUsage =
  (typeof personalContextAllowedUsages)[number];

export type PersonalContextItemRecord = {
  allowedUsage: PersonalContextAllowedUsage;
  category: string;
  createdAt: Timestamp;
  id: string;
  publicSafe: boolean;
  summary: string;
  title: string;
  updatedAt: Timestamp;
  version: number;
};

export type ApplyToMeDirectExperienceClaimInput = {
  evidencePath?: string;
  personalContextId: string | null;
  text: string;
};

export type ApplyToMeResultStatus =
  | "ready_for_generation"
  | "failed_generation";

export type ApplyToMeBlockReason =
  | "missing_direct_experience_context"
  | "missing_experiment_evidence"
  | "unsafe_personal_context";

export type ApplyToMeResultRecord = {
  applyCategories: readonly string[];
  applyTargets: readonly string[];
  articleMode: BlogArticleMode;
  blockReason: ApplyToMeBlockReason | null;
  blockedContextItemIds: readonly string[];
  commandsOrChecks: readonly string[];
  createdAt: Timestamp;
  evidencePaths: readonly string[];
  hypothesis: string;
  id: string;
  personalContextIds: readonly string[];
  researchPackId: string;
  status: ApplyToMeResultStatus;
  summary: string;
  topicCandidateId: string;
};

export type ApplyToMeGenerationContext = {
  allowedUsage: Exclude<PersonalContextAllowedUsage, "forbidden">;
  category: string;
  id: string;
  summary: string;
  title: string;
  version: number;
};

export type ApplyToMeGenerationInput = {
  articleMode: BlogArticleMode;
  commandsOrChecks: readonly string[];
  evidencePaths: readonly string[];
  personalContextIds: readonly string[];
  personalContextSummaries: readonly ApplyToMeGenerationContext[];
  researchPackId: string;
  selectedAngle: string;
  summary: string;
  topicCandidateId: string;
};

export type BuildApplyToMeContextInput = {
  commandsOrChecks?: readonly string[];
  createdAt: Timestamp;
  directExperienceClaims?: readonly ApplyToMeDirectExperienceClaimInput[];
  evidencePaths?: readonly string[];
  hypothesis?: string;
  id?: string;
  personalContextItems: readonly PersonalContextItemRecord[];
  requestedArticleMode?: BlogArticleMode;
  requestedContextIds: readonly string[];
  researchPack: ResearchPackRecord;
  summary?: string;
  topicCandidate: TopicCandidateRecord;
};

export type BuildApplyToMeContextResult = {
  applyToMeResult: ApplyToMeResultRecord;
  generationInput: ApplyToMeGenerationInput | null;
};

export type ArticleClaimSourceAssessment =
  | "supports"
  | "contradicts"
  | "neutral";

export type ArticleClaimInput = {
  claimText: string;
  claimType: ArticleClaimType;
  confidence?: number;
  evidencePath?: string;
  evidenceQuote?: string;
  id: string;
  sourceAssessment?: ArticleClaimSourceAssessment;
  sourceId?: string;
};

export type VerifyArticleClaimsInput = {
  checkedAt: Timestamp;
  claims: readonly ArticleClaimInput[];
  postId: string;
  postSources: readonly Pick<
    ResearchPackPostSourceRecord,
    "id" | "sourceRole"
  >[];
  postVersionId: string;
};

export type VerifyArticleClaimsResult = {
  articleClaims: ArticleClaimRecord[];
  qualityGateResults: QualityGateResultRecord[];
  status: "passed" | "failed";
};

export type TopicSourceRejection = {
  normalizedUrl: string;
  reason:
    | "daily_source_limit_reached"
    | "duplicate_url"
    | "source_cache_hit";
  sourceId: string;
};

export type TopicResearchUsageEvent = {
  createdAt: Timestamp;
  estimatedCost: number;
  eventType: "source_fetch";
  provider: string;
  sourceId: string;
  status: "success";
};

export type TopicSourceCacheEntry = {
  fetchedAt: Timestamp;
  normalizedUrl: string;
  sourceId: string;
};

export type TopicResearchRuntimeState = {
  sourceCache: Map<string, TopicSourceCacheEntry>;
  usageEvents: TopicResearchUsageEvent[];
};

export type TopicResearchCollectionPolicy = {
  dailySourceLimit: number;
  sourceCacheTtlMs: number;
};

export type CollectTopicCandidatesInput = {
  collectedAt: Timestamp;
  policy?: Partial<TopicResearchCollectionPolicy>;
  sources: readonly TopicSourceInput[];
  state?: TopicResearchRuntimeState;
};

export type CollectTopicCandidatesResult = {
  candidates: TopicCandidateRecord[];
  rejectedSources: TopicSourceRejection[];
  usageEvents: TopicResearchUsageEvent[];
};

export const DEFAULT_TOPIC_RESEARCH_COLLECTION_POLICY: TopicResearchCollectionPolicy =
  {
    dailySourceLimit: 100,
    sourceCacheTtlMs: 24 * 60 * 60 * 1_000,
  };

export function createTopicResearchRuntimeState(): TopicResearchRuntimeState {
  return {
    sourceCache: new Map(),
    usageEvents: [],
  };
}

export function collectTopicCandidates(
  input: CollectTopicCandidatesInput,
): CollectTopicCandidatesResult {
  const state = input.state ?? createTopicResearchRuntimeState();
  const policy = {
    ...DEFAULT_TOPIC_RESEARCH_COLLECTION_POLICY,
    ...input.policy,
  };
  const candidates: TopicCandidateRecord[] = [];
  const rejectedSources: TopicSourceRejection[] = [];
  const usageEvents: TopicResearchUsageEvent[] = [];
  const seenUrls = new Set<string>();
  const collectedAtMs = Date.parse(input.collectedAt);
  let acceptedSourceCount = 0;

  for (const source of input.sources) {
    const normalizedUrl = normalizeTopicSourceUrl(source.url);
    const rejection = getTopicSourceRejection({
      acceptedSourceCount,
      collectedAtMs,
      normalizedUrl,
      policy,
      seenUrls,
      source,
      state,
    });

    if (rejection) {
      rejectedSources.push(rejection);
      seenUrls.add(normalizedUrl);
      continue;
    }

    seenUrls.add(normalizedUrl);
    acceptedSourceCount += 1;

    const candidate = toTopicCandidate(source, normalizedUrl, input.collectedAt);
    const usageEvent = toTopicResearchUsageEvent(source, input.collectedAt);

    candidates.push(candidate);
    usageEvents.push(usageEvent);
    state.usageEvents.push(usageEvent);
    state.sourceCache.set(normalizedUrl, {
      fetchedAt: input.collectedAt,
      normalizedUrl,
      sourceId: source.id,
    });
  }

  return {
    candidates,
    rejectedSources,
    usageEvents,
  };
}

export function buildResearchPack(
  input: BuildResearchPackInput,
): BuildResearchPackResult {
  const researchPackId = input.id ?? `research-pack-${input.topicCandidate.id}`;

  if (input.sources.length === 0) {
    throw new Error("research pack requires at least one source");
  }

  const postSources: ResearchPackPostSourceRecord[] = [];
  const sourceSnapshots: ResearchPackSourceSnapshotRecord[] = [];

  for (const source of input.sources) {
    const normalizedUrl = normalizeTopicSourceUrl(source.url);
    const excerpt = normalizeResearchSourceExcerpt(source);
    const snapshotHash = createResearchSourceSnapshotHash({
      ...source,
      excerpt,
      url: normalizedUrl,
    });

    postSources.push({
      fetchedAt: source.fetchedAt,
      id: source.id,
      postId: null,
      publisher: source.publisher,
      researchPackId,
      snapshotHash,
      sourceRole: source.sourceRole,
      summary: source.summary.trim(),
      title: source.title.trim(),
      url: normalizedUrl,
    });
    sourceSnapshots.push({
      claimMetadata: source.claimMetadata ?? [],
      excerpt,
      extractedTextPath: null,
      fetchedAt: source.fetchedAt,
      hash: snapshotHash,
      id: `snapshot-${source.id}`,
      sourceId: source.id,
      sourceRole: source.sourceRole,
    });
  }

  const officialOrOriginalSourceIds = postSources
    .filter((source) => canSourceRoleSupportClaims(source.sourceRole))
    .map((source) => source.id);
  const canSupportStrongClaims = officialOrOriginalSourceIds.length > 0;

  return {
    postSources,
    researchPack: {
      canSupportStrongClaims,
      claimSupportPolicy: canSupportStrongClaims
        ? "has_official_or_original_source"
        : "needs_official_or_original_source",
      createdAt: input.createdAt,
      id: researchPackId,
      isPublicContent: false,
      officialOrOriginalSourceIds,
      riskNotes: input.riskNotes ?? [],
      selectedAngle: input.selectedAngle.trim(),
      sourceIds: postSources.map((source) => source.id),
      summary: (input.summary ?? input.topicCandidate.summary).trim(),
      topicCandidateId: input.topicCandidate.id,
    },
    sourceSnapshots,
  };
}

export function buildApplyToMeContext(
  input: BuildApplyToMeContextInput,
): BuildApplyToMeContextResult {
  const contextById = new Map(
    input.personalContextItems.map((context) => [context.id, context]),
  );
  const directExperienceClaims = input.directExperienceClaims ?? [];
  const directExperienceContextIds = directExperienceClaims.flatMap((claim) =>
    claim.personalContextId ? [claim.personalContextId] : [],
  );
  const personalContextIds = uniqueTrimmedStrings([
    ...input.requestedContextIds,
    ...directExperienceContextIds,
  ]);
  const selectedContexts = personalContextIds.map((id) => contextById.get(id));
  const evidencePaths = uniqueTrimmedStrings([
    ...(input.evidencePaths ?? []),
    ...directExperienceClaims.flatMap((claim) =>
      claim.evidencePath ? [claim.evidencePath] : [],
    ),
  ]);
  const commandsOrChecks = uniqueTrimmedStrings(input.commandsOrChecks ?? []);
  const articleMode =
    input.requestedArticleMode ??
    inferApplyToMeArticleMode({
      commandsOrChecks,
      directExperienceClaims,
      evidencePaths,
      selectedContexts,
      topicCandidate: input.topicCandidate,
    });
  const hypothesis = (input.hypothesis ?? "").trim();
  const summary =
    input.summary?.trim() ||
    `Apply ${input.topicCandidate.title.trim()} to public H-Log context.`;

  if (hasUnsupportedDirectExperienceClaim(directExperienceClaims, contextById)) {
    return buildBlockedApplyToMeContextResult({
      articleMode,
      blockReason: "missing_direct_experience_context",
      blockedContextItemIds: [],
      commandsOrChecks,
      createdAt: input.createdAt,
      evidencePaths,
      hypothesis,
      id: input.id,
      personalContextIds,
      researchPack: input.researchPack,
      summary,
      topicCandidate: input.topicCandidate,
    });
  }

  const blockedContextItemIds = personalContextIds.filter((id) => {
    const context = contextById.get(id);

    return (
      !context ||
      !context.publicSafe ||
      context.allowedUsage === "forbidden"
    );
  });

  if (blockedContextItemIds.length > 0) {
    return buildBlockedApplyToMeContextResult({
      articleMode,
      blockReason: "unsafe_personal_context",
      blockedContextItemIds,
      commandsOrChecks,
      createdAt: input.createdAt,
      evidencePaths,
      hypothesis,
      id: input.id,
      personalContextIds,
      researchPack: input.researchPack,
      summary,
      topicCandidate: input.topicCandidate,
    });
  }

  if (
    articleMode === "experiment" &&
    evidencePaths.length === 0 &&
    commandsOrChecks.length === 0
  ) {
    return buildBlockedApplyToMeContextResult({
      articleMode,
      blockReason: "missing_experiment_evidence",
      blockedContextItemIds: [],
      commandsOrChecks,
      createdAt: input.createdAt,
      evidencePaths,
      hypothesis,
      id: input.id,
      personalContextIds,
      researchPack: input.researchPack,
      summary,
      topicCandidate: input.topicCandidate,
    });
  }

  const generationContexts = selectedContexts.map((context) => {
    if (!context || context.allowedUsage === "forbidden") {
      throw new Error("unsafe personal context reached generation input");
    }

    return {
      allowedUsage: context.allowedUsage,
      category: context.category,
      id: context.id,
      summary: context.summary,
      title: context.title,
      version: context.version,
    };
  });

  return {
    applyToMeResult: buildApplyToMeResultRecord({
      articleMode,
      blockReason: null,
      blockedContextItemIds: [],
      commandsOrChecks,
      createdAt: input.createdAt,
      evidencePaths,
      hypothesis,
      id: input.id,
      personalContextIds,
      researchPack: input.researchPack,
      status: "ready_for_generation",
      summary,
      topicCandidate: input.topicCandidate,
    }),
    generationInput: {
      articleMode,
      commandsOrChecks,
      evidencePaths,
      personalContextIds,
      personalContextSummaries: generationContexts,
      researchPackId: input.researchPack.id,
      selectedAngle: input.researchPack.selectedAngle,
      summary,
      topicCandidateId: input.topicCandidate.id,
    },
  };
}

export function verifyArticleClaims(
  input: VerifyArticleClaimsInput,
): VerifyArticleClaimsResult {
  const sourceById = new Map(input.postSources.map((source) => [source.id, source]));
  const articleClaims: ArticleClaimRecord[] = [];
  const qualityGateResults: QualityGateResultRecord[] = [];

  for (const claim of input.claims) {
    const claimText = claim.claimText.trim();
    const claimCategory =
      claim.claimType === "opinion" ? "opinion" : "factual";
    const sourceId = normalizeOptionalString(claim.sourceId);
    const evidencePath = normalizeOptionalString(claim.evidencePath);
    const normalizedQuote = normalizeArticleClaimEvidenceQuote(claim);
    const source = sourceId ? sourceById.get(sourceId) : undefined;
    const failureMessage =
      claimCategory === "factual"
        ? getFactualArticleClaimFailureMessage({
            claim,
            claimText,
            evidencePath,
            evidenceQuoteError: normalizedQuote.error,
            source,
            sourceId,
          })
        : normalizedQuote.error;
    const verified = claimCategory === "factual" && failureMessage === null;

    articleClaims.push({
      claimCategory,
      claimText,
      claimType: claim.claimType,
      confidence: claim.confidence ?? null,
      createdAt: input.checkedAt,
      evidencePath,
      evidenceQuote: normalizedQuote.value,
      id: claim.id,
      postId: input.postId,
      postVersionId: input.postVersionId,
      sourceId,
      verified,
      verifierResult:
        claimCategory === "opinion"
          ? "not_applicable_opinion"
          : failureMessage ?? getVerifiedArticleClaimResult(source, evidencePath),
    });

    if (failureMessage) {
      qualityGateResults.push({
        createdAt: input.checkedAt,
        gateName: `claim_source_policy:${claim.id}`,
        id: `quality-gate:${input.postId}:${input.postVersionId}:${toIdSegment(
          claim.id,
        )}`,
        message: failureMessage,
        postId: input.postId,
        postVersionId: input.postVersionId,
        status: "failed",
      });
    }
  }

  return {
    articleClaims,
    qualityGateResults,
    status: qualityGateResults.length > 0 ? "failed" : "passed",
  };
}

function getFactualArticleClaimFailureMessage({
  claim,
  claimText,
  evidencePath,
  evidenceQuoteError,
  source,
  sourceId,
}: {
  claim: ArticleClaimInput;
  claimText: string;
  evidencePath: string | null;
  evidenceQuoteError: string | null;
  source: Pick<ResearchPackPostSourceRecord, "id" | "sourceRole"> | undefined;
  sourceId: string | null;
}): string | null {
  if (!claimText) {
    return `claim ${claim.id} text is required`;
  }

  if (evidenceQuoteError) {
    return evidenceQuoteError;
  }

  if (sourceId && !source) {
    return `claim ${claim.id} references unknown source ${sourceId}`;
  }

  if (claim.sourceAssessment === "contradicts") {
    return `claim ${claim.id} contradicts selected source`;
  }

  const sourceCanSupportClaim = source
    ? canSourceRoleSupportClaims(source.sourceRole)
    : false;

  if (claim.sourceAssessment === "neutral" && !evidencePath) {
    return `claim ${claim.id} is not supported by selected source`;
  }

  if (!sourceCanSupportClaim && !evidencePath) {
    return `claim ${claim.id} requires an official/original source or evidence path`;
  }

  return null;
}

function getVerifiedArticleClaimResult(
  source: Pick<ResearchPackPostSourceRecord, "id" | "sourceRole"> | undefined,
  evidencePath: string | null,
): string {
  if (source && canSourceRoleSupportClaims(source.sourceRole)) {
    return "verified_by_official_or_original_source";
  }

  if (evidencePath) {
    return "verified_by_evidence_path";
  }

  return "verified";
}

function inferApplyToMeArticleMode({
  commandsOrChecks,
  directExperienceClaims,
  evidencePaths,
  selectedContexts,
  topicCandidate,
}: {
  commandsOrChecks: readonly string[];
  directExperienceClaims: readonly ApplyToMeDirectExperienceClaimInput[];
  evidencePaths: readonly string[];
  selectedContexts: readonly (PersonalContextItemRecord | undefined)[];
  topicCandidate: TopicCandidateRecord;
}): BlogArticleMode {
  const hasEvidence = evidencePaths.length > 0 || commandsOrChecks.length > 0;

  if (directExperienceClaims.length > 0 && hasEvidence) {
    return "experiment";
  }

  if (
    topicCandidate.applyCategories.some(isProjectRecordCategory) ||
    selectedContexts.some((context) =>
      context ? isProjectRecordCategory(context.category) : false,
    )
  ) {
    return "project_record";
  }

  if (
    selectedContexts.some(
      (context) =>
        context?.allowedUsage === "applied_analysis" ||
        context?.allowedUsage === "direct_experience",
    )
  ) {
    return "applied_analysis";
  }

  return "document_analysis";
}

function isProjectRecordCategory(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("portfolio") ||
    normalized.includes("site") ||
    normalized.includes("h-log")
  );
}

function hasUnsupportedDirectExperienceClaim(
  directExperienceClaims: readonly ApplyToMeDirectExperienceClaimInput[],
  contextById: ReadonlyMap<string, PersonalContextItemRecord>,
): boolean {
  return directExperienceClaims.some((claim) => {
    if (!claim.text.trim()) {
      return false;
    }

    if (!claim.personalContextId) {
      return true;
    }

    const context = contextById.get(claim.personalContextId);

    return (
      !context ||
      !context.publicSafe ||
      context.allowedUsage !== "direct_experience"
    );
  });
}

function buildBlockedApplyToMeContextResult(input: {
  articleMode: BlogArticleMode;
  blockReason: ApplyToMeBlockReason;
  blockedContextItemIds: readonly string[];
  commandsOrChecks: readonly string[];
  createdAt: Timestamp;
  evidencePaths: readonly string[];
  hypothesis: string;
  id?: string;
  personalContextIds: readonly string[];
  researchPack: ResearchPackRecord;
  summary: string;
  topicCandidate: TopicCandidateRecord;
}): BuildApplyToMeContextResult {
  return {
    applyToMeResult: buildApplyToMeResultRecord({
      articleMode: input.articleMode,
      blockReason: input.blockReason,
      blockedContextItemIds: input.blockedContextItemIds,
      commandsOrChecks: input.commandsOrChecks,
      createdAt: input.createdAt,
      evidencePaths: input.evidencePaths,
      hypothesis: input.hypothesis,
      id: input.id,
      personalContextIds: input.personalContextIds,
      researchPack: input.researchPack,
      status: "failed_generation",
      summary: input.summary,
      topicCandidate: input.topicCandidate,
    }),
    generationInput: null,
  };
}

function buildApplyToMeResultRecord(input: {
  articleMode: BlogArticleMode;
  blockReason: ApplyToMeBlockReason | null;
  blockedContextItemIds: readonly string[];
  commandsOrChecks: readonly string[];
  createdAt: Timestamp;
  evidencePaths: readonly string[];
  hypothesis: string;
  id?: string;
  personalContextIds: readonly string[];
  researchPack: ResearchPackRecord;
  status: ApplyToMeResultStatus;
  summary: string;
  topicCandidate: TopicCandidateRecord;
}): ApplyToMeResultRecord {
  return {
    applyCategories: input.topicCandidate.applyCategories,
    applyTargets: input.topicCandidate.applyTargets,
    articleMode: input.articleMode,
    blockReason: input.blockReason,
    blockedContextItemIds: input.blockedContextItemIds,
    commandsOrChecks: input.commandsOrChecks,
    createdAt: input.createdAt,
    evidencePaths: input.evidencePaths,
    hypothesis: input.hypothesis,
    id: input.id ?? `apply-to-me-${input.topicCandidate.id}`,
    personalContextIds: input.personalContextIds,
    researchPackId: input.researchPack.id,
    status: input.status,
    summary: input.summary,
    topicCandidateId: input.topicCandidate.id,
  };
}

export function scoreTopicCandidate(
  signals: TopicCandidateSignals | undefined,
): number {
  if (!signals) {
    return 0;
  }

  return (
    scoreSignal(signals.expertiseRelevance, 30) +
    scoreSignal(signals.originalSourceAvailable, 25) +
    scoreSignal(signals.communityInterestSignal, 15) +
    scoreSignal(signals.directVerificationAvailable, 20) +
    scoreSignal(signals.operationalLesson, 20) +
    scoreSignal(signals.backendAutomationFit, 20) -
    scoreSignal(signals.commonSummaryRisk, 20) -
    scoreSignal(signals.weakSource, 30) -
    scoreSignal(signals.privacyRisk, 50)
  );
}

function getTopicSourceRejection({
  acceptedSourceCount,
  collectedAtMs,
  normalizedUrl,
  policy,
  seenUrls,
  source,
  state,
}: {
  acceptedSourceCount: number;
  collectedAtMs: number;
  normalizedUrl: string;
  policy: TopicResearchCollectionPolicy;
  seenUrls: ReadonlySet<string>;
  source: TopicSourceInput;
  state: TopicResearchRuntimeState;
}): TopicSourceRejection | null {
  if (seenUrls.has(normalizedUrl)) {
    return {
      normalizedUrl,
      reason: "duplicate_url",
      sourceId: source.id,
    };
  }

  const cached = state.sourceCache.get(normalizedUrl);

  if (cached && collectedAtMs - Date.parse(cached.fetchedAt) <= policy.sourceCacheTtlMs) {
    return {
      normalizedUrl,
      reason: "source_cache_hit",
      sourceId: source.id,
    };
  }

  if (acceptedSourceCount >= policy.dailySourceLimit) {
    return {
      normalizedUrl,
      reason: "daily_source_limit_reached",
      sourceId: source.id,
    };
  }

  return null;
}

function toTopicCandidate(
  source: TopicSourceInput,
  normalizedUrl: string,
  collectedAt: Timestamp,
): TopicCandidateRecord {
  const sourceRole = getTopicSourceRole(source.sourceType);
  const canSupportClaims = canSourceRoleSupportClaims(sourceRole);

  return {
    applyCategories: source.applyCategories ?? [],
    applyTargets: source.applyTargets ?? [],
    canSupportClaims,
    claimSourcePolicy: canSupportClaims
      ? "can_support_claims"
      : "needs_original_or_official_source",
    collectedAt,
    id: `topic-${source.id}`,
    publisher: source.publisher,
    relevanceReason:
      source.relevanceReason ?? "ranked by topic research source signals",
    rejectionReason: null,
    score: scoreTopicCandidate(source.signals),
    signals: source.signals,
    sourceId: source.id,
    sourceRole,
    sourceType: source.sourceType,
    status: "new",
    summary: source.summary,
    title: source.title,
    url: normalizedUrl,
  };
}

function toTopicResearchUsageEvent(
  source: TopicSourceInput,
  collectedAt: Timestamp,
): TopicResearchUsageEvent {
  return {
    createdAt: collectedAt,
    estimatedCost: source.estimatedCost ?? 0,
    eventType: "source_fetch",
    provider: source.publisher,
    sourceId: source.id,
    status: "success",
  };
}

function getTopicSourceRole(
  sourceType: TopicResearchSourceType,
): PostSourceRole {
  if (sourceType === "official_release_note" || sourceType === "security_ops_feed") {
    return "official";
  }

  if (sourceType === "company_tech_blog" || sourceType === "github") {
    return "original";
  }

  if (sourceType === "geeknews") {
    return "discovery";
  }

  if (sourceType === "hacker_news" || sourceType === "reddit") {
    return "reaction";
  }

  return "reference";
}

function canSourceRoleSupportClaims(sourceRole: PostSourceRole): boolean {
  return sourceRole === "official" || sourceRole === "original";
}

const MAX_RESEARCH_SOURCE_EXCERPT_CHARS = 480;

function normalizeResearchSourceExcerpt(
  source: ResearchPackSourceInput,
): string {
  const excerpt = source.excerpt.trim();

  if (!excerpt) {
    throw new Error(`source snapshot ${source.id}: excerpt is required`);
  }

  if (
    source.rawContent &&
    normalizeComparableText(excerpt) ===
      normalizeComparableText(source.rawContent)
  ) {
    throw new Error(
      `source snapshot ${source.id}: excerpt must not store full source text`,
    );
  }

  if (excerpt.length > MAX_RESEARCH_SOURCE_EXCERPT_CHARS) {
    throw new Error(
      `source snapshot ${source.id}: excerpt must be ${MAX_RESEARCH_SOURCE_EXCERPT_CHARS} characters or fewer`,
    );
  }

  return excerpt;
}

function createResearchSourceSnapshotHash(
  source: ResearchPackSourceInput,
): string {
  return createHash("sha256")
    .update("h-log/research-source-snapshot/v1")
    .update("\0url\0")
    .update(source.url)
    .update("\0raw\0")
    .update(source.rawContent ?? "")
    .update("\0excerpt\0")
    .update(source.excerpt)
    .update("\0summary\0")
    .update(source.summary)
    .digest("hex");
}

function normalizeComparableText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const MAX_ARTICLE_CLAIM_EVIDENCE_QUOTE_CHARS = 240;

function normalizeArticleClaimEvidenceQuote(claim: ArticleClaimInput): {
  error: string | null;
  value: string | null;
} {
  const quote = normalizeOptionalString(claim.evidenceQuote);

  if (!quote) {
    return {
      error: null,
      value: null,
    };
  }

  if (quote.length > MAX_ARTICLE_CLAIM_EVIDENCE_QUOTE_CHARS) {
    return {
      error: `claim ${claim.id} evidence quote must be ${MAX_ARTICLE_CLAIM_EVIDENCE_QUOTE_CHARS} characters or fewer`,
      value: null,
    };
  }

  return {
    error: null,
    value: quote,
  };
}

function normalizeOptionalString(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function uniqueTrimmedStrings(values: readonly string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const trimmed = value.trim();

    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function scoreSignal(value: boolean | undefined, points: number): number {
  return value ? points : 0;
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

function normalizeTopicSourceUrl(sourceUrl: string): string {
  const parsed = new URL(sourceUrl);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`unsupported topic source URL protocol: ${parsed.protocol}`);
  }

  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = "";

  for (const key of [...parsed.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) {
      parsed.searchParams.delete(key);
    }
  }

  parsed.searchParams.sort();
  parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";

  return parsed.toString().replace(/\/$/, "");
}
