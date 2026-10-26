import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("recovery CLI refuses open publication and invalid commands before touching storage", () => {
  const command = ["--command-id", "11111111-1111-4111-8111-111111111111", "--expected-revision", "2"];
  for (const [environment, args, expected] of [
    [{ HLOG_RESUME_PDF_ENABLED: "1", HLOG_RESUME_PDF_PUBLICATION_EPOCH: "" }, command, "recovery_gate_open"],
    [{ HLOG_RESUME_PDF_ENABLED: "0", HLOG_RESUME_PDF_PUBLICATION_EPOCH: "old-epoch" }, command, "recovery_gate_open"],
    [{ HLOG_RESUME_PDF_ENABLED: "0", HLOG_RESUME_PDF_PUBLICATION_EPOCH: "" }, [], "invalid_recovery_command"],
  ] as const) {
    const result = spawnSync(process.execPath, ["--no-warnings", "--experimental-strip-types", "scripts/resume-pdf-recovery.mjs", ...args], {
      env: { ...process.env, ...environment, DATABASE_URL: "invalid-private-database" }, encoding: "utf8", timeout: 5000, windowsHide: true,
    });
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), expected);
    assert.doesNotMatch(result.stdout + result.stderr, /invalid-private-database/);
  }
});
