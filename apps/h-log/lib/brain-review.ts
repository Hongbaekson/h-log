export const brainReviewStatusLabels = { unreviewed: "미검토", needs_review: "확인 필요", confirmed: "확인 완료" };
export const brainReviewReasonLabels = { questions: "남겨 둔 질문", unlinked: "연결 없음", manual: "직접 지정", version_changed: "버전 변경" };
export const brainReviewFilterLabels = { attention: "확인 대기", ...brainReviewStatusLabels, all: "전체" };
export type BrainReviewInput = { result: "needs_review" | "confirmed"; memo: string };
export type BrainReviewEntry = BrainReviewInput & { revision: number; commandRevision: number; recordedAt: string };
export type BrainReviewStatus = keyof typeof brainReviewStatusLabels;
export type BrainReviewQuery = { status: keyof typeof brainReviewFilterLabels; reason: "all" | keyof typeof brainReviewReasonLabels; after: string | null };
export type BrainReviewItem = { id: string; title: string; revision: number; commandRevision: number; publishedRevision: number | null; status: BrainReviewStatus; reasons: (keyof typeof brainReviewReasonLabels)[]; checkedAt: string | null };
export type BrainReviewQueue = { notes: BrainReviewItem[]; nextCursor: string | null };
export type BrainReviewDetail = { status: BrainReviewStatus; checkedAt: string | null; history: BrainReviewEntry[]; hasMore: boolean };

export function parseBrainReview(input: unknown): BrainReviewInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_review");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== 2 || !["needs_review", "confirmed"].includes(value.result as string)
    || typeof value.memo !== "string" || value.memo.length > 500 || value.memo.includes("\0")
    || (value.result === "needs_review" && !value.memo.trim())) throw new Error("invalid_review");
  return { result: value.result as BrainReviewInput["result"], memo: value.memo };
}

export function parseBrainReviewQuery(params: URLSearchParams): BrainReviewQuery {
  const invalid = () => { throw new Error("invalid_review_query"); };
  for (const key of params.keys()) if (!["view", "status", "reason", "after"].includes(key) || params.getAll(key).length !== 1) invalid();
  const status = params.get("status") ?? "attention", reason = params.get("reason") ?? "all", after = params.get("after");
  if (params.has("view") && params.get("view") !== "review" || !Object.hasOwn(brainReviewFilterLabels, status)
    || reason !== "all" && !Object.hasOwn(brainReviewReasonLabels, reason)
    || after !== null && !/^note-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(after)) invalid();
  return { status: status as BrainReviewQuery["status"], reason: reason as BrainReviewQuery["reason"], after };
}

export function brainReviewDetail(revision: number, rows: BrainReviewEntry[]): BrainReviewDetail {
  const latest = rows[0];
  const status = !latest ? "unreviewed" : latest.revision === revision ? latest.result : "needs_review";
  return { status, checkedAt: status === "confirmed" ? latest.recordedAt : null, history: rows.slice(0, 20), hasMore: rows.length > 20 };
}
