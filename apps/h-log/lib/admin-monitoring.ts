import { batchResults } from "./observability-publishing.ts";

export const monitoringStateLabels = { ready: "수집됨", down: "수집 중단", missing: "미수집", stale: "오래된 수집값", error: "수집 오류", invalid: "확인할 수 없는 값" };
export type MonitoringState = keyof typeof monitoringStateLabels;
export const monitoringTaskLabels = { autopublish: "자동 발행", backup: "백업", restore: "복구 검증" };
export const monitoringResultLabels = { never: "실행 기록 없음", running: "진행 중", succeeded: "성공", failed: "실패", skipped: "건너뜀", budget_blocked: "비용 한도로 중단", interrupted: "실행 중단", unverified: "성공 미확인" };
const sourceKeys = ["db", "expectations", "autopublish", "backup", "restore"] as const;
const sourceStates = ["ready", "missing", "invalid", "error"] as const;
const budgetStates = ["limited", "zero", "unlimited", "invalid"] as const;
const metricNames = ["up", "pg_up", "probe_success", "hlog_metrics_collection_success", "hlog_metrics_source_state", "hlog_metrics_collected_timestamp_seconds",
  "hlog_schedule_expected_enabled", "hlog_schedule_maintenance_from_timestamp_seconds", "hlog_schedule_maintenance_until_timestamp_seconds",
  "hlog_autopublish_last_attempt_timestamp_seconds", "hlog_autopublish_last_success_timestamp_seconds", "hlog_batch_last_attempt_timestamp_seconds", "hlog_batch_last_success_timestamp_seconds", "hlog_batch_result",
  "hlog_usage_known_cost_usd", "hlog_usage_unknown_events", "hlog_usage_included_events", "hlog_usage_budget_usd", "hlog_usage_budget_state"];
const selector = `{__name__=~"${metricNames.join("|")}"}`;
// An instant-query timestamp is evaluation time. The range limits sample age
// without losing names; intersect with live series so stale markers stay absent.
export const monitoringQuery = `${selector} and last_over_time(${selector}[180s])`;
type Row = { metric: Record<string, string>; value: [number, string] };
const invalidResponse = () => new Error("Invalid monitoring response");

export function projectMonitoring(payload: unknown, now = Date.now()) {
  const body = payload as { status?: string; warnings?: unknown[]; data?: { resultType?: string; result?: Row[] } } | null;
  if (!body || body.status !== "success" || body.warnings?.length || body.data?.resultType !== "vector" || !Array.isArray(body.data.result) || body.data.result.length > 512) throw invalidResponse();
  const rows = body.data.result;
  if (rows.some(row => !row || !row.metric || typeof row.metric !== "object" || !Array.isArray(row.value) || row.value.length !== 2 || typeof row.value[0] !== "number" || typeof row.value[1] !== "string")) throw invalidResponse();
  const seconds = now / 1000;
  const value = (name: string, labels: Record<string, string> = {}) => {
    const found = rows.filter(row => row.metric.__name__ === name && Object.entries(labels).every(([key, expected]) => row.metric[key] === expected));
    if (found.length !== 1) return null;
    const row = found[0], number = Number(row.value[1]);
    if (!row.value[1].trim() || !Number.isFinite(number) || number < 0 || !Number.isFinite(row.value[0]) || row.value[0] < seconds - 180 || row.value[0] > seconds + 60) return null;
    return number;
  };
  const oneHot = <T extends string>(name: string, label: string, choices: readonly T[], labels: Record<string, string>) => {
    const values = choices.map(choice => value(name, { ...labels, [label]: choice }));
    if (values.some(v => v !== 0 && v !== 1) || values.filter(v => v === 1).length !== 1) return null;
    return choices[values.indexOf(1)];
  };
  const binary = (n: number | null): MonitoringState => n === 1 ? "ready" : n === 0 ? "down" : "missing";
  const up = (job: string, labels: Record<string, string> = {}) => binary(value("up", { job, ...labels }));
  const probe = (target: string) => up("http", { target }) === "ready" ? binary(value("probe_success", { target })) : up("http", { target });
  const services = [
    { key: "home", label: "홈 접속", state: probe("home") }, { key: "blog", label: "블로그 접속", state: probe("blog") },
    { key: "database", label: "DB 연결", state: up("database") === "ready" ? binary(value("pg_up")) : up("database") },
    { key: "collector", label: "업무 지표 수집기", state: up("hlog") }, { key: "host", label: "호스트 지표 수집", state: up("host") },
    { key: "prometheus", label: "Prometheus 수집", state: up("prometheus") }, { key: "probe", label: "접속 검사 수집기", state: up("probe-exporter") },
  ];
  const iso = (n: number | null) => n && n <= seconds + 60 ? new Date(n * 1000).toISOString() : null;
  const sources = sourceKeys.map(key => {
    const collected = value("hlog_metrics_collected_timestamp_seconds", { source: key });
    let state: MonitoringState = up("hlog");
    if (state === "ready") {
      const reported = oneHot("hlog_metrics_source_state", "state", sourceStates, { source: key });
      state = reported ?? "missing";
      if (reported === "ready") {
        state = !collected || collected > seconds + 60 || value("hlog_metrics_collection_success", { source: key }) !== 1 ? "invalid" : seconds - collected > 180 ? "stale" : "ready";
      }
    }
    return { key, state, collectedAt: iso(collected) };
  });
  const expectations = sources.find(x => x.key === "expectations")!;
  const tasks = (Object.keys(monitoringTaskLabels) as (keyof typeof monitoringTaskLabels)[]).map(key => {
    let state = sources.find(x => x.key === key)!.state;
    let schedule: "disabled" | "enabled" | "maintenance" | null = null;
    if (expectations.state === "ready") {
      const enabled = value("hlog_schedule_expected_enabled", { task: key });
      const from = value("hlog_schedule_maintenance_from_timestamp_seconds", { task: key });
      const until = value("hlog_schedule_maintenance_until_timestamp_seconds", { task: key });
      if (enabled === 0) schedule = "disabled";
      else if (enabled === 1 && from !== null && until !== null && until >= from && until - from <= 86400) schedule = from > 0 && seconds >= from && seconds <= until ? "maintenance" : "enabled";
    }
    const prefix = key === "autopublish" ? "hlog_autopublish" : "hlog_batch";
    const labels: Record<string, string> = key === "autopublish" ? {} : { task: key };
    const attempt = value(prefix + "_last_attempt_timestamp_seconds", labels);
    const success = value(prefix + "_last_success_timestamp_seconds", labels);
    const result = oneHot("hlog_batch_result", "result", batchResults, { task: key });
    if (state === "ready" && (!attempt || attempt > seconds + 60 || success === null || success > seconds + 60 || result === null)) state = "invalid";
    return { key, state, schedule, lastAttemptAt: state === "ready" ? iso(attempt) : null, lastSuccessAt: state === "ready" ? iso(success) : null, result: state === "ready" ? result : null };
  });
  const costs = (["day", "month"] as const).map(window => {
    let state = sources.find(x => x.key === "db")!.state;
    const labels = { window };
    const knownCost = value("hlog_usage_known_cost_usd", labels), unknownEvents = value("hlog_usage_unknown_events", labels), includedEvents = value("hlog_usage_included_events", labels);
    const budget = oneHot("hlog_usage_budget_state", "state", budgetStates, labels), limit = value("hlog_usage_budget_usd", labels);
    if (state === "ready" && (knownCost === null || unknownEvents === null || !Number.isSafeInteger(unknownEvents) || includedEvents === null || !Number.isSafeInteger(includedEvents) || !budget || (budget === "limited" && (limit === null || limit <= 0)) || (budget === "zero" && limit !== 0))) state = "invalid";
    return { window, state, knownCost: state === "ready" ? knownCost : null, unknownEvents: state === "ready" ? unknownEvents : null, includedEvents: state === "ready" ? includedEvents : null, budget: state === "ready" ? budget : null, limit: state === "ready" && (budget === "limited" || budget === "zero") ? limit : null };
  });
  return { observedAt: new Date(now).toISOString(), services, sources, tasks, costs };
}

export async function readAdminMonitoring(origin?: string): Promise<{
  connection: "unconfigured" | "error" | "ready";
  observedAt: string;
  data: ReturnType<typeof projectMonitoring> | null;
}> {
  const now = Date.now(), observedAt = new Date(now).toISOString();
  if (!origin) return { connection: "unconfigured", observedAt, data: null };
  try {
    const url = new URL(origin);
    // Only the private Compose service or an explicit loopback tunnel is supported.
    // This origin is server configuration; no request input reaches the query.
    if (url.origin !== origin || url.protocol !== "http:" || url.username || url.password || !["prometheus", "localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw invalidResponse();
    url.pathname = "/api/v1/query";
    url.search = new URLSearchParams({ query: monitoringQuery, time: String(now / 1000), timeout: "2s" }).toString();
    const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3000) });
    if (!response.ok || !response.body) throw invalidResponse();
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 128 * 1024) throw invalidResponse();
        chunks.push(chunk.value);
      }
    } finally { await reader.cancel(); }
    const data = projectMonitoring(JSON.parse(Buffer.concat(chunks).toString("utf8")), now);
    return { connection: "ready", observedAt, data };
  } catch { return { connection: "error", observedAt, data: null }; }
}
