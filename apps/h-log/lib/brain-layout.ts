import { brainKindLabels, brainTopics, searchBrainNodes, type BrainGraph, type BrainNode } from "./brain.ts";

export type BrainLayout = "brain" | "free" | "topics" | "hierarchy" | "timeline";
export type PositionedBrainNode = BrainNode & { x: number; y: number; z: number; degree: number };
export type BrainFilters = { query?: string; topic?: string; tag?: string; kinds?: string[]; relations?: string[]; basis?: string };

// The local UI's deterministic constellation; only public note IDs enter the seed.
function hash(value: string) {
  let out = 2166136261;
  for (let i = 0; i < value.length; i++) { out ^= value.charCodeAt(i); out = Math.imul(out, 16777619); }
  return out >>> 0;
}
export function brainUnit(id: string, salt: number) { return (hash(`${id}.${salt}`) % 10000) / 10000; }

function constellationPoint(id: string, index: number, total: number) {
  const seed = hash(id);
  const t = ((index + .5) / Math.max(1, total) + brainUnit(id, 1) * .18) % 1;
  const band = (t - .5) * 2;
  const taper = Math.max(.34, 1 - Math.abs(band) * .44);
  const twist = band * Math.PI * 2.4 + brainUnit(id, 2) * Math.PI * 2;
  return {
    x: Math.sin(twist) * (72 + seed % 70) * taper + (brainUnit(id, 3) - .5) * 350 * taper,
    y: band * 360 + (brainUnit(id, 4) - .5) * 58,
    z: Math.cos(twist * .78) * (82 + seed % 55) * taper + (brainUnit(id, 5) - .5) * 340 * taper,
  };
}

export function layoutBrainGraph(graph: BrainGraph, layout: BrainLayout, spread: number): PositionedBrainNode[] {
  const kinds = Object.keys(brainKindLabels);
  const topics = Object.keys(brainTopics);
  const dates = [...new Set(graph.nodes.map(node => node.recordedAt))].sort();
  return graph.nodes.map((node, index) => {
    let p = constellationPoint(layout === "free" ? node.id : `brain.${node.id}`, index, graph.nodes.length);
    if (layout === "hierarchy") {
      const order = kinds.indexOf(node.kind);
      const group = graph.nodes.filter(item => item.kind === node.kind);
      p = { x: (order / (kinds.length - 1) - .5) * 760, y: (group.indexOf(node) - (group.length - 1) / 2) * 54, z: (order % 3 - 1) * 80 };
    } else if (layout === "topics") {
      const angle = index / graph.nodes.length * Math.PI * 2;
      p = { x: Math.cos(angle) * 230, y: (topics.indexOf(node.topic) - (topics.length - 1) / 2) * 80 + Math.sin(angle) * 44, z: Math.sin(angle) * 230 };
    } else if (layout === "timeline") {
      // Use actual recording dates; never turn catalog order into an invented chronology.
      const group = graph.nodes.filter(item => item.recordedAt === node.recordedAt);
      p = { x: (dates.indexOf(node.recordedAt) - (dates.length - 1) / 2) * 220, y: (group.indexOf(node) - (group.length - 1) / 2) * 45, z: 0 };
    }
    return { ...node, x: p.x * spread, y: p.y * spread, z: p.z * spread,
      degree: graph.edges.filter(edge => edge.from === node.id || edge.to === node.id).length };
  });
}

export function filterBrainGraph(graph: BrainGraph, filters: BrainFilters): BrainGraph {
  const nodes = searchBrainNodes(graph, filters).filter(node =>
    (!filters.tag || node.tags.includes(filters.tag)) &&
    (!filters.kinds?.length || filters.kinds.includes(node.kind)) &&
    (!filters.basis || node.basis === filters.basis));
  const ids = new Set(nodes.map(node => node.id));
  return { nodes, edges: graph.edges.filter(edge => ids.has(edge.from) && ids.has(edge.to) &&
    (!filters.relations?.length || filters.relations.includes(edge.relation))) };
}
