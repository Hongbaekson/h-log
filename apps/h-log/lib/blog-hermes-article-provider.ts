import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  GenerateArticleInput,
  GenerateArticleResult,
} from "./blog-daily-auto-article.ts";
import type { ArticleWriterOutput } from "./blog-article-generation.ts";
import {
  articleClaimTypes,
  blogArticleModes,
} from "./blog-content-model.ts";
import type { UsageMeasurement } from "./blog-usage-ledger.ts";

const HERMES_PROVIDER = "openai-codex";
const HERMES_MODEL = "gpt-5.6-sol";
const HERMES_TOOLSETS = ["context_engine"] as const;

export type HermesOneShotInvocation = {
  command: string;
  model: string;
  prompt: string;
  provider: typeof HERMES_PROVIDER;
  safeMode: true;
  toolsets: readonly string[];
};

export type HermesOneShotResult = {
  response: string;
  usageReport: unknown;
};

export type HermesOneShotRunner = (
  invocation: HermesOneShotInvocation,
) => Promise<HermesOneShotResult>;

export function createHermesChildEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const childEnvironment = { ...environment };
  delete childEnvironment.HERMES_KANBAN_TASK;
  return childEnvironment;
}

export function createHermesArticleGenerator({
  command = process.env.HLOG_HERMES_COMMAND?.trim() || "hermes",
  runOneShot = runHermesOneShot,
}: {
  command?: string;
  runOneShot?: HermesOneShotRunner;
} = {}): (input: GenerateArticleInput) => Promise<GenerateArticleResult> {
  return async (input) => {
    const invocation: HermesOneShotInvocation = {
      command,
      model: HERMES_MODEL,
      prompt: createHermesArticlePrompt(input),
      provider: HERMES_PROVIDER,
      safeMode: true,
      toolsets: HERMES_TOOLSETS,
    };
    const result = await runOneShot(invocation);
    const usage = parseHermesUsageReport(result.usageReport, invocation);
    let output: unknown;

    try {
      output = JSON.parse(result.response);
    } catch {
      throw new Error("Hermes article response must be valid JSON");
    }

    if (!isRecord(output)) {
      throw new Error("Hermes article response must be a JSON object");
    }

    return {
      output: output as ArticleWriterOutput,
      usage,
    };
  };
}

async function runHermesOneShot(
  invocation: HermesOneShotInvocation,
): Promise<HermesOneShotResult> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "hlog-hermes-"));
  const usageFile = join(temporaryDirectory, "usage.json");

  try {
    const response = await executeHermes(invocation, usageFile);
    const usageReport = JSON.parse(await readFile(usageFile, "utf8"));

    return { response, usageReport };
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

function executeHermes(
  invocation: HermesOneShotInvocation,
  usageFile: string,
): Promise<string> {
  const args = [
    ...(invocation.safeMode ? ["--safe-mode"] : []),
    "--oneshot",
    invocation.prompt,
    "--usage-file",
    usageFile,
    "--model",
    invocation.model,
    "--provider",
    invocation.provider,
    "--toolsets",
    invocation.toolsets.join(","),
  ];

  return new Promise((resolve, reject) => {
    execFile(
      invocation.command,
      args,
      {
        encoding: "utf8",
        env: createHermesChildEnvironment(),
        maxBuffer: 4 * 1024 * 1024,
        timeout: 5 * 60 * 1000,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) {
          reject(new Error("Hermes one-shot article generation failed"));
          return;
        }

        resolve(stdout.trim());
      },
    );
  });
}

function createHermesArticlePrompt(input: GenerateArticleInput): string {
  return [
    "You are the H-Log article writer.",
    "Return exactly one JSON object and no Markdown code fence or commentary.",
    "Do not call tools. Use only the verified INPUT below.",
    "Required camelCase fields: title, slug, description, tags, articleMode, contentMarkdown, claims, sources, evidencePaths, personalContextIds, publishDecision, blockReason.",
    `Allowed article modes: ${blogArticleModes.join(", ")}.`,
    `Allowed claim types: ${articleClaimTypes.join(", ")}.`,
    "tags, evidencePaths, personalContextIds, and sources must each be JSON arrays of strings.",
    "sources must be an array of URL strings selected from INPUT.sources[].url; never return source objects or invent a URL.",
    "Each claim must contain id, text, one allowed type, and one verified sourceId, sourceUrl, or evidencePath.",
    "A claim sourceId must exactly match INPUT.sources[].id and sourceUrl must exactly match INPUT.sources[].url.",
    "Use publishDecision=block when the supplied evidence cannot support publication.",
    // Condensed from .codex/docs/harness/BLOG_WRITING_GUIDE.md; no runtime file or skill loading.
    "독자에게 보이는 글은 자연스러운 한국어 해요체를 중심으로 쓴다. 짧은 사실 설명에는 합니다체를 섞되 같은 어미를 기계적으로 반복하지 않는다.",
    "제목·요약·도입부는 같은 문제와 판단 기준을 다룬다. 요약은 1~2문장으로 쓰고, 인사나 기술의 중요성보다 이 글의 질문과 범위를 먼저 보여준다.",
    "한 문장에는 중심 주장 하나를 둔다. 명사 나열·번역투 피동·과장·불필요한 연결어와 반복 요약을 줄이고, 선택의 이유를 근거와 연결한다.",
    "articleMode는 INPUT.generationInput.articleMode를 따른다. 아래 유형별 흐름은 참고 기준이며 모든 글에 같은 목차나 실패 사례를 강제하지 않는다.",
    "project_record: 요구 조건 → 확인한 구현 선택 → 실제 동작 → 검증 범위로 설명한다.",
    "ops_incident: 기록에 있는 증상 → 확인한 단서 → 원인과 조치 → 복구 확인과 남은 일로 설명한다.",
    "experiment: 확인할 질문 → 실제 재현 조건과 실행 → 관측 결과 → 해석과 한계로 설명한다.",
    "document_analysis: 질문 → 문서에서 확인한 사실 → 판단 기준 → 미확인 조건으로 설명한다.",
    "applied_analysis: 적용할 조건 → 선택지 → 예상 영향 → 검증 계획으로 설명하며 계획을 완료한 일처럼 쓰지 않는다.",
    "직접 경험 표현은 personalContextSummaries의 allowedUsage가 direct_experience이고 해당 주장의 근거가 있을 때만 쓴다. 코드의 존재만으로 운영 장애·동기·감정·성과를 만들어내지 않는다.",
    "문체를 다듬어도 인용한 코드·명령·URL·식별자·날짜·수치·단위와 조건을 보존한다. 확인한 사실, 자료 해석, 미실행 계획을 구분하고 불확실성이나 검증 범위를 강화하거나 약화하지 않는다.",
    "아래 문체 예문은 형식만 참고하고 사실 근거로 사용하지 않는다: '조회가 실패하면 해당 영역에 안내를 보여줘요.' / '문서에서 확인한 조건이에요. 아직 직접 실행하지는 않았습니다.'",
    "최종 JSON을 반환하기 전에 문체와 본문·claims·sources의 일치를 자체 점검한다. 문체를 위해 근거를 추가하거나 부족한 근거를 숨기지 않으며 점검 과정은 출력하지 않는다.",
    `INPUT=${JSON.stringify(input)}`,
  ].join("\n");
}

function parseHermesUsageReport(
  value: unknown,
  invocation: HermesOneShotInvocation,
): UsageMeasurement {
  if (!isRecord(value)) {
    throw new Error("Hermes usage report is invalid");
  }

  if (
    value.failed !== false ||
    value.completed !== true ||
    value.provider !== invocation.provider ||
    value.model !== invocation.model
  ) {
    throw new Error("Hermes usage report does not match the requested run");
  }

  if (value.cost_status !== "included" || value.estimated_cost_usd !== 0) {
    throw new Error("Hermes run is not included in the Codex subscription");
  }

  if (value.api_calls !== 1) {
    throw new Error("Hermes writer must complete in one API call");
  }

  return {
    estimatedCost: 0,
    inputTokens: toNullableTokenCount(value.input_tokens),
    model: invocation.model,
    outputTokens: toNullableTokenCount(value.output_tokens),
    provider: invocation.provider,
  };
}

function toNullableTokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
