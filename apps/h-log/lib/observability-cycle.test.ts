import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runObservedPublishCycle, writeCycleEvidence } from "./observability-cycle.ts";

test("idle/duplicate/budget are not verified success and monitoring failure never retries generation", async () => {
  for (const status of ["publishing", "duplicate_daily_publish", "budget_exceeded", "drafted", "generation_failed"]) {
    const evidence: { result: string; verified: boolean; checked_at: number }[] = [];
    let generates = 0, proofs = 0;
    const result = await runObservedPublishCycle({ generate: async () => { generates++; return { postId: "PRIVATE", versionId: "PRIVATE", status }; },
      runRequiredWorkerOnce: async () => ({ status: "idle" }), verify: async () => { proofs++; return false; },
      write: async value => { evidence.push(value); }, now: () => 1234 });
    assert.equal(result.status, "completed");
    assert.equal(generates, 1);
    assert.equal(proofs, status === "publishing" ? 1 : 0);
    assert.equal(evidence.at(-1)?.verified, false);
    assert.equal(evidence.at(-1)?.result, status === "publishing" ? "unverified" : status === "budget_exceeded" ? "budget_blocked" : status === "generation_failed" ? "failed" : "skipped");
    assert.doesNotMatch(JSON.stringify(evidence), /PRIVATE/);
  }
  let generates = 0;
  await runObservedPublishCycle({ generate: async () => { generates++; return { postId: "post", versionId: "v", status: "publishing" }; }, runRequiredWorkerOnce: async () => ({ status: "idle" }),
    verify: async () => { throw Error("db unavailable"); }, write: async () => { throw Error("disk full"); } });
  assert.equal(generates, 1);
});

test("cycle evidence is replaced durably without content or leftover temporary files", async t => {
  const dir = await mkdtemp(join(tmpdir(), 'hlog-evidence-'));
  const log = t.mock.method(console, 'error', () => undefined);
  const environment = { HLOG_OBSERVABILITY_EVIDENCE_DIR: dir, HLOG_OBSERVABILITY_INVOCATION_ID: 'a'.repeat(32) };
  const evidence = { result: 'succeeded', stage: 'complete', verified: true, checked_at: 1500 };
  try {
    await writeCycleEvidence({ ...evidence, result: 'running', verified: false }, environment);
    await writeCycleEvidence(evidence, environment);
    assert.deepEqual(JSON.parse(await readFile(join(dir, 'autopublish.json'), 'utf8')), { schema_version: 1, invocation_id: 'a'.repeat(32), ...evidence });
    assert.deepEqual(await readdir(dir), ['autopublish.json']);
    if (process.platform === 'linux') assert.equal(log.mock.callCount(), 0, 'file and directory fsync must both succeed on the deployed filesystem');
    await writeCycleEvidence(evidence, { ...environment, HLOG_OBSERVABILITY_INVOCATION_ID: 'PRIVATE invalid' });
    assert.ok(log.mock.calls.every(call => call.arguments[0] === 'monitoring evidence write failed'));
    assert.deepEqual(await readdir(dir), ['autopublish.json']);
  } finally { for (const file of await readdir(dir)) await unlink(join(dir, file)); await rmdir(dir); }
});

test("verified completion uses actual proof time, while generation/worker errors keep their exit behavior", async () => {
  let last: { result: string; stage: string; verified: boolean; checked_at: number } | undefined;
  const write = async (e: NonNullable<typeof last>) => { last = e; };
  await runObservedPublishCycle({ generate: async () => ({ postId: "post", versionId: "v", status: "publishing" }), runRequiredWorkerOnce: async () => ({ status: "idle" }), verify: async () => true, write, now: () => 1500 });
  assert.deepEqual(last, { result: "succeeded", stage: "complete", verified: true, checked_at: 1500 });
  const error = Error("PRIVATE generation error");
  await assert.rejects(runObservedPublishCycle({ generate: async () => { throw error; }, runRequiredWorkerOnce: async () => ({ status: "idle" }), verify: async () => true, write }), e => e === error);
  assert.equal(last?.result, "failed"); assert.equal(last?.stage, "generation");
  await assert.rejects(runObservedPublishCycle({ generate: async () => ({ postId: "post", versionId: "v", status: "publishing" }), runRequiredWorkerOnce: async () => ({ status: "failed" }), verify: async () => true, write }));
  assert.equal(last?.stage, "worker");
});
