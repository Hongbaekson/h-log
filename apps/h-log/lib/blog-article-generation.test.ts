import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateArticleWriterOutput,
  type ArticleWriterOutput,
} from "./blog-article-generation.ts";

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
});
