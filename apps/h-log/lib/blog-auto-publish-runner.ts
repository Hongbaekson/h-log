import {
  postSourceRoles,
  type Timestamp,
} from "./blog-content-model.ts";
import {
  createDailyAutoArticlePipelineState,
  runDailyAutoArticlePipeline,
  type DailyAutoArticlePipelineInput,
  type DailyAutoArticlePipelineResult,
} from "./blog-daily-auto-article.ts";
import {
  personalContextAllowedUsages,
  topicResearchSourceTypes,
  type PersonalContextItemRecord,
  type ResearchPackSourceInput,
  type TopicSourceInput,
} from "./blog-topic-research.ts";

export type DailyAutoPublishInputFile = {
  personalContextItems: readonly PersonalContextItemRecord[];
  requestedContextIds?: readonly string[];
  researchPackSources: readonly ResearchPackSourceInput[];
  topicSources: readonly TopicSourceInput[];
};

type DailyAutoPublishOnceInput = Omit<
  DailyAutoArticlePipelineInput,
  | "dayKey"
  | "persistPublishingArticle"
  | "runId"
  | "runRequiredPublishJob"
  | "state"
> & {
  acquireDailyRunLock(
    lockKey: string,
  ): Promise<(() => Promise<void>) | null>;
  hasPersistedPost(postId: string): Promise<boolean>;
  persistPublishingArticle: NonNullable<
    DailyAutoArticlePipelineInput["persistPublishingArticle"]
  >;
};

export async function runDailyAutoPublishOnce(
  input: DailyAutoPublishOnceInput,
): Promise<DailyAutoArticlePipelineResult> {
  const dayKey = toSeoulDayKey(input.runAt);
  const state = createDailyAutoArticlePipelineState();
  const releaseLock = await input.acquireDailyRunLock(
    `daily-auto-publish:${dayKey}`,
  );

  if (!releaseLock) {
    return duplicateResult(state);
  }

  try {
    const postId = createDailyAutoPublishPostId(input.runAt);

    if (await input.hasPersistedPost(postId)) {
      return duplicateResult(state);
    }

    return await runDailyAutoArticlePipeline({
      ...input,
      dayKey,
      policy: {
        ...input.policy,
        dailyPublishLimit: 1,
        retryLimit: 1,
      },
      runId: `daily-run-${dayKey}`,
      runRequiredPublishJob: async () => {
        throw new Error(
          "one-shot generation must stop before required publish jobs",
        );
      },
      state,
    });
  } finally {
    await releaseLock();
  }
}

export function createDailyAutoPublishPostId(runAt: Timestamp): string {
  return `post-${toSeoulDayKey(runAt)}`;
}

export function parseDailyAutoPublishInput(
  value: unknown,
): DailyAutoPublishInputFile {
  const input = readRecord(value, "input");
  const personalContextItems = readRecordArray(
    input.personalContextItems,
    "personalContextItems",
  );
  const researchPackSources = readRecordArray(
    input.researchPackSources,
    "researchPackSources",
  );
  const topicSources = readRecordArray(input.topicSources, "topicSources");
  const requestedContextIds = readOptionalStringArray(
    input.requestedContextIds,
    "requestedContextIds",
  );

  personalContextItems.forEach(assertPersonalContextItem);
  researchPackSources.forEach(assertResearchPackSource);
  topicSources.forEach(assertTopicSource);

  return {
    personalContextItems: personalContextItems as PersonalContextItemRecord[],
    ...(requestedContextIds ? { requestedContextIds } : {}),
    researchPackSources: researchPackSources as ResearchPackSourceInput[],
    topicSources: topicSources as TopicSourceInput[],
  };
}

function duplicateResult(
  state: ReturnType<typeof createDailyAutoArticlePipelineState>,
): DailyAutoArticlePipelineResult {
  return {
    post: null,
    status: "duplicate_daily_publish",
    store: state.store,
    version: null,
  };
}

function toSeoulDayKey(timestamp: Timestamp): string {
  const instant = new Date(timestamp);

  if (Number.isNaN(instant.getTime())) {
    throw new Error("runAt must be a valid timestamp");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function assertTopicSource(source: Record<string, unknown>, index: number): void {
  const path = `topicSources[${index}]`;
  readStringFields(source, path, ["id", "publisher", "summary", "title", "url"]);
  readEnum(source.sourceType, `${path}.sourceType`, topicResearchSourceTypes);
  readBooleanRecord(source.signals, `${path}.signals`);
  readOptionalString(source.relevanceReason, `${path}.relevanceReason`);
  readOptionalNumber(source.estimatedCost, `${path}.estimatedCost`);
  readOptionalStringArray(source.applyCategories, `${path}.applyCategories`);
  readOptionalStringArray(source.applyTargets, `${path}.applyTargets`);
}

function assertResearchPackSource(
  source: Record<string, unknown>,
  index: number,
): void {
  const path = `researchPackSources[${index}]`;
  readStringFields(source, path, [
    "excerpt",
    "id",
    "publisher",
    "summary",
    "title",
    "url",
  ]);
  readTimestamp(source.fetchedAt, `${path}.fetchedAt`);
  readEnum(source.sourceRole, `${path}.sourceRole`, postSourceRoles);
  readOptionalString(source.rawContent, `${path}.rawContent`);

  if (source.claimMetadata !== undefined) {
    readRecordArray(source.claimMetadata, `${path}.claimMetadata`).forEach(
      (claim, claimIndex) =>
        readStringFields(claim, `${path}.claimMetadata[${claimIndex}]`, [
          "claimId",
          "claimText",
          "sourceId",
        ]),
    );
  }
}

function assertPersonalContextItem(
  item: Record<string, unknown>,
  index: number,
): void {
  const path = `personalContextItems[${index}]`;
  readStringFields(item, path, ["category", "id", "summary", "title"]);
  readTimestamp(item.createdAt, `${path}.createdAt`);
  readTimestamp(item.updatedAt, `${path}.updatedAt`);
  readEnum(
    item.allowedUsage,
    `${path}.allowedUsage`,
    personalContextAllowedUsages,
  );
  readBoolean(item.publicSafe, `${path}.publicSafe`);
  readPositiveInteger(item.version, `${path}.version`);
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }

  return value as Record<string, unknown>;
}

function readArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }

  return value;
}

function readRecordArray(
  value: unknown,
  path: string,
): Record<string, unknown>[] {
  return readArray(value, path).map((item, index) =>
    readRecord(item, `${path}[${index}]`),
  );
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${path} must be a non-empty string`);
  }

  return value;
}

function readOptionalString(
  value: unknown,
  path: string,
): string | undefined {
  return value === undefined ? undefined : readString(value, path);
}

function readStringArray(value: unknown, path: string): string[] {
  return readArray(value, path).map((item, index) =>
    readString(item, `${path}[${index}]`),
  );
}

function readOptionalStringArray(
  value: unknown,
  path: string,
): string[] | undefined {
  return value === undefined ? undefined : readStringArray(value, path);
}

function readBooleanRecord(value: unknown, path: string): void {
  const record = readRecord(value, path);

  for (const [key, item] of Object.entries(record)) {
    readBoolean(item, `${path}.${key}`);
  }
}

function readStringFields(
  record: Record<string, unknown>,
  path: string,
  fields: readonly string[],
): void {
  for (const field of fields) {
    readString(record[field], `${path}.${field}`);
  }
}

function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${path} must be a boolean`);
  }

  return value;
}

function readOptionalNumber(
  value: unknown,
  path: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${path} must be a non-negative number`);
  }

  return value;
}

function readPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${path} must be a positive integer`);
  }

  return value;
}

function readTimestamp(value: unknown, path: string): Timestamp {
  const timestamp = readString(value, path);

  if (Number.isNaN(Date.parse(timestamp))) {
    throw new Error(`${path} must be a valid timestamp`);
  }

  return timestamp;
}

function readEnum<T extends string>(
  value: unknown,
  path: string,
  allowedValues: readonly T[],
): T {
  if (
    typeof value !== "string" ||
    !allowedValues.includes(value as T)
  ) {
    throw new Error(`${path} must be one of ${allowedValues.join(", ")}`);
  }

  return value as T;
}
