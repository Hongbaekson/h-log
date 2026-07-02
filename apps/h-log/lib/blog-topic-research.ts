import type { PostSourceRole, Timestamp } from "./blog-content-model.ts";

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

function scoreSignal(value: boolean | undefined, points: number): number {
  return value ? points : 0;
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
