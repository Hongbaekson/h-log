import { brainKindLabels, brainTopics, searchBrainNodes, type BrainGraph, type BrainNode } from "./brain.ts";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNode } from "d3-force-3d";

export type BrainLayout = "brain" | "free" | "topics" | "hierarchy" | "timeline";
export type PositionedBrainNode = BrainNode & { x: number; y: number; z: number; degree: number };
export type BrainFilters = { query?: string; topic?: string; tag?: string; kinds?: string[]; relations?: string[]; basis?: string };

// Stable animation phases use only public note IDs.
function hash(value: string) {
  let out = 2166136261;
  for (let i = 0; i < value.length; i++) { out ^= value.charCodeAt(i); out = Math.imul(out, 16777619); }
  return out >>> 0;
}
export function brainUnit(id: string, salt: number) { return (hash(`${id}.${salt}`) % 10000) / 10000; }

export function layoutBrainGraph(graph: BrainGraph, layout: BrainLayout, spread: number): PositionedBrainNode[] {
  if (!graph.nodes.length) return [];
  const kinds = Object.keys(brainKindLabels);
  const topics = Object.keys(brainTopics);
  const dates = [...new Set(graph.nodes.map(node => node.recordedAt))].sort();
  type LayoutNode = BrainNode & SimulationNode;
  // d3 mutates nodes and resolves link endpoints in place; keep those copies local.
  const nodes: LayoutNode[] = graph.nodes.map(node => ({ ...node }));
  const links = graph.edges.map(edge => ({ source: edge.from, target: edge.to }));
  if (layout === "timeline") {
    for (const node of nodes) {
      const group = nodes.filter(item => item.recordedAt === node.recordedAt);
      node.x = (dates.indexOf(node.recordedAt) - (dates.length - 1) / 2) * 220;
      node.y = (group.indexOf(node) - (group.length - 1) / 2) * 45;
    }
  } else {
    const brain = layout === "brain";
    const simulation = forceSimulation(nodes, brain ? 3 : 2).stop()
      .force("link", forceLink<LayoutNode>(links).id(node => node.id).distance(brain ? 30 * spread : 70).strength(brain ? .5 : .35))
      .force("charge", forceManyBody<LayoutNode>().strength(brain ? -60 * spread : layout === "free" ? -220 : -130))
      .force("center", forceCenter<LayoutNode>(0, 0, 0))
      .force("collide", forceCollide<LayoutNode>(brain ? 5 : 14));
    if (layout === "topics") {
      const angle = (node: LayoutNode) => topics.indexOf(node.topic) / topics.length * Math.PI * 2 - Math.PI / 2;
      simulation.force("topic-x", forceX<LayoutNode>(node => Math.cos(angle(node)) * 240).strength(.18))
        .force("topic-y", forceY<LayoutNode>(node => Math.sin(angle(node)) * 240).strength(.18));
    } else if (layout === "hierarchy") {
      simulation.force("lane-y", forceY<LayoutNode>(node => (kinds.indexOf(node.kind) - (kinds.length - 1) / 2) * 120).strength(.8));
    }
    // The fixed d3 random source and tick count make reset and reduced motion stable.
    simulation.tick(250);
  }
  return graph.nodes.map((node, index) => {
    const p = nodes[index], scale = layout === "brain" ? 1 : spread;
    return { ...node, x: p.x! * scale, y: p.y! * scale, z: layout === "brain" ? p.z! : 0,
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
