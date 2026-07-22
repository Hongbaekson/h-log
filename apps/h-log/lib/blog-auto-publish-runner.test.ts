import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDailyAutoPublishPostId,
  parseDailyAutoPublishInput,
  runDailyAutoPublishOnce,
} from "./blog-auto-publish-runner.ts";

describe("daily auto publish one-shot runner", () => {
  it("derives the same daily post id across the UTC to Seoul boundary", () => {
    assert.equal(
      createDailyAutoPublishPostId("2026-07-21T15:30:00.000Z"),
      "post-2026-07-22",
    );
  });

  it("checks the Seoul daily post before usage, Hermes, or persistence", async () => {
    const checkedPostIds: string[] = [];
    let generationCalls = 0;
    let persistenceCalls = 0;
    let releaseCalls = 0;

    const result = await runDailyAutoPublishOnce({
      acquireDailyRunLock: async (lockKey) => {
        assert.equal(lockKey, "daily-auto-publish:2026-07-22");
        return async () => {
          releaseCalls += 1;
        };
      },
      generateArticle: async () => {
        generationCalls += 1;
        throw new Error("Hermes must not run for an existing daily post");
      },
      hasPersistedPost: async (postId) => {
        checkedPostIds.push(postId);
        return true;
      },
      personalContextItems: [],
      persistPublishingArticle: async () => {
        persistenceCalls += 1;
      },
      researchPackSources: [],
      runAt: "2026-07-21T15:30:00.000Z",
      topicSources: [],
      usageLedger: {
        getUsageCostTotals: async () => {
          throw new Error("usage ledger must not run for an existing daily post");
        },
        recordUsageEvent: async () => {
          throw new Error("usage ledger must not run for an existing daily post");
        },
      },
    });

    assert.equal(result.status, "duplicate_daily_publish");
    assert.deepEqual(checkedPostIds, ["post-2026-07-22"]);
    assert.equal(generationCalls, 0);
    assert.equal(persistenceCalls, 0);
    assert.equal(releaseCalls, 1);
  });

  it("rejects malformed server-local input before the pipeline runs", () => {
    assert.throws(
      () =>
        parseDailyAutoPublishInput({
          personalContextItems: [],
          researchPackSources: [],
          topicSources: "not-an-array",
        }),
      /topicSources must be an array/,
    );

    assert.deepEqual(
      parseDailyAutoPublishInput({
        personalContextItems: [],
        requestedContextIds: [],
        researchPackSources: [],
        topicSources: [],
      }),
      {
        personalContextItems: [],
        requestedContextIds: [],
        researchPackSources: [],
        topicSources: [],
      },
    );
  });
});
