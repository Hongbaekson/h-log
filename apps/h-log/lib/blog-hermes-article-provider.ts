import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  GenerateArticleInput,
  GenerateArticleResult,
} from "./blog-daily-auto-article.ts";
import type { ArticleWriterOutput } from "./blog-article-generation.ts";
import type { UsageMeasurement } from "./blog-usage-ledger.ts";

const HERMES_PROVIDER = "openai-codex";
const DEFAULT_HERMES_MODEL = "gpt-5.6-sol";
const HERMES_TOOLSETS = ["web"] as const;

export type HermesOneShotInvocation = {
  command: string;
  model: string;
  prompt: string;
  provider: typeof HERMES_PROVIDER;
  toolsets: readonly string[];
};

export type HermesOneShotResult = {
  response: string;
  usageReport: unknown;
};

export type HermesOneShotRunner = (
  invocation: HermesOneShotInvocation,
) => Promise<HermesOneShotResult>;

export function createHermesArticleGenerator({
  command = process.env.HLOG_HERMES_COMMAND?.trim() || "hermes",
  model = process.env.HLOG_HERMES_MODEL?.trim() || DEFAULT_HERMES_MODEL,
  runOneShot = runHermesOneShot,
}: {
  command?: string;
  model?: string;
  runOneShot?: HermesOneShotRunner;
} = {}): (input: GenerateArticleInput) => Promise<GenerateArticleResult> {
  return async (input) => {
    const invocation: HermesOneShotInvocation = {
      command,
      model,
      prompt: createHermesArticlePrompt(input),
      provider: HERMES_PROVIDER,
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
    "--ignore-rules",
  ];

  return new Promise((resolve, reject) => {
    execFile(
      invocation.command,
      args,
      {
        encoding: "utf8",
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
    "Each claim must contain id, text, type and one verified sourceId, sourceUrl, or evidencePath.",
    "Use publishDecision=block when the supplied evidence cannot support publication.",
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
