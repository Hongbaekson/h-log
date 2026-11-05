import assert from "node:assert/strict";
import test from "node:test";
import { parseBrainDraft, toPublicBrainNode } from "./brain-capture.ts";

const draft = {
  title: "나만 보는 제목", originalText: "비공개 원문과 당시 생각",
  publicTitle: "다시 살펴볼 질문", publicSummary: "공개해도 되는 요약", publicBody: "공개용으로 따로 적은 내용\n\n다음 문단",
  kind: "question", topic: "reliability", basis: "question", tags: ["복구"],
};
test("provenance survives private capture and is normalized only in the selected public copy", () => {
  const input = { ...draft, sources: [
    { label: "  공식 문서  ", href: " https://example.com/guide#retry " },
    { label: "이력서", href: " /resume " },
    { label: "링크 없는 기록", href: "  " },
  ], questions: ["  다시 실패하면\n어디서 이어갈까?  ", "<b>검증할 조건</b>"] };
  const saved = parseBrainDraft(input);
  assert.deepEqual(saved, input);
  const node = toPublicBrainNode(saved, "note-example", "2026-11-06");
  assert.deepEqual(node.sources, [
    { label: "공식 문서", href: "https://example.com/guide#retry" },
    { label: "이력서", href: "/resume" }, { label: "링크 없는 기록" },
  ]);
  assert.deepEqual(node.questions, ["다시 실패하면\n어디서 이어갈까?", "<b>검증할 조건</b>"]);
  node.sources[0].label = "공개 사본의 별도 값";
  node.questions.push("추가 질문");
  assert.deepEqual(saved, input);
});

test("provenance rejects malformed fields, duplicate display keys and unsafe URLs", () => {
  const source = { label: "공식 문서", href: "https://example.com/guide" };
  const badUrls = ["/resume?download=1", "/portfolio", "/portfolio/backend-notes#detail", "/blog/example",
    "/brain/example", "/admin/brain", "/api/search", "//example.com/path", "http://example.com",
    "javascript:alert(1)", "data:text/plain,hi", "file:///private/note", "https://user:pass@example.com",
    "https://localhost", "https://127.0.0.1", "https://10.0.0.1", "https://service.internal", "https://[::1]"];
  const patches = [
    { sources: null }, { sources: {} }, { sources: [null] }, { sources: [[]] }, { sources: [{}] },
    { sources: [{ ...source, extra: "private" }] }, { sources: [{ ...source, label: 1 }] },
    ...["", "  ", "x\0", "가".repeat(161)].map(label => ({ sources: [{ ...source, label }] })),
    ...[null, 1, "x\0", " ".repeat(2049), ...badUrls].map(href => ({ sources: [{ ...source, href }] })),
    { sources: [source, { label: " 공식 문서 ", href: "/resume" }] },
    { sources: Array.from({ length: 13 }, (_, i) => ({ label: `출처 ${i}` })) },
    ...[null, {}, [1], [""], ["  "], ["x\0"], ["가".repeat(301)], ["질문", " 질문 "]].map(questions => ({ questions })),
    { questions: Array.from({ length: 13 }, (_, i) => `질문 ${i}`) },
  ];
  for (const patch of patches) assert.throws(() => parseBrainDraft({ ...draft, ...patch }), /^Error: invalid_draft$/);
});

test("provenance accepts exact limits and preserves omission versus explicit empty lists", () => {
  const href = "https://example.com/" + "a".repeat(2048 - "https://example.com/".length);
  const input = { ...draft,
    sources: Array.from({ length: 12 }, (_, i) => ({ label: String(i).padStart(160, "가"), href })),
    questions: Array.from({ length: 12 }, (_, i) => String(i).padStart(300, "가")),
  };
  assert.deepEqual(parseBrainDraft(input), input);
  assert.throws(() => parseBrainDraft({ ...input, sources: [{ label: "출처", href: href + "a" }] }), /invalid_draft/);
  const old = parseBrainDraft(draft);
  assert.deepEqual(old, draft);
  assert(!Object.hasOwn(old, "sources") && !Object.hasOwn(old, "questions"));
  assert.deepEqual(toPublicBrainNode(old, "note-example", "2026-11-06").sources, [{ label: "작성자가 직접 정리한 공개 메모" }]);
  const empty = toPublicBrainNode(parseBrainDraft({ ...draft, sources: [], questions: [] }), "note-example", "2026-11-06");
  assert.deepEqual(empty.sources, []); assert.deepEqual(empty.questions, []);
  for (const url of ["/resume", "/portfolio/backend-notes", "https://example.com", "", "  "]) {
    assert.doesNotThrow(() => parseBrainDraft({ ...draft, sources: [{ label: "출처", href: url }] }));
  }
});

test("private provenance is checked for privacy only when making the public copy", () => {
  const policy = { restrictedTerms: [{ category: "organization_name" as const, value: "Restricted Organization" }] };
  for (const text of ["D:\\private\\note.txt", "someone@example.com", "secret=abcdefghijk", "Restricted Organization"]) {
    for (const patch of [{ sources: [{ label: text }] }, { questions: [text] }]) {
      const saved = parseBrainDraft({ ...draft, ...patch });
      assert.throws(() => toPublicBrainNode(saved, "note-example", "2026-11-06", policy), /^Error: public_copy_blocked$/);
    }
  }
  const saved = parseBrainDraft({ ...draft, sources: [{ label: "출처", href: "https://example.com/?secret=abcdefghijk" }] });
  assert.throws(() => toPublicBrainNode(saved, "note-example", "2026-11-06"), /public_copy_blocked/);
});

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
