import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createArticleGenerationRunRecord,
  validateArticleWriterOutput,
  type ArticleWriterOutput,
} from "./blog-article-generation.ts";
import {
  createPostVersionContentFromMarkdown,
  selectPublicBlogRouteEntries,
  type PostRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";

const generatedAt = "2026-07-06T00:00:00.000Z";

function createWriterOutput(
  overrides: Partial<ArticleWriterOutput> = {},
): ArticleWriterOutput {
  return {
    articleMode: "document_analysis",
    blockReason: null,
    claims: [
      {
        confidence: 0.91,
        evidenceQuote: "Runtime 9 changes are documented in the release note.",
        id: "claim-runtime-api",
        sourceUrl: "https://example.com/releases/runtime-9",
        text: "Runtime 9 changes one API behavior.",
        type: "api",
      },
    ],
    contentMarkdown:
      "# Runtime 9 release note\n\nPublic-source based analysis for H-Log.\n",
    description: "Runtime release note impact on the H-Log worker boundary.",
    evidencePaths: [],
    personalContextIds: ["context-hlog-worker"],
    publishDecision: "publish",
    slug: "runtime-9-release-note",
    sources: ["https://example.com/releases/runtime-9"],
    tags: ["Node.js", "운영", "Node.js"],
    title: "Runtime 9 release note affects one H-Log worker boundary",
    ...overrides,
  };
}

describe("blog article generation output schema", () => {
  it("blocks missing required writer fields before creating a post version", () => {
    const result = validateArticleWriterOutput({
      generatedAt,
      output: createWriterOutput({
        contentMarkdown: "",
        description: "",
        title: "",
      }),
      postId: "post-generated",
      postVersionId: "version-generated",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.nextPostStatus, "failed_generation");
    assert.equal(result.normalizedOutput, null);
    assert.deepEqual(
      result.qualityGateResults.map((gate) => gate.gateName),
      [
        "article_output_schema:title",
        "article_output_schema:description",
        "article_output_schema:content_markdown",
      ],
    );
  });

  it("normalizes a valid publish decision into a private ready-to-publish draft", () => {
    const result = validateArticleWriterOutput({
      generatedAt,
      output: createWriterOutput(),
      postId: "post-generated",
      postVersionId: "version-generated",
    });

    assert.equal(result.status, "passed");
    assert.equal(result.nextPostStatus, "ready_to_publish");
    assert.equal(result.canExposePublicly, false);
    assert.equal(result.normalizedOutput?.slug, "runtime-9-release-note");
    assert.deepEqual(result.normalizedOutput?.tags, ["Node.js", "운영"]);
    assert.equal(result.postVersionContent?.contentMarkdown.endsWith("\n"), true);
    assert.match(result.postVersionContent?.contentHash ?? "", /^[a-f0-9]{64}$/);
  });

  it("blocks invalid slugs and factual claims without source or evidence", () => {
    const result = validateArticleWriterOutput({
      generatedAt,
      output: createWriterOutput({
        claims: [
          {
            id: "claim-unsourced",
            text: "Runtime 9 is the fastest production runtime.",
            type: "performance",
          },
        ],
        slug: "Runtime 9!",
        sources: [],
      }),
      postId: "post-generated",
      postVersionId: "version-generated",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.nextPostStatus, "failed_generation");
    assert.deepEqual(
      result.qualityGateResults.map((gate) => gate.gateName),
      [
        "article_output_schema:slug",
        "article_output_schema:claim_source:claim-unsourced",
      ],
    );
  });

  it("blocks experiment mode without experiment evidence", () => {
    const result = validateArticleWriterOutput({
      generatedAt,
      output: createWriterOutput({
        articleMode: "experiment",
        evidencePaths: [],
      }),
      postId: "post-generated",
      postVersionId: "version-generated",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.nextPostStatus, "failed_generation");
    assert.deepEqual(
      result.qualityGateResults.map((gate) => gate.gateName),
      ["article_output_schema:experiment_evidence"],
    );
  });

  it("classifies publish quality gate failures and keeps them private", () => {
    const result = validateArticleWriterOutput({
      existingPublishedSlugs: ["runtime-9-release-note"],
      generatedAt,
      output: createWriterOutput(),
      postId: "post-generated",
      postVersionId: "version-generated",
      qualityGateFailures: [
        {
          message: "claim contradicts selected official source",
          reason: "unsafe_claim",
          subjectId: "claim-runtime-api",
        },
        {
          message: "content includes an internal host reference",
          reason: "privacy_risk",
        },
        {
          message: "writer output has no command, code, source, or log evidence",
          reason: "no_evidence",
        },
        {
          message: "research pack only has discovery sources",
          reason: "weak_sources",
        },
        {
          message: "persona check detected summary-like prose",
          reason: "style_drift",
        },
      ],
    });

    assert.equal(result.status, "failed");
    assert.equal(result.nextPostStatus, "failed_generation");
    assert.equal(result.canExposePublicly, false);
    assert.equal(result.postVersionContent, null);
    assert.deepEqual(
      result.qualityGateResults.map((gate) => gate.gateName),
      [
        "article_quality_gate:duplicate_topic",
        "article_quality_gate:unsafe_claim",
        "article_quality_gate:privacy_risk",
        "article_quality_gate:no_evidence",
        "article_quality_gate:weak_sources",
        "article_quality_gate:style_drift",
      ],
    );

    const content = createPostVersionContentFromMarkdown("# Hidden\n\nBody.\n");
    const failedPost: PostRecord = {
      articleMode: "document_analysis",
      createdAt: generatedAt,
      currentVersionId: "version-generated",
      description: "failed generated article",
      id: "post-generated",
      publishedAt: null,
      retractedAt: null,
      slug: "runtime-9-release-note",
      status: result.nextPostStatus,
      title: "Runtime 9 release note",
      unpublishedAt: null,
      updatedAt: generatedAt,
    };
    const failedVersion: PostVersionRecord = {
      ...content,
      createdAt: generatedAt,
      createdBy: "system",
      description: failedPost.description,
      id: "version-generated",
      personaVersionId: "hlog-persona-v2",
      postId: "post-generated",
      researchPackId: "research-pack-runtime-9",
      title: failedPost.title,
      versionNo: 1,
    };

    assert.deepEqual(selectPublicBlogRouteEntries([failedPost], [failedVersion]), []);
  });

  it("creates a redacted privacy_risk failure from sensitive writer output", () => {
    const fakeToken = `sk-${"x".repeat(24)}`;
    const internalUrl = "http://authoring.internal/drafts/1";
    const result = validateArticleWriterOutput({
      generatedAt,
      output: createWriterOutput({
        contentMarkdown: `# Hidden draft\n\n${internalUrl}\n\n${fakeToken}\n`,
      }),
      postId: "post-generated",
      postVersionId: "version-generated",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.nextPostStatus, "failed_generation");
    assert.deepEqual(
      result.qualityGateResults.map((gate) => gate.gateName),
      ["article_quality_gate:privacy_risk"],
    );
    assert.match(result.qualityGateResults[0]?.message ?? "", /\[REDACTED\]/);
    assert.equal(JSON.stringify(result).includes(fakeToken), false);
    assert.equal(JSON.stringify(result).includes(internalUrl), false);
  });

  it("keeps writer block decisions private with an explicit block reason", () => {
    const result = validateArticleWriterOutput({
      generatedAt,
      output: createWriterOutput({
        blockReason: "weak_sources",
        publishDecision: "block",
      }),
      postId: "post-generated",
      postVersionId: "version-generated",
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.nextPostStatus, "failed_generation");
    assert.equal(result.canExposePublicly, false);
    assert.equal(result.normalizedOutput?.publishDecision, "block");
    assert.deepEqual(result.qualityGateResults, []);
  });

  it("records persona version and selected context in the generation run", () => {
    const result = validateArticleWriterOutput({
      generatedAt,
      output: createWriterOutput({
        articleMode: "applied_analysis",
        personalContextIds: ["context-hlog-worker", "context-hlog-worker"],
      }),
      postId: "post-generated",
      postVersionId: "version-generated",
    });

    assert.equal(result.status, "passed");
    assert.ok(result.normalizedOutput);

    const generationRun = createArticleGenerationRunRecord({
      applyToMeResultId: "apply-to-me-runtime-9",
      createdAt: generatedAt,
      gateResult: "passed",
      inputSourceIds: ["source-runtime-9", "source-runtime-9"],
      model: "test-writer",
      output: result.normalizedOutput,
      personaVersion: "hlog-persona-v2",
      postId: "post-generated",
      postVersionId: "version-generated",
      promptHash: "prompt-hash-runtime-9",
    });

    assert.equal(generationRun.personaVersion, "hlog-persona-v2");
    assert.equal(generationRun.articleMode, "applied_analysis");
    assert.deepEqual(generationRun.personalContextIds, ["context-hlog-worker"]);
    assert.deepEqual(generationRun.inputSourceIds, ["source-runtime-9"]);
    assert.match(generationRun.outputHash, /^[a-f0-9]{64}$/);
  });
});
