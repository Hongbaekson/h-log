import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { assertHermesOpenAiCodexAuthenticated } from "../lib/blog-hermes-auth-preflight.ts";

const execute = promisify(execFile);
const command = process.env.HLOG_HERMES_COMMAND?.trim() || "hermes";
const { stdout } = await execute(command, [
  "auth",
  "status",
  "openai-codex",
], {
  encoding: "utf8",
  timeout: 30_000,
  windowsHide: true,
});

assertHermesOpenAiCodexAuthenticated(stdout);
console.log(
  JSON.stringify({ provider: "openai-codex", status: "authenticated" }),
);
