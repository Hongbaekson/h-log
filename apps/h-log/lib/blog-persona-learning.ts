import { createHash } from "node:crypto";

import type {
  ContentPerformanceSignalType,
  PersonaLearningCandidate,
} from "./blog-performance-signals.ts";
import type { Timestamp } from "./blog-content-model.ts";

export const personaEvidenceDensities = ["low", "medium", "high"] as const;

export type PersonaEvidenceDensity =
  (typeof personaEvidenceDensities)[number];

export type PersonaExampleRecord = {
  closingPattern: string;
  createdAt: Timestamp;
  evidenceDensity: PersonaEvidenceDensity;
  id: string;
  performanceWindowEnd: Timestamp;
  performanceWindowStart: Timestamp;
  postId: string;
  qualifyingSignals: ContentPerformanceSignalType[];
  sectionStructure: string[];
  sourceContentHash: string;
  titlePattern: string;
};

export type PersonaVersionRecord = {
  active: boolean;
  basedOnExampleIds: string[];
  contentHash: string;
  createdAt: Timestamp;
  id: string;
  personaContent: string;
  previousVersionId: string | null;
  version: number;
};

export type PersonaVersionRollbackRecord = {
  createdAt: Timestamp;
  fromVersionId: string;
  id: string;
  reason: "performance_regression";
  toVersionId: string;
};

type CreatePersonaExampleInput = {
  candidate: PersonaLearningCandidate;
  closingPattern: string;
  createdAt: Timestamp;
  evidenceDensity: PersonaEvidenceDensity;
  id: string;
  sectionStructure: readonly string[];
  sourceContentHash: string;
  titlePattern: string;
};

type CreatePersonaVersionInput = {
  basedOnExampleIds: readonly string[];
  createdAt: Timestamp;
  id: string;
  personaContent: string;
  previousVersionId: string | null;
  version: number;
};

const publishedContentFields = [
  "body",
  "contentHtml",
  "contentMarkdown",
  "fullText",
  "publishedBody",
] as const;

export function createPersonaExampleRecord(
  input: CreatePersonaExampleInput & Record<string, unknown>,
): PersonaExampleRecord {
  for (const field of publishedContentFields) {
    if (Object.hasOwn(input, field)) {
      throw new Error(
        `persona example must not include published content field ${field}`,
      );
    }
  }

  if (input.candidate.learningFields.join(",") !== "title,structure,angle") {
    throw new Error("persona candidate contains unsupported learning fields");
  }

  if (input.sectionStructure.length === 0 || input.sectionStructure.length > 12) {
    throw new Error("sectionStructure must contain 1 to 12 summaries");
  }

  if (!/^[a-f0-9]{64}$/.test(input.sourceContentHash)) {
    throw new Error("sourceContentHash must be a SHA-256 hash");
  }

  return {
    closingPattern: readSummary(input.closingPattern, "closingPattern"),
    createdAt: input.createdAt,
    evidenceDensity: input.evidenceDensity,
    id: readRequiredString(input.id, "id"),
    performanceWindowEnd: input.candidate.windowEnd,
    performanceWindowStart: input.candidate.windowStart,
    postId: input.candidate.postId,
    qualifyingSignals: [...input.candidate.qualifyingSignals],
    sectionStructure: input.sectionStructure.map((summary) =>
      readSummary(summary, "sectionStructure"),
    ),
    sourceContentHash: input.sourceContentHash,
    titlePattern: readSummary(input.titlePattern, "titlePattern"),
  };
}

export function createPersonaVersionRecord(
  input: CreatePersonaVersionInput,
): PersonaVersionRecord {
  const personaContent = normalizePersonaContent(input.personaContent);

  if (!Number.isSafeInteger(input.version) || input.version <= 0) {
    throw new Error("version must be a positive safe integer");
  }

  return {
    active: false,
    basedOnExampleIds: uniqueRequiredStrings(input.basedOnExampleIds),
    contentHash: createPersonaContentHash(personaContent),
    createdAt: input.createdAt,
    id: readRequiredString(input.id, "id"),
    personaContent,
    previousVersionId: input.previousVersionId,
    version: input.version,
  };
}

export function activatePersonaVersion(
  versions: readonly PersonaVersionRecord[],
  versionId: string,
): PersonaVersionRecord[] {
  if (!versions.some((version) => version.id === versionId)) {
    throw new Error(`persona version ${versionId} was not found`);
  }

  return versions.map((version) => ({
    ...version,
    active: version.id === versionId,
  }));
}

export function rollbackActivePersonaVersion(input: {
  recordedAt: Timestamp;
  rollbackToVersionId: string;
  versions: readonly PersonaVersionRecord[];
}): {
  rollback: PersonaVersionRollbackRecord;
  versions: PersonaVersionRecord[];
} {
  const activeVersions = input.versions.filter((version) => version.active);

  if (activeVersions.length !== 1) {
    throw new Error("exactly one active persona version is required");
  }

  const activeVersion = activeVersions[0]!;

  if (activeVersion.previousVersionId !== input.rollbackToVersionId) {
    throw new Error("persona rollback must target the active version's predecessor");
  }

  return {
    rollback: {
      createdAt: input.recordedAt,
      fromVersionId: activeVersion.id,
      id: `persona-rollback:${activeVersion.id}:${input.rollbackToVersionId}`,
      reason: "performance_regression",
      toVersionId: input.rollbackToVersionId,
    },
    versions: activatePersonaVersion(
      input.versions,
      input.rollbackToVersionId,
    ),
  };
}

function createPersonaContentHash(content: string): string {
  return createHash("sha256")
    .update("h-log/persona-version/v1")
    .update(content)
    .digest("hex");
}

function normalizePersonaContent(value: string): string {
  const content = readRequiredString(value, "personaContent")
    .replace(/\r\n?/g, "\n")
    .trimEnd();

  return `${content}\n`;
}

function readSummary(value: string, field: string): string {
  const summary = readRequiredString(value, field);

  if (summary.length > 160 || summary.includes("\n")) {
    throw new Error(`${field} must be a single-line summary up to 160 characters`);
  }

  return summary;
}

function readRequiredString(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} is required`);
  }

  return normalized;
}

function uniqueRequiredStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => readRequiredString(value, "exampleId")))];
}
