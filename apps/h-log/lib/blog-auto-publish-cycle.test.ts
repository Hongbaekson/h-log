import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { requiredPublishJobTypes } from "./blog-content-model.ts";
import { runAutoPublishCycle } from "./blog-auto-publish-cycle.ts";

describe("auto publish cycle", () => {
  it("drains only the deterministic daily post until its required jobs are idle", async () => {
    const workerPostIds: string[] = [];
    let workerRuns = 0;

    const result = await runAutoPublishCycle({
      generate: async () => ({
        postId: "post-2026-07-22",
        status: "publishing",
      }),
      runRequiredWorkerOnce: async (postId) => {
        workerPostIds.push(postId);
        workerRuns += 1;

        return workerRuns <= requiredPublishJobTypes.length
          ? { status: "succeeded" }
          : { status: "idle" };
      },
    });

    assert.deepEqual(result, {
      generationStatus: "publishing",
      postId: "post-2026-07-22",
      status: "completed",
      workerRuns: requiredPublishJobTypes.length + 1,
    });
    assert.deepEqual(
      workerPostIds,
      Array(requiredPublishJobTypes.length + 1).fill("post-2026-07-22"),
    );
  });

  it("fails closed when a required worker does not succeed", async () => {
    await assert.rejects(
      runAutoPublishCycle({
        generate: async () => ({
          postId: "post-2026-07-22",
          status: "duplicate_daily_publish",
        }),
        runRequiredWorkerOnce: async () => ({ status: "failed" }),
      }),
      /required publish worker stopped with failed/,
    );
  });

  it("stops after the bounded required-job drain limit", async () => {
    let workerRuns = 0;

    await assert.rejects(
      runAutoPublishCycle({
        generate: async () => ({
          postId: "post-2026-07-22",
          status: "publishing",
        }),
        runRequiredWorkerOnce: async () => {
          workerRuns += 1;
          return { status: "succeeded" };
        },
      }),
      /required publish worker did not become idle/,
    );
    assert.equal(workerRuns, requiredPublishJobTypes.length + 1);
  });
});
