import assert from "node:assert/strict";
import test from "node:test";
import { brainReviewDetail, parseBrainReview, parseBrainReviewQuery } from "./brain-review.ts";

test("review input preserves exact memo for retries and rejects unsupported or unbounded input", () => {
  assert.deepEqual(parseBrainReview({ result: "confirmed", memo: " 확인 " }), { result: "confirmed", memo: " 확인 " });
  assert.equal(parseBrainReview({ result: "confirmed", memo: "😀".repeat(250) }).memo.length, 500);
  for (const input of [null, [], { result: "confirmed" }, { result: "expired", memo: "" }, { result: "needs_review", memo: " \n " },
    { result: "confirmed", memo: "😀".repeat(251) }, { result: "confirmed", memo: "a\0" }, { result: "confirmed", memo: "", checkedAt: "2020-01-01" }]) {
    assert.throws(() => parseBrainReview(input), /invalid_review/);
  }
});
test("review query validates exact filters and cursors without an expiry filter", () => {
  assert.deepEqual(parseBrainReviewQuery(new URLSearchParams()), { status: "attention", reason: "all", after: null });
  assert.equal(parseBrainReviewQuery(new URLSearchParams("view=review&status=confirmed&reason=questions")).reason, "questions");
  for (const query of ["view=bad", "status=constructor", "reason=__proto__", "status=all&status=all", "id=note-a", "after=", "x=1"]) {
    assert.throws(() => parseBrainReviewQuery(new URLSearchParams(query)), /invalid_review_query/);
  }
});
test("confirmation belongs only to its revision and history is bounded without erasing it", () => {
  assert.equal(brainReviewDetail(1, []).status, "unreviewed");
  const first = { revision: 1, commandRevision: 2, result: "confirmed" as const, memo: "", recordedAt: "2026-11-12T00:00:00Z" };
  assert.equal(brainReviewDetail(1, [first]).checkedAt, first.recordedAt);
  assert.equal(brainReviewDetail(2, [first]).status, "needs_review");
  assert.equal(brainReviewDetail(2, [first]).checkedAt, null);
  assert.equal(brainReviewDetail(1, [{ ...first, result: "needs_review" }]).checkedAt, null);
  const rows = Array.from({ length: 21 }, (_, i) => ({ ...first, commandRevision: 22 - i }));
  assert.equal(brainReviewDetail(1, rows).history.length, 20); assert(brainReviewDetail(1, rows).hasMore);
  assert.equal(rows.length, 21);
});
