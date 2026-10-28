import assert from "node:assert/strict";
import test from "node:test";
import { parseJobRetryCommand } from "./blog-job-retry.ts";
const command = { commandId: "11111111-1111-4111-8111-111111111111", jobId: "22222222-2222-4222-8222-222222222222", expectedRetryCount: 1, expectedPostRevision: 0, expectedVersion: 1, expectedHash: "a".repeat(64), reason: "원인을 확인하고 조치했습니다", confirmed: true };
test("retry requires an explicit exact target, version, budget, reason and confirmation", () => {
  assert.deepEqual(parseJobRetryCommand(command), command);
  for (const change of [{ confirmed: false }, { reason: " " }, { expectedRetryCount: -1 }, { expectedPostRevision: 1.5 }, { expectedHash: "oops" }, { jobId: "private/path" }, { extra: true }]) assert.throws(() => parseJobRetryCommand({ ...command, ...change }), /invalid_request/);
});
