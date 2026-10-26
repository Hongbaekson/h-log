import assert from "node:assert/strict";
import test from "node:test";
import { parseResumeCommand, resumePdfLimits } from "./resume-pdf.ts";

test("PDF note commands require an exact owner command and global revision", () => {
  const command = { action: "save_note", commandId: "11111111-1111-4111-8111-111111111111", expectedRevision: 2, id: "22222222-2222-4222-8222-222222222222", note: "검토할 내용" };
  assert.deepEqual(parseResumeCommand(command), command);
  for (const bad of [{ ...command, expectedRevision: -1 }, { ...command, commandId: "bad" }, { ...command, note: "x".repeat(2001) }, { ...command, action: "publish" }, { ...command, filename: "private.pdf" }]) {
    assert.throws(() => parseResumeCommand(bad), /invalid_request/);
  }
  assert.equal(resumePdfLimits.bytes, 5242880);
});
