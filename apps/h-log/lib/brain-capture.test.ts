import assert from "node:assert/strict";
import test from "node:test";
import { parseBrainDraft, toPublicBrainNode } from "./brain-capture.ts";

const draft = {
  title: "나만 보는 제목", originalText: "비공개 원문과 당시 생각",
  publicTitle: "다시 살펴볼 질문", publicSummary: "공개해도 되는 요약", publicBody: "공개용으로 따로 적은 내용\n\n다음 문단",
  kind: "question", topic: "reliability", basis: "question", tags: ["복구"],
};
test("capture preserves the original while public projection contains only separately written fields", () => {
  const saved = parseBrainDraft(draft);
  assert.equal(saved.originalText, draft.originalText);
  const node = toPublicBrainNode(saved, "note-example", "2026-10-07");
  assert.equal(node.title, draft.publicTitle);
  assert.deepEqual(node.sections[0].paragraphs, ["공개용으로 따로 적은 내용", "다음 문단"]);
  assert.doesNotMatch(JSON.stringify(node), /나만 보는|비공개 원문|originalText|publicBody/);
});

test("private-only drafts may be saved but cannot be published without a complete public copy", () => {
  const saved = parseBrainDraft({ ...draft, publicTitle: "", publicSummary: "", publicBody: "" });
  assert.equal(saved.originalText, draft.originalText);
  assert.throws(() => toPublicBrainNode(saved, "note-example", "2026-10-07"), /public_copy_required/);
});

test("event dates and reflection links need explicit public consent and valid values", () => {
  const input = { ...draft, occurredOn: "2025-04-03", shareOccurredOn: false,
    links: [{ target: "prior-thought", relation: "revises", reason: "다시 읽고 생각이 달라졌다." }] };
  const saved = parseBrainDraft(input);
  assert.equal(saved.occurredOn, "2025-04-03");
  assert.equal(toPublicBrainNode(saved, "new-thought", "2026-10-07").occurredOn, undefined);
  const publicCopy = toPublicBrainNode(parseBrainDraft({ ...input, shareOccurredOn: true }), "new-thought", "2026-10-07");
  assert.equal(publicCopy.occurredOn, "2025-04-03");
  assert.equal(publicCopy.recordedAt, "2026-10-07");
  assert.deepEqual(publicCopy.links, input.links);
  for (const patch of [{ occurredOn: "2025-02-30" }, { occurredOn: "unknown" }, { shareOccurredOn: "yes" },
    { links: [{ target: "../private", relation: "revises", reason: "이유" }] },
    { links: [{ target: "prior-thought", relation: "wrong", reason: "이유" }] },
    { links: [...input.links, ...input.links] }, { links: [{ ...input.links[0], reason: "" }] }]) {
    assert.throws(() => parseBrainDraft({ ...input, ...patch }), /invalid_draft/);
  }
  assert.throws(() => toPublicBrainNode(saved, "prior-thought", "2026-10-07"), /invalid_link/);
});

test("untrusted drafts reject malformed fields and unsafe public copies without echoing their contents", () => {
  for (const invalid of [null, { ...draft, title: "" }, { ...draft, kind: "unknown" }, { ...draft, originalText: "a".repeat(50001) }, { ...draft, tags: [true] }, { ...draft, visibility: "public" }]) {
    assert.throws(() => parseBrainDraft(invalid), /invalid_draft/);
  }
  for (const text of ["secret=abcdefghijklmnop", "http://service.internal/path", "someone@example.com", "D:\\private\\note.txt", "Confidential Demo Organization"]) {
    assert.throws(() => toPublicBrainNode(parseBrainDraft({ ...draft, publicBody: text }), "note-example", "2026-10-07", {
      restrictedTerms: [{ category: "organization_name", value: "Confidential Demo Organization" }],
    }), /^Error: public_copy_blocked$/);
  }
});
