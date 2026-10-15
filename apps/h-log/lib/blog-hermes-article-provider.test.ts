import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { GenerateArticleInput } from "./blog-daily-auto-article.ts";
import {
  createHermesChildEnvironment,
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
  sources: [
    {
      id: "source-runtime",
      sourceRole: "official",
      summary: "Verified runtime release summary.",
      title: "Runtime release",
      url: "https://example.com/runtime",
    },
  ],
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
    assert.equal(invocation.safeMode, true);
    assert.deepEqual(invocation.toolsets, ["context_engine"]);
    assert.match(invocation.prompt, /Return exactly one JSON object/);
    assert.match(invocation.prompt, /Do not call tools/);
    assert.match(
      invocation.prompt,
      /Allowed claim types: version, date, price, api, performance, security, benchmark, support, opinion\./,
    );
    assert.match(
      invocation.prompt,
      /sources must be an array of URL strings selected from INPUT\.sources/,
    );
    assert.deepEqual(result.output, writerOutput);
    assert.deepEqual(result.usage, {
      estimatedCost: 0,
      inputTokens: 123,
      model: "gpt-5.6-sol",
      outputTokens: 456,
      provider: "openai-codex",
    });
  });

  it("sends Korean editorial guidance with unchanged verified input in one writer call", async () => {
    const input: GenerateArticleInput = {
      ...generationInput,
      generationInput: {
        articleMode: "document_analysis",
        commandsOrChecks: ["재연결 동작은 아직 실행하지 않음"],
        evidencePaths: [],
        personalContextIds: ["context-hlog"],
        personalContextSummaries: [{
          allowedUsage: "reference_only",
          category: "backend",
          id: "context-hlog",
          summary: "코드 예시 `COUNT 3`과 24시간 조건은 문서 분석 범위다.",
          title: "메시지 전달 기준",
          version: 1,
        }],
        researchPackId: "research-pack-runtime",
        selectedAngle: "공식 문서의 조건을 비교한다.",
        summary: "운영 경험이나 측정 결과가 없는 자료 분석",
        topicCandidateId: "topic-runtime",
      },
    };
    const expectedOutput = { ...writerOutput, articleMode: "document_analysis" };
    const invocations: HermesOneShotInvocation[] = [];
    const generateArticle = createHermesArticleGenerator({
      runOneShot: async (invocation) => {
        invocations.push(invocation);
        return {
          response: JSON.stringify(expectedOutput),
          usageReport: {
            api_calls: 1,
            completed: true,
            cost_status: "included",
            estimated_cost_usd: 0,
            failed: false,
            input_tokens: 123,
            model: invocation.model,
            output_tokens: 456,
            provider: invocation.provider,
          },
        };
      },
    });

    const result = await generateArticle(input);
    assert.equal(invocations.length, 1);
    const invocation = invocations[0];
    const inputStart = invocation.prompt.lastIndexOf("\nINPUT=");
    assert.ok(inputStart > 0);
    const instructions = invocation.prompt.slice(0, inputStart);
    assert.deepEqual(JSON.parse(invocation.prompt.slice(inputStart + 7)), input);
    assert.match(instructions, /한국어.*해요체/);
    assert.match(instructions, /제목.*요약.*도입부/);
    assert.match(instructions, /articleMode.*INPUT\.generationInput\.articleMode/);
    assert.match(instructions, /project_record.*구현/);
    assert.match(instructions, /ops_incident.*증상/);
    assert.match(instructions, /experiment.*조건.*결과/);
    assert.match(instructions, /document_analysis.*문서.*미확인/);
    assert.match(instructions, /applied_analysis.*조건.*계획/);
    assert.match(instructions, /direct_experience.*근거/);
    assert.match(instructions, /코드.*URL.*수치/);
    assert.match(instructions, /예문.*사실 근거로 사용하지/);
    assert.match(instructions, /Do not call tools/);
    assert.match(instructions, /sourceId must exactly match INPUT\.sources/);
    assert.match(instructions, /publishDecision=block/);
    assert.deepEqual(invocation.toolsets, ["context_engine"]);
    assert.equal(invocation.safeMode, true);
    assert.deepEqual(result.output, expectedOutput);
  });

  it("does not allow environment or caller model overrides", async () => {
    const invocations: HermesOneShotInvocation[] = [];
    const previousModel = process.env.HLOG_HERMES_MODEL;
    const runOneShot = async (input: HermesOneShotInvocation) => {
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
          model: input.model,
          output_tokens: 456,
          provider: input.provider,
        },
      };
    };

    try {
      process.env.HLOG_HERMES_MODEL = "env-override";
      await createHermesArticleGenerator({ runOneShot })(generationInput);
      const callerOverrideOptions = {
        model: "caller-override",
        runOneShot,
      };
      await createHermesArticleGenerator(callerOverrideOptions)(generationInput);
    } finally {
      if (previousModel === undefined) {
        delete process.env.HLOG_HERMES_MODEL;
      } else {
        process.env.HLOG_HERMES_MODEL = previousModel;
      }
    }

    assert.deepEqual(
      invocations.map(({ model }) => model),
      ["gpt-5.6-sol", "gpt-5.6-sol"],
    );
  });

  it("removes Hermes kanban tool injection from the child environment", () => {
    const environment = createHermesChildEnvironment({
      HERMES_KANBAN_TASK: "task-123",
      NODE_ENV: "test",
      PATH: "test-path",
    });

    assert.equal(environment.HERMES_KANBAN_TASK, undefined);
    assert.equal(environment.PATH, "test-path");
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
