import assert from "node:assert/strict";
import { it } from "node:test";
import { brainCatalog } from "./brain-catalog.ts";
import { selectPublicBrain } from "./brain.ts";
import { layoutBrainGraph, filterBrainGraph } from "./brain-layout.ts";

const graph = selectPublicBrain(brainCatalog);

it("lays out the real connections in three dimensions without mutating the public catalog", () => {
  const before = JSON.stringify(graph);
  const result = layoutBrainGraph(graph, "brain", 1);
  assert.equal(result.length, graph.nodes.length);
  assert.equal(JSON.stringify(graph), before);
  assert.deepEqual(result, layoutBrainGraph(graph, "brain", 1));
  assert.ok(result.every(n => [n.x, n.y, n.z].every(Number.isFinite)));
  assert.ok(new Set(result.map(n => Math.round(n.z))).size > 5);
  assert.ok(new Set(result.map(n => `${n.x},${n.y},${n.z}`)).size === result.length);
  for (const node of result) {
    assert.equal(node.degree, graph.edges.filter(e => e.from === node.id || e.to === node.id).length);
  }
});

it("provides distinct planar layouts and widens spacing without fabricating nodes", () => {
  const layouts = ["free", "topics", "hierarchy", "timeline"] as const;
  const shapes = layouts.map(layout => layoutBrainGraph(graph, layout, 1));
  assert.equal(new Set(shapes.map(shape => JSON.stringify(shape))).size, layouts.length);
  for (const shape of shapes) {
    assert.ok(shape.every(n => n.z === 0 && Number.isFinite(n.x) && Number.isFinite(n.y)));
    assert.equal(shape.length, graph.nodes.length);
  }
  const normal = layoutBrainGraph(graph, "brain", 1);
  const wide = layoutBrainGraph(graph, "brain", 1.5);
  assert.ok(wide.reduce((sum,n) => sum + Math.hypot(n.x,n.y,n.z),0) > normal.reduce((sum,n) => sum + Math.hypot(n.x,n.y,n.z),0));
  assert.deepEqual(layoutBrainGraph({nodes:[],edges:[]}, "brain", 1), []);
  assert.equal(layoutBrainGraph({nodes:graph.nodes.slice(0,1),edges:[]}, "hierarchy", 1).length, 1);
});

it("combines search, tag, kind and relation filters while keeping only matching edge endpoints", () => {
  const result = filterBrainGraph(graph, { query: "Redis", kinds: ["question"], relations: ["questions"] });
  assert.ok(result.nodes.length > 0);
  assert.ok(result.nodes.every(n => n.kind === "question"));
  const ids = new Set(result.nodes.map(n => n.id));
  assert.ok(result.edges.every(e => e.relation === "questions" && ids.has(e.from) && ids.has(e.to)));
  const tag = graph.nodes[0].tags[0];
  assert.deepEqual(filterBrainGraph(graph, {tag}).nodes.map(n => n.id), graph.nodes.filter(n => n.tags.includes(tag)).map(n => n.id));
  assert.equal(filterBrainGraph(graph, {query:"no-such-note-918723"}).nodes.length, 0);
  assert.deepEqual(filterBrainGraph(graph, {}), graph);
});
