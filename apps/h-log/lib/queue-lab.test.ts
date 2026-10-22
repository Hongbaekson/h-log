import assert from "node:assert/strict";
import { it } from "node:test";
import { buildQueueReplay, type QueueLabOptions } from "./queue-lab.ts";

it("replays fixed jobs deterministically with bounded workers, FIFO retries and no lost or duplicate jobs", () => {
  for (const workers of [1, 2, 3] as const) {
    for (const failure of ["none", "once", "until-recovery"] as const) {
      const options: QueueLabOptions = { workers, failure };
      const frames = buildQueueReplay(options);
      assert.deepEqual(frames, buildQueueReplay(options));
      assert.equal(frames[0].queued.length, 6);
      assert.ok(frames.length <= 17);
      for (const frame of frames) {
        const jobs = [...frame.queued, ...frame.processing, ...frame.completed, ...frame.dlq];
        assert.deepEqual(jobs.map((job) => job.id).sort(), ["J01", "J02", "J03", "J04", "J05", "J06"]);
        assert.ok(frame.processing.length <= workers);
        assert.ok(jobs.every((job) => job.attempts <= 2));
      }
      const last = frames.at(-1)!;
      assert.equal(last.queued.length + last.processing.length, 0);
      assert.equal(last.completed.length, failure === "until-recovery" ? 4 : 6);
      assert.deepEqual(last.dlq.map((job) => job.id), failure === "until-recovery" ? ["J02", "J05"] : []);
    }
  }
  const frames = buildQueueReplay({ workers: 1, failure: "once" });
  assert.deepEqual(frames[4].queued.map((job) => job.id), ["J03", "J04", "J05", "J06", "J02"]);
});

it("redrives only DLQ jobs after the modeled cause is resolved and preserves the original replay", () => {
  for (const workers of [1, 2, 3] as const) {
    const options: QueueLabOptions = { workers, failure: "until-recovery" };
    const original = buildQueueReplay(options);
    const replay = buildQueueReplay(options, true);
    assert.deepEqual(replay.slice(0, original.length), original);
    const recovery = replay[original.length];
    assert.deepEqual(recovery.queued.map((job) => job.id), ["J02", "J05"]);
    assert.equal(recovery.dlq.length, 0);
    assert.deepEqual(recovery.completed, original.at(-1)!.completed);
    for (const frame of replay) {
      const jobs = [...frame.queued, ...frame.processing, ...frame.completed, ...frame.dlq];
      assert.equal(jobs.length, 6);
      assert.equal(new Set(jobs.map((job) => job.id)).size, 6);
    }
    const last = replay.at(-1)!;
    assert.equal(last.completed.length, 6);
    assert.equal(last.dlq.length + last.processing.length + last.queued.length, 0);
    assert.deepEqual(last.completed.filter((job) => job.attempts === 3).map((job) => job.id), ["J02", "J05"]);
    assert.deepEqual(buildQueueReplay(options), original);
  }
  for (const failure of ["none", "once"] as const) {
    assert.deepEqual(buildQueueReplay({ workers: 2, failure }, true), buildQueueReplay({ workers: 2, failure }));
  }
});
