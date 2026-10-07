import assert from "node:assert/strict";
import test from "node:test";
import type { BrainDraft } from "./brain-capture.ts";
import { suggestBrainLinks } from "./brain-suggestions.ts";
import { brainCatalog } from "./brain-catalog.ts";
import { selectPublicBrain } from "./brain.ts";

const draft: BrainDraft = { title: "Redis 전달 경계", originalText: "PRIVATE_ORIGINAL_SHOULD_NOT_BE_USED", publicTitle: "", publicSummary: "", publicBody: "", kind: "reflection", topic: "reliability", basis: "profile", tags: ["Redis"] };
test("suggestions explain related and duplicate candidates without changing a draft or choosing a relation", () => {
  const candidates = [
    { id: "other", title: "문서 작성", tags: ["글쓰기"], topic: "tools" as const },
    { id: "related", title: "큐의 복구", tags: ["redis", "DLQ"], topic: "reliability" as const },
    { id: "duplicate", title: " REDIS   전달 경계 ", tags: ["Redis", "복구"], topic: "reliability" as const },
    { id: "self", title: draft.title, tags: ["Redis"], topic: "reliability" as const },
    { id: "existing", title: draft.title, tags: ["Redis"], topic: "reliability" as const },
  ];
  const input = { ...draft, links: [{ target: "existing", relation: "extends" as const, reason: "이미 고른 연결" }] };
  const before = structuredClone({ input, candidates });
  const result = suggestBrainLinks(input, candidates, "self");
  assert.deepEqual(result.links.map(item => item.id), ["duplicate", "related"]);
  assert.equal(result.links[0].duplicate, true);
  assert(result.links.every(item => item.reasons.length > 0));
  assert.deepEqual(result.tags.sort(), ["DLQ", "복구"].sort());
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|originalText|"relation"|"visibility"/);
  assert.deepEqual({ input, candidates }, before);
});

test("real approved catalog produces bounded candidates and empty input does not invent suggestions", () => {
  const graph = selectPublicBrain(brainCatalog);
  const result = suggestBrainLinks(draft, graph.nodes);
  assert(result.links.length > 0 && result.links.length <= 5);
  assert(result.tags.length <= 8);
  assert(result.links.every(item => graph.nodes.some(node => node.id === item.id)));
  const tags = new Set(graph.nodes.flatMap(node => node.tags));
  assert(result.tags.every(tag => tags.has(tag)));
  assert.deepEqual(suggestBrainLinks({ ...draft, title: "", tags: [] }, graph.nodes), { links: [], tags: [] });
  const onlyOriginal = { ...draft, title: "zzzzzzzzz", tags: [], topic: "everyday" as const, originalText: "Redis 복구" };
  assert.deepEqual(suggestBrainLinks(onlyOriginal, [{ ...graph.nodes[0], topic: "reliability" }]), { links: [], tags: [] });
});
