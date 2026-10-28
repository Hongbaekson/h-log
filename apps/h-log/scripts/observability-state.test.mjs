import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

test("host state helper: Linux filesystem, kill and original exit code", { skip: process.env.HLOG_OBSERVABILITY_STATE_TEST !== "1" }, () => {
  const result = execFileSync("docker", ["run", "--rm", "--network", "none", "--read-only", "--user", "1000:1000", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--tmpfs", "/tmp:size=32m,uid=1000,gid=1000,mode=0700", "--mount", `type=bind,source=${resolve(import.meta.dirname)},target=/scripts,readonly`, "-e", "PYTHONDONTWRITEBYTECODE=1", "python:3.14-alpine@sha256:bc62fbcb684904b1bb81a6240041bb60e9c1ee19ddeaf17a6b4297e1cc9c95d2", "python", "-m", "unittest", "discover", "-s", "/scripts", "-p", "observability_state_test.py"], { timeout: 60_000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.doesNotMatch(result, /SECRET/);
});
