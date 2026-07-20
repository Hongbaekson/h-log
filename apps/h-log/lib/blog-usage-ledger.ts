import type { Timestamp } from "./blog-content-model.ts";

export const usageEventTypes = [
  "source_fetch",
  "llm",
  "embedding",
  "diagram",
  "indexnow",
  "discord",
] as const;

export type UsageEventType = (typeof usageEventTypes)[number];

export type UsageMeasurement = {
  estimatedCost: number;
  inputTokens: number | null;
  model: string | null;
  outputTokens: number | null;
  provider: string;
};

export type BlogUsageEventRecord = UsageMeasurement & {
  createdAt: Timestamp;
  eventType: UsageEventType;
  id: string;
  runId: string;
  status: "budget_exceeded" | "failed" | "retry_stopped" | "success";
};

export type BlogUsageLedger = {
  getUsageCostTotals(at: Timestamp): Promise<UsageCostTotals>;
  recordUsageEvent(event: BlogUsageEventRecord): Promise<void>;
};

export type UsageBudgetPolicy = {
  dailyEstimatedCostLimit: number;
  monthlyEstimatedCostLimit: number;
};

export type UsageCostTotals = {
  dailyEstimatedCost: number;
  monthlyEstimatedCost: number;
};

type UsageLedgerPool = {
  query(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
};

export const UNLIMITED_USAGE_BUDGET: UsageBudgetPolicy = {
  dailyEstimatedCostLimit: Number.POSITIVE_INFINITY,
  monthlyEstimatedCostLimit: Number.POSITIVE_INFINITY,
};

export function createBlogUsageEvent(
  input: Pick<
    BlogUsageEventRecord,
    "createdAt" | "eventType" | "id" | "runId" | "status"
  > & { measurement: UsageMeasurement },
): BlogUsageEventRecord {
  return {
    createdAt: input.createdAt,
    estimatedCost: input.measurement.estimatedCost,
    eventType: input.eventType,
    id: input.id,
    inputTokens: input.measurement.inputTokens,
    model: input.measurement.model,
    outputTokens: input.measurement.outputTokens,
    provider: input.measurement.provider,
    runId: input.runId,
    status: input.status,
  };
}

export function isUsageBudgetExceeded(
  totals: UsageCostTotals,
  policy: UsageBudgetPolicy,
): boolean {
  return (
    totals.dailyEstimatedCost >= policy.dailyEstimatedCostLimit ||
    totals.monthlyEstimatedCost >= policy.monthlyEstimatedCostLimit
  );
}

export function resolveUsageBudgetPolicy(
  environment: Record<string, string | undefined>,
): UsageBudgetPolicy {
  return {
    dailyEstimatedCostLimit: parseUsageCostLimit(
      environment.HLOG_DAILY_ESTIMATED_COST_LIMIT,
      "HLOG_DAILY_ESTIMATED_COST_LIMIT",
    ),
    monthlyEstimatedCostLimit: parseUsageCostLimit(
      environment.HLOG_MONTHLY_ESTIMATED_COST_LIMIT,
      "HLOG_MONTHLY_ESTIMATED_COST_LIMIT",
    ),
  };
}

export function createPostgresBlogUsageLedger(
  pool: UsageLedgerPool,
): BlogUsageLedger {
  return {
    async getUsageCostTotals(at) {
      const instant = new Date(at);
      const dailyStart = new Date(
        Date.UTC(
          instant.getUTCFullYear(),
          instant.getUTCMonth(),
          instant.getUTCDate(),
        ),
      ).toISOString();
      const monthlyStart = new Date(
        Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), 1),
      ).toISOString();
      const result = await pool.query(
        `select
           coalesce(
             sum(estimated_cost) filter (where created_at >= $1),
             0
           ) as daily_estimated_cost,
           coalesce(sum(estimated_cost), 0) as monthly_estimated_cost
         from usage_events
         where created_at >= $2
           and created_at <= $3`,
        [dailyStart, monthlyStart, at],
      );
      const row = result.rows[0];

      return {
        dailyEstimatedCost: Number(row?.daily_estimated_cost ?? 0),
        monthlyEstimatedCost: Number(row?.monthly_estimated_cost ?? 0),
      };
    },

    async recordUsageEvent(event) {
      await pool.query(
        `insert into usage_events (
           id,
           run_id,
           event_type,
           provider,
           model,
           input_tokens,
           output_tokens,
           estimated_cost,
           status,
           created_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict (id) do nothing`,
        [
          event.id,
          event.runId,
          event.eventType,
          event.provider,
          event.model,
          event.inputTokens,
          event.outputTokens,
          event.estimatedCost,
          event.status,
          event.createdAt,
        ],
      );
    },
  };
}

function parseUsageCostLimit(value: string | undefined, name: string): number {
  if (!value?.trim()) {
    return Number.POSITIVE_INFINITY;
  }

  const limit = Number(value);

  if (!Number.isFinite(limit) || limit < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }

  return limit;
}
