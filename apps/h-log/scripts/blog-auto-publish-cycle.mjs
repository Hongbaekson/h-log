import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runAutoPublishCycle } from "../lib/blog-auto-publish-cycle.ts";

if (process.argv.slice(2).join(" ") !== "--once") {
  throw new Error("blog auto publish cycle requires --once");
}

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const result = await runAutoPublishCycle({
  generate: async () => {
    const output = await runJsonScript("blog-auto-publish.mjs");

    if (typeof output.postId !== "string" || !output.postId.trim()) {
      throw new Error("auto publish generation did not return a post id");
    }

    if (typeof output.status !== "string" || !output.status.trim()) {
      throw new Error("auto publish generation did not return a status");
    }

    return { postId: output.postId, status: output.status };
  },
  runRequiredWorkerOnce: async (postId) => {
    const output = await runJsonScript("blog-worker.mjs", {
      HLOG_WORKER_POST_ID: postId,
    });

    if (
      output.status !== "failed" &&
      output.status !== "idle" &&
      output.status !== "retrying" &&
      output.status !== "succeeded"
    ) {
      throw new Error("required publish worker returned an invalid status");
    }

    return { status: output.status };
  },
});

console.log(JSON.stringify(result));

async function runJsonScript(scriptName, environment = {}) {
  const stdout = await runProcess(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      resolve(scriptsDirectory, scriptName),
      "--once",
    ],
    environment,
  );
  const line = stdout
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .at(-1);

  if (!line) {
    throw new Error(`${scriptName} did not return JSON`);
  }

  try {
    const output = JSON.parse(line);

    if (typeof output !== "object" || output === null || Array.isArray(output)) {
      throw new Error("not an object");
    }

    return output;
  } catch {
    throw new Error(`${scriptName} did not return valid JSON`);
  }
}

function runProcess(command, args, environment) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "inherit"],
      windowsHide: true,
    });
    let stdout = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
        return;
      }

      resolvePromise(stdout);
    });
  });
}
