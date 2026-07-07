import { createHash } from "node:crypto";

import {
  articleClaimTypes,
  blogArticleModes,
  createPostVersionContentFromMarkdown,
  type ArticleClaimType,
  type BlogArticleMode,
  type BlogPostStatus,
  type CanonicalPostVersionContent,
  type PostGenerationRunGateResult,
  type PostGenerationRunRecord,
  type QualityGateResultRecord,
  type Timestamp,
} from "./blog-content-model.ts";
import { tryNormalizePublicSourceUrl } from "./public-source-url.ts";

export const articleWriterPublishDecisions = ["publish", "block"] as const;

export type ArticleWriterPublishDecision =
  (typeof articleWriterPublishDecisions)[number];

export type ArticleWriterClaim = {
  confidence?: number;
  evidencePath?: string;
  evidenceQuote?: string;
  id: string;
  sourceId?: string;
  sourceUrl?: string;
  text: string;
  type: ArticleClaimType;
};

export type ArticleWriterOutput = {
  articleMode: BlogArticleMode;
  blockReason: string | null;
  claims: readonly ArticleWriterClaim[];
  contentMarkdown: string;
  description: string;
  evidencePaths: readonly string[];
  personalContextIds: readonly string[];
  publishDecision: ArticleWriterPublishDecision;
  slug: string;
  sources: readonly string[];
  tags: readonly string[];
  title: string;
};

export type NormalizedArticleWriterClaim = Omit<
  ArticleWriterClaim,
  "evidencePath" | "evidenceQuote" | "sourceId" | "sourceUrl" | "text"
> & {
  evidencePath: string | null;
  evidenceQuote: string | null;
  sourceId: string | null;
  sourceUrl: string | null;
  text: string;
};

export type NormalizedArticleWriterOutput = Omit<
  ArticleWriterOutput,
  "blockReason" | "claims" | "sources"
> & {
  blockReason: string | null;
  claims: readonly NormalizedArticleWriterClaim[];
  sources: readonly string[];
};

export type ValidateArticleWriterOutputInput = {
  generatedAt: Timestamp;
  output: ArticleWriterOutput;
  postId: string;
  postVersionId: string;
};

export type ValidateArticleWriterOutputResult = {
  canExposePublicly: false;
  nextPostStatus: Extract<BlogPostStatus, "failed_generation" | "ready_to_publish">;
  normalizedOutput: NormalizedArticleWriterOutput | null;
  postVersionContent: CanonicalPostVersionContent | null;
  qualityGateResults: QualityGateResultRecord[];
  status: "blocked" | "failed" | "passed";
};

export type CreateArticleGenerationRunRecordInput = {
  applyToMeResultId: string;
  createdAt: Timestamp;
  gateResult: PostGenerationRunGateResult;
  inputSourceIds: readonly string[];
  model: string;
  output: NormalizedArticleWriterOutput;
  personaVersion: string;
  postId: string;
  postVersionId: string;
  promptHash: string;
};

export function validateArticleWriterOutput(
  input: ValidateArticleWriterOutputInput,
): ValidateArticleWriterOutputResult {
  const normalized = normalizeArticleWriterOutput(input.output);
  const qualityGateResults = buildArticleOutputSchemaFailures(input, normalized);

  if (qualityGateResults.length > 0) {
    return {
      canExposePublicly: false,
      nextPostStatus: "failed_generation",
      normalizedOutput: null,
      postVersionContent: null,
      qualityGateResults,
      status: "failed",
    };
  }

  if (normalized.publishDecision === "block") {
    return {
      canExposePublicly: false,
      nextPostStatus: "failed_generation",
      normalizedOutput: normalized,
      postVersionContent: null,
      qualityGateResults,
      status: "blocked",
    };
  }

  return {
    canExposePublicly: false,
    nextPostStatus: "ready_to_publish",
    normalizedOutput: normalized,
    postVersionContent: createPostVersionContentFromMarkdown(
      normalized.contentMarkdown,
    ),
    qualityGateResults,
    status: "passed",
  };
}

export function createArticleGenerationRunRecord(
  input: CreateArticleGenerationRunRecordInput,
): PostGenerationRunRecord {
  const personaVersion = normalizeRequiredString(
    input.personaVersion,
    "persona_version",
  );

  return {
    applyToMeResultId: normalizeRequiredString(
      input.applyToMeResultId,
      "apply_to_me_result_id",
    ),
    articleMode: input.output.articleMode,
    createdAt: input.createdAt,
    gateResult: input.gateResult,
    id: `generation-run:${input.postId}:${input.postVersionId}`,
    inputSourceIds: uniqueTrimmedStrings(input.inputSourceIds),
    model: normalizeRequiredString(input.model, "model"),
    outputHash: createArticleWriterOutputHash(input.output),
    personalContextIds: uniqueTrimmedStrings(input.output.personalContextIds),
    personaVersion,
    postId: input.postId,
    postVersionId: input.postVersionId,
    promptHash: normalizeRequiredString(input.promptHash, "prompt_hash"),
  };
}

function normalizeArticleWriterOutput(
  output: ArticleWriterOutput,
): NormalizedArticleWriterOutput {
  const sources = uniqueTrimmedStrings(
    output.sources.flatMap((source) => {
      const normalized = tryNormalizePublicSourceUrl(source);

      return normalized ? [normalized] : [];
    }),
  );

  return {
    ...output,
    blockReason: normalizeOptionalString(output.blockReason ?? undefined),
    claims: output.claims.map(normalizeArticleWriterClaim),
    contentMarkdown: output.contentMarkdown.trim(),
    description: output.description.trim(),
    evidencePaths: uniqueTrimmedStrings(output.evidencePaths),
    personalContextIds: uniqueTrimmedStrings(output.personalContextIds),
    slug: output.slug.trim(),
    sources,
    tags: uniqueTrimmedStrings(output.tags),
    title: output.title.trim(),
  };
}

function normalizeArticleWriterClaim(
  claim: ArticleWriterClaim,
): NormalizedArticleWriterClaim {
  return {
    ...claim,
    evidencePath: normalizeOptionalString(claim.evidencePath),
    evidenceQuote: normalizeOptionalString(claim.evidenceQuote),
    id: claim.id.trim(),
    sourceId: normalizeOptionalString(claim.sourceId),
    sourceUrl: claim.sourceUrl
      ? tryNormalizePublicSourceUrl(claim.sourceUrl) ?? null
      : null,
    text: claim.text.trim(),
  };
}

function buildArticleOutputSchemaFailures(
  input: ValidateArticleWriterOutputInput,
  output: NormalizedArticleWriterOutput,
): QualityGateResultRecord[] {
  const failures: QualityGateResultRecord[] = [];
  const sourceSet = new Set(output.sources);

  if (!output.title) {
    failures.push(
      createSchemaFailure(input, "title", "article title is required"),
    );
  }

  if (!output.description) {
    failures.push(
      createSchemaFailure(input, "description", "article description is required"),
    );
  }

  if (!output.contentMarkdown) {
    failures.push(
      createSchemaFailure(
        input,
        "content_markdown",
        "article content_markdown is required",
      ),
    );
  }

  if (!isValidGeneratedPostSlug(output.slug)) {
    failures.push(
      createSchemaFailure(input, "slug", `invalid article slug: ${output.slug}`),
    );
  }

  if (!blogArticleModes.includes(output.articleMode)) {
    failures.push(
      createSchemaFailure(
        input,
        "article_mode",
        `invalid article mode: ${output.articleMode}`,
      ),
    );
  }

  if (output.articleMode === "experiment" && output.evidencePaths.length === 0) {
    failures.push(
      createSchemaFailure(
        input,
        "experiment_evidence",
        "experiment article mode requires command, code, config, API, log, or cost evidence",
      ),
    );
  }

  if (output.publishDecision === "block" && !output.blockReason) {
    failures.push(
      createSchemaFailure(
        input,
        "block_reason",
        "blocked article output requires block_reason",
      ),
    );
  }

  output.claims.forEach((claim) => {
    if (!claim.id) {
      failures.push(
        createSchemaFailure(input, "claim_id", "article claim id is required"),
      );
      return;
    }

    if (!claim.text) {
      failures.push(
        createSchemaFailure(
          input,
          `claim_text:${claim.id}`,
          `claim ${claim.id} text is required`,
        ),
      );
    }

    if (!articleClaimTypes.includes(claim.type)) {
      failures.push(
        createSchemaFailure(
          input,
          `claim_type:${claim.id}`,
          `claim ${claim.id} type is invalid`,
        ),
      );
    }

    if (claim.sourceUrl && !sourceSet.has(claim.sourceUrl)) {
      failures.push(
        createSchemaFailure(
          input,
          `claim_source:${claim.id}`,
          `claim ${claim.id} source_url must be listed in sources`,
        ),
      );
    }

    if (
      claim.type !== "opinion" &&
      !claim.sourceUrl &&
      !claim.sourceId &&
      !claim.evidencePath
    ) {
      failures.push(
        createSchemaFailure(
          input,
          `claim_source:${claim.id}`,
          `claim ${claim.id} requires source_url, source_id, or evidence_path`,
        ),
      );
    }
  });

  return failures;
}

function createSchemaFailure(
  input: ValidateArticleWriterOutputInput,
  field: string,
  message: string,
): QualityGateResultRecord {
  return {
    createdAt: input.generatedAt,
    gateName: `article_output_schema:${field}`,
    id: `quality-gate:${input.postId}:${input.postVersionId}:${toIdSegment(
      field,
    )}`,
    message,
    postId: input.postId,
    postVersionId: input.postVersionId,
    status: "failed",
  };
}

function isValidGeneratedPostSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function normalizeOptionalString(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function normalizeRequiredString(value: string, field: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${field} is required`);
  }

  return trimmed;
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

function toIdSegment(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}

function createArticleWriterOutputHash(
  output: NormalizedArticleWriterOutput,
): string {
  return createHash("sha256")
    .update("h-log/article-writer-output/v1")
    .update(JSON.stringify(output))
    .digest("hex");
}
