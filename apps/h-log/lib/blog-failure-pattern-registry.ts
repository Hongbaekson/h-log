import type {
  BlogPrivacyFindingType,
  BlogPrivacyScanPolicy,
} from "./blog-privacy-scanner.ts";
import { scanBlogPrivacyText } from "./blog-privacy-scanner.ts";
import type { Timestamp } from "./blog-content-model.ts";

export const generationFailurePatternTypes = [
  "weak_sources",
  "unsafe_claim",
  "privacy_risk",
  "no_evidence",
  "style_drift",
] as const;

export type GenerationFailurePatternType =
  (typeof generationFailurePatternTypes)[number];

export type GenerationFailurePatternDisposition =
  | "lower_candidate_priority"
  | "abandon_daily_publish";

export type GenerationFailurePatternRecord = {
  candidateId: string;
  dayKey: string;
  disposition: GenerationFailurePatternDisposition;
  failureType: GenerationFailurePatternType;
  firstSeenAt: Timestamp;
  id: string;
  lastSeenAt: Timestamp;
  occurrenceCount: number;
  privacyFindingTypes: BlogPrivacyFindingType[];
  summary: string;
};

export type GenerationFailureGuidance = {
  abandonDailyPublish: boolean;
  blockedCandidateIds: string[];
  promptRules: string[];
  qualityGateFailureReasons: GenerationFailurePatternType[];
};

type RegisterGenerationFailurePatternInput = {
  candidateId: string;
  dayKey: string;
  failureType: GenerationFailurePatternType;
  occurredAt: Timestamp;
  privacyScanPolicy?: BlogPrivacyScanPolicy;
  summary: string;
};

const failedModelOutputFields = [
  "contentHtml",
  "contentMarkdown",
  "fullText",
  "llmOutput",
  "modelOutput",
  "rawOutput",
  "rawText",
  "responseText",
] as const;

export function registerGenerationFailurePattern(
  records: readonly GenerationFailurePatternRecord[],
  input: RegisterGenerationFailurePatternInput & Record<string, unknown>,
): {
  allowRetry: boolean;
  pattern: GenerationFailurePatternRecord;
  records: GenerationFailurePatternRecord[];
} {
  assertNoFailedModelOutput(input);
  assertFailurePatternType(input.failureType);

  const candidateId = readRequiredString(input.candidateId, "candidateId");
  const dayKey = readDayKey(input.dayKey);
  const existing = records.find(
    (record) =>
      record.candidateId === candidateId &&
      record.dayKey === dayKey &&
      record.failureType === input.failureType,
  );

  if (existing?.disposition === "abandon_daily_publish") {
    throw new Error(
      `failure pattern ${input.failureType} is already blocked for ${dayKey}`,
    );
  }

  const privacyScan = scanBlogPrivacyText(
    readRequiredString(input.summary, "summary"),
    input.privacyScanPolicy,
  );
  const occurrenceCount = (existing?.occurrenceCount ?? 0) + 1;
  const disposition =
    occurrenceCount >= 2
      ? "abandon_daily_publish"
      : "lower_candidate_priority";
  const pattern: GenerationFailurePatternRecord = {
    candidateId,
    dayKey,
    disposition,
    failureType: input.failureType,
    firstSeenAt: existing?.firstSeenAt ?? input.occurredAt,
    id:
      existing?.id ??
      `generation-failure:${dayKey}:${candidateId}:${input.failureType}`,
    lastSeenAt: input.occurredAt,
    occurrenceCount,
    privacyFindingTypes: privacyScan.findingTypes,
    summary: readSummary(privacyScan.redactedText),
  };

  return {
    allowRetry: disposition === "lower_candidate_priority",
    pattern,
    records: existing
      ? records.map((record) => (record.id === existing.id ? pattern : record))
      : [...records, pattern],
  };
}

export function buildGenerationFailureGuidance(
  records: readonly GenerationFailurePatternRecord[],
  dayKey: string,
): GenerationFailureGuidance {
  const dailyRecords = records.filter(
    (record) => record.dayKey === readDayKey(dayKey),
  );
  const qualityGateFailureReasons = generationFailurePatternTypes.filter(
    (failureType) =>
      dailyRecords.some((record) => record.failureType === failureType),
  );

  return {
    abandonDailyPublish: dailyRecords.some(
      (record) => record.disposition === "abandon_daily_publish",
    ),
    blockedCandidateIds: [
      ...new Set(
        dailyRecords
          .filter(
            (record) => record.disposition === "abandon_daily_publish",
          )
          .map((record) => record.candidateId),
      ),
    ].sort(),
    promptRules: qualityGateFailureReasons.map((failureType) => {
      const pattern = dailyRecords.find(
        (record) => record.failureType === failureType,
      )!;

      return `${failureType}: ${pattern.summary}`;
    }),
    qualityGateFailureReasons,
  };
}

function assertNoFailedModelOutput(
  input: RegisterGenerationFailurePatternInput & Record<string, unknown>,
): void {
  for (const field of failedModelOutputFields) {
    if (Object.hasOwn(input, field)) {
      throw new Error(
        `failure pattern must not include failed model output field ${field}`,
      );
    }
  }
}

function assertFailurePatternType(
  value: string,
): asserts value is GenerationFailurePatternType {
  if (!(generationFailurePatternTypes as readonly string[]).includes(value)) {
    throw new Error(`unsupported generation failure pattern ${value}`);
  }
}

function readSummary(value: string): string {
  const summary = readRequiredString(value, "summary");

  if (summary.length > 160 || summary.includes("\n")) {
    throw new Error("summary must be a single-line summary up to 160 characters");
  }

  return summary;
}

function readDayKey(value: string): string {
  const dayKey = readRequiredString(value, "dayKey");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    throw new Error("dayKey must use YYYY-MM-DD");
  }

  return dayKey;
}

function readRequiredString(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} is required`);
  }

  return normalized;
}
