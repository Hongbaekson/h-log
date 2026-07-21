import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { GenerateArticleInput } from "./blog-daily-auto-article.ts";
import {
  createHermesArticleGenerator,
  type HermesOneShotInvocation,
} from "./blog-hermes-article-provider.ts";
import type { ArticleWriterOutput } from "./blog-article-generation.ts";

const writerOutput: ArticleWriterOutput = {
  articleMode: "applied_analysis",
  blockReason: null,
  claims: [
    {
      confidence: 0.95,
      id: "claim-runtime",
      sourceId: "source-runtime",
      sourceUrl: "https://example.com/runtime",
      text: "Runtime behavior changed.",
      type: "api",
    },
  ],
  contentMarkdown: "# Runtime change\n\nVerified analysis.\n",
  description: "A verified runtime change.",
  evidencePaths: ["evidence/runtime.md"],
  personalContextIds: ["context-hlog"],
  publishDecision: "publish",
  slug: "runtime-change",
  sources: ["https://example.com/runtime"],
  tags: ["Runtime"],
  title: "Runtime change",
};

const generationInput = {
  generationInput: { publicSafeContext: "H-Log worker" },
  postId: "post-2026-07-21",
  postVersionId: "version-2026-07-21",
  researchPack: { id: "research-pack-runtime" },
  topicCandidate: { id: "topic-runtime" },
} as unknown as GenerateArticleInput;

describe("Hermes article provider", () => {
  it("uses Codex OAuth and maps included usage into the shared LLM ledger shape", async () => {
    const invocations: HermesOneShotInvocation[] = [];
    const generateArticle = createHermesArticleGenerator({
      command: "hermes-test",
      runOneShot: async (input) => {
        invocations.push(input);

        return {
          response: JSON.stringify(writerOutput),
          usageReport: {
            api_calls: 1,
            completed: true,
            cost_status: "included",
            estimated_cost_usd: 0,
            failed: false,
            input_tokens: 123,
            model: "gpt-5.6-sol",
            output_tokens: 456,
            provider: "openai-codex",
          },
        };
      },
    });

    const result = await generateArticle(generationInput);
    const invocation = invocations[0];

    assert.ok(invocation);
    assert.equal(invocation.command, "hermes-test");
    assert.equal(invocation.provider, "openai-codex");
    assert.equal(invocation.model, "gpt-5.6-sol");
    assert.deepEqual(invocation.toolsets, ["web"]);
    assert.match(invocation.prompt, /Return exactly one JSON object/);
    assert.match(invocation.prompt, /Do not call tools/);
    assert.deepEqual(result.output, writerOutput);
    assert.deepEqual(result.usage, {
      estimatedCost: 0,
      inputTokens: 123,
      model: "gpt-5.6-sol",
      outputTokens: 456,
      provider: "openai-codex",
    });
  });

  it("fails closed when Hermes reports a separately billed run", async () => {
    const generateArticle = createHermesArticleGenerator({
      runOneShot: async () => ({
        response: JSON.stringify(writerOutput),
        usageReport: {
          api_calls: 1,
          completed: true,
          cost_status: "estimated",
          estimated_cost_usd: 0.01,
          failed: false,
          input_tokens: 123,
          model: "gpt-5.6-sol",
          output_tokens: 456,
          provider: "openai-codex",
        },
      }),
    });

    await assert.rejects(
      generateArticle(generationInput),
      /Hermes run is not included in the Codex subscription/,
    );
  });

  it("rejects a run that entered a tool loop", async () => {
    const generateArticle = createHermesArticleGenerator({
      runOneShot: async () => ({
        response: JSON.stringify(writerOutput),
        usageReport: {
          api_calls: 2,
          completed: true,
          cost_status: "included",
          estimated_cost_usd: 0,
          failed: false,
          input_tokens: 123,
          model: "gpt-5.6-sol",
          output_tokens: 456,
          provider: "openai-codex",
        },
      }),
    });

    await assert.rejects(
      generateArticle(generationInput),
      /Hermes writer must complete in one API call/,
    );
  });

  it("rejects non-JSON final responses before the article quality gate", async () => {
    const generateArticle = createHermesArticleGenerator({
      runOneShot: async () => ({
        response: "```json\n{}\n```",
        usageReport: {
          api_calls: 1,
          completed: true,
          cost_status: "included",
          estimated_cost_usd: 0,
          failed: false,
          input_tokens: 10,
          model: "gpt-5.6-sol",
          output_tokens: 10,
          provider: "openai-codex",
        },
      }),
    });

    await assert.rejects(
      generateArticle(generationInput),
      /Hermes article response must be valid JSON/,
    );
  });
});
