import type { Timestamp } from "./blog-content-model.ts";

export const contentPerformanceSignalTypes = [
  "post_view",
  "search_referral",
  "share",
  "engaged_seconds",
  "search_result_click",
] as const;

export type ContentPerformanceSignalType =
  (typeof contentPerformanceSignalTypes)[number];

export type ContentPerformanceAggregateRecord = {
  id: string;
  postId: string;
  signalType: ContentPerformanceSignalType;
  value: number;
  windowEnd: Timestamp;
  windowStart: Timestamp;
};

export type PersonaLearningCandidate = {
  learningFields: readonly ["title", "structure", "angle"];
  postId: string;
  qualifyingSignals: ContentPerformanceSignalType[];
  windowEnd: Timestamp;
  windowStart: Timestamp;
};

export type PersonaLearningSignalPolicy = {
  minimumValues: Partial<Record<ContentPerformanceSignalType, number>>;
};

const aggregateFields = new Set([
  "id",
  "postId",
  "signalType",
  "value",
  "windowEnd",
  "windowStart",
]);
const visitorLevelFields = [
  "visitorId",
  "sessionId",
  "cookieId",
  "ip",
  "userAgent",
  "referrer",
] as const;

export function createContentPerformanceAggregate(
  input: unknown,
): ContentPerformanceAggregateRecord {
  if (!isRecord(input)) {
    throw new Error("content performance aggregate must be an object");
  }

  for (const field of visitorLevelFields) {
    if (Object.hasOwn(input, field)) {
      throw new Error(
        `content performance aggregate must not include visitor-level field ${field}`,
      );
    }
  }

  const unsupportedField = Object.keys(input).find(
    (field) => !aggregateFields.has(field),
  );

  if (unsupportedField) {
    throw new Error(
      `content performance aggregate contains unsupported field ${unsupportedField}`,
    );
  }

  const signalType = readSignalType(input.signalType);
  const windowStart = readTimestamp(input.windowStart, "windowStart");
  const windowEnd = readTimestamp(input.windowEnd, "windowEnd");

  if (Date.parse(windowEnd) <= Date.parse(windowStart)) {
    throw new Error("windowEnd must be after windowStart");
  }

  if (!Number.isSafeInteger(input.value) || Number(input.value) <= 0) {
    throw new Error("value must be a positive safe integer");
  }

  return {
    id: readNonEmptyString(input.id, "id"),
    postId: readNonEmptyString(input.postId, "postId"),
    signalType,
    value: Number(input.value),
    windowEnd,
    windowStart,
  };
}

export function selectPersonaLearningCandidates(
  signals: readonly ContentPerformanceAggregateRecord[],
  policy: PersonaLearningSignalPolicy,
): PersonaLearningCandidate[] {
  const minimums = contentPerformanceSignalTypes.flatMap((signalType) => {
    const minimumValue = policy.minimumValues[signalType];

    if (minimumValue === undefined) {
      return [];
    }

    if (!Number.isSafeInteger(minimumValue) || minimumValue <= 0) {
      throw new Error(
        `minimumValues.${signalType} must be a positive safe integer`,
      );
    }

    return [{ minimumValue, signalType }];
  });

  if (minimums.length === 0) {
    throw new Error("at least one aggregate signal minimum is required");
  }

  const grouped = new Map<
    string,
    {
      postId: string;
      totals: Map<ContentPerformanceSignalType, number>;
      windowEnd: Timestamp;
      windowStart: Timestamp;
    }
  >();

  for (const signal of signals) {
    const key = `${signal.postId}\u0000${signal.windowStart}\u0000${signal.windowEnd}`;
    const group = grouped.get(key) ?? {
      postId: signal.postId,
      totals: new Map<ContentPerformanceSignalType, number>(),
      windowEnd: signal.windowEnd,
      windowStart: signal.windowStart,
    };
    group.totals.set(
      signal.signalType,
      (group.totals.get(signal.signalType) ?? 0) + signal.value,
    );
    grouped.set(key, group);
  }

  return [...grouped.values()]
    .filter((group) =>
      minimums.every(
        ({ minimumValue, signalType }) =>
          (group.totals.get(signalType) ?? 0) >= minimumValue,
      ),
    )
    .map((group) => ({
      learningFields: ["title", "structure", "angle"],
      postId: group.postId,
      qualifyingSignals: minimums.map(({ signalType }) => signalType),
      windowEnd: group.windowEnd,
      windowStart: group.windowStart,
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }

  return value;
}

function readSignalType(value: unknown): ContentPerformanceSignalType {
  if (
    typeof value !== "string" ||
    !contentPerformanceSignalTypes.includes(
      value as ContentPerformanceSignalType,
    )
  ) {
    throw new Error("signalType must be a supported aggregate signal type");
  }

  return value as ContentPerformanceSignalType;
}

function readTimestamp(value: unknown, field: string): Timestamp {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${field} must be an ISO timestamp`);
  }

  return value;
}
