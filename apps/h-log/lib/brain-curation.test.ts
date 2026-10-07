import assert from "node:assert/strict";
import test from "node:test";
import { brainCatalog } from "./brain-catalog.ts";
import { selectPublicBrain } from "./brain.ts";
import { mergePublishedBrain, sortBrainNodes } from "./brain-curation.ts";

const base = selectPublicBrain(brainCatalog);
test("public reflection edges survive only while both endpoints remain public", () => {
  const prior = { ...base.nodes[0], id: "prior", occurredOn: "2025-05-01" };
  const later = { ...base.nodes[1], id: "later", links: [
    { target: prior.id, relation: "revises" as const, reason: "판단을 다시 살펴봤다." },
    { target: "private-note", relation: "extends" as const, reason: "PRIVATE_RELATION" },
  ] };
  const graph = mergePublishedBrain(base, [prior, later]);
  assert.equal(graph.nodes.length, 30);
  assert.equal(graph.edges.length, 43);
  assert.equal(graph.nodes.find(n => n.id === "prior")?.occurredOn, "2025-05-01");
  assert.doesNotMatch(JSON.stringify(graph), /PRIVATE_|private-note|"links"/);
  const withdrawn = mergePublishedBrain(base, [later]);
  assert.equal(withdrawn.edges.length, 42);
  assert.doesNotMatch(JSON.stringify(withdrawn), /"prior"|PRIVATE_RELATION/);
  const blocked = mergePublishedBrain(base, [prior, later], { restrictedTerms: [{ category: "organization_name", value: later.title }] });
  assert(!blocked.nodes.some(node => node.id === "later"));
  assert.equal(blocked.edges.length, 42);
});

test("revisit ordering separates event and recording dates without inventing unknown dates", () => {
  const nodes = [
    { ...base.nodes[0], id: "unknown", recordedAt: "2026-10-05" },
    { ...base.nodes[0], id: "early-event", recordedAt: "2026-10-07", occurredOn: "2020-01-01" },
    { ...base.nodes[0], id: "late-event", recordedAt: "2026-10-06", occurredOn: "2025-01-01" },
  ];
  const before = structuredClone(nodes);
  assert.deepEqual(sortBrainNodes(nodes, "event").map(n => n.id), ["early-event", "late-event", "unknown"]);
  assert.deepEqual(sortBrainNodes(nodes, "recorded").map(n => n.id), ["unknown", "late-event", "early-event"]);
  assert.deepEqual(sortBrainNodes(nodes, "recent").map(n => n.id), ["early-event", "late-event", "unknown"]);
  assert.deepEqual(nodes, before);
});
