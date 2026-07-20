import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createBlogUsageEvent,
  createPostgresBlogUsageLedger,
  isUsageBudgetExceeded,
  resolveUsageBudgetPolicy,
} from "./blog-usage-ledger.ts";

describe("blog usage cost ledger", () => {
  it("blocks new costed work when either the daily or monthly budget is exhausted", () => {
    const policy = {
      dailyEstimatedCostLimit: 1,
      monthlyEstimatedCostLimit: 10,
    };

    assert.equal(
      isUsageBudgetExceeded(
        { dailyEstimatedCost: 1, monthlyEstimatedCost: 3 },
        policy,
      ),
      true,
    );
    assert.equal(
      isUsageBudgetExceeded(
        { dailyEstimatedCost: 0.5, monthlyEstimatedCost: 10 },
        policy,
      ),
      true,
    );
    assert.equal(
      isUsageBudgetExceeded(
        { dailyEstimatedCost: 0.5, monthlyEstimatedCost: 9 },
        policy,
      ),
      false,
    );
  });

  it("normalizes provider usage into the persisted usage_events shape", () => {
    assert.deepEqual(
      createBlogUsageEvent({
        createdAt: "2026-07-20T00:00:00.000Z",
        eventType: "llm",
        id: "run-1:llm",
        measurement: {
          estimatedCost: 0.012,
          inputTokens: 1200,
          model: "fake-writer",
          outputTokens: 400,
          provider: "fake-provider",
        },
        runId: "run-1",
        status: "success",
      }),
      {
        createdAt: "2026-07-20T00:00:00.000Z",
        estimatedCost: 0.012,
        eventType: "llm",
        id: "run-1:llm",
        inputTokens: 1200,
        model: "fake-writer",
        outputTokens: 400,
        provider: "fake-provider",
        runId: "run-1",
        status: "success",
      },
    );
  });

  it("persists every field and sums the current UTC day and month", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] | undefined }> =
      [];
    const pool = {
      async query(sql: string, values?: readonly unknown[]) {
        calls.push({ sql, values });

        return sql.includes("daily_estimated_cost")
          ? {
              rows: [
                {
                  daily_estimated_cost: "1.250000",
                  monthly_estimated_cost: "4.500000",
                },
              ],
            }
          : { rows: [] };
      },
    };
    const ledger = createPostgresBlogUsageLedger(pool);
    const event = createBlogUsageEvent({
      createdAt: "2026-07-20T12:34:56.000Z",
      eventType: "embedding",
      id: "run-2:embedding:search",
      measurement: {
        estimatedCost: 0.003,
        inputTokens: 30,
        model: "fake-embedding",
        outputTokens: 0,
        provider: "fake-provider",
      },
      runId: "run-2",
      status: "success",
    });

    await ledger.recordUsageEvent(event);
    const totals = await ledger.getUsageCostTotals(event.createdAt);

    assert.deepEqual(calls[0]?.values, [
      "run-2:embedding:search",
      "run-2",
      "embedding",
      "fake-provider",
      "fake-embedding",
      30,
      0,
      0.003,
      "success",
      "2026-07-20T12:34:56.000Z",
    ]);
    assert.deepEqual(calls[1]?.values, [
      "2026-07-20T00:00:00.000Z",
      "2026-07-01T00:00:00.000Z",
      "2026-07-20T12:34:56.000Z",
    ]);
    assert.deepEqual(totals, {
      dailyEstimatedCost: 1.25,
      monthlyEstimatedCost: 4.5,
    });
  });

  it("resolves finite daily and monthly limits from runtime configuration", () => {
    assert.deepEqual(
      resolveUsageBudgetPolicy({
        HLOG_DAILY_ESTIMATED_COST_LIMIT: "1.5",
        HLOG_MONTHLY_ESTIMATED_COST_LIMIT: "20",
      }),
      {
        dailyEstimatedCostLimit: 1.5,
        monthlyEstimatedCostLimit: 20,
      },
    );
    assert.throws(
      () =>
        resolveUsageBudgetPolicy({
          HLOG_DAILY_ESTIMATED_COST_LIMIT: "invalid",
        }),
      /HLOG_DAILY_ESTIMATED_COST_LIMIT must be a non-negative number/,
    );
  });
});
