import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, forceZ } from "d3-force-3d";
import { brainTopics, searchBrainNodes, type BrainGraph, type BrainNode } from "./brain.ts";

export type BrainLayout = "brain" | "free" | "topics" | "hierarchy" | "timeline";
export type PositionedBrainNode = BrainNode & { x: number; y: number; z: number; degree: number };
export type BrainFilters = { query?: string; topic?: string; tag?: string; kinds?: string[]; relations?: string[]; basis?: string };

export function layoutBrainGraph(graph: BrainGraph, layout: BrainLayout, spread: number): PositionedBrainNode[] {
  if (!graph.nodes.length) return [];
  const nodes = graph.nodes.map((node, index) => {
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    const depth = 1 - 2 * (index + .5) / graph.nodes.length;
    const radius = layout === "brain" ? 80 * Math.sqrt(1 - depth * depth) : 25 * Math.sqrt(index + 1);
    return { ...node, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
      z: layout === "brain" ? depth * 80 : 0,
      degree: graph.edges.filter(edge => edge.from === node.id || edge.to === node.id).length };
  });
  const links = graph.edges.map(edge => ({ source: edge.from, target: edge.to }));
  const simulation = forceSimulation(nodes, layout === "brain" ? 3 : 2).stop()
    .force("link", forceLink(links).id(node => node.id).distance(70).strength(.45))
    .force("charge", forceManyBody().strength(-280))
    .force("center", forceCenter())
    .force("collision", forceCollide(22));

  if (layout === "brain") {
    simulation.force("x", forceX(() => 0).strength(.04))
      .force("y", forceY(() => 0).strength(.04))
      .force("z", forceZ(() => 0).strength(.04));
  }

  if (layout === "topics") {
    const topics = Object.keys(brainTopics);
    const targets = new Map(nodes.map(node => {
      const angle = topics.indexOf(node.topic) / topics.length * Math.PI * 2;
      return [node.id, { x: Math.cos(angle) * 240, y: Math.sin(angle) * 240 }];
    }));
    simulation.force("x", forceX(node => targets.get(node.id)!.x).strength(.7))
      .force("y", forceY(node => targets.get(node.id)!.y).strength(.7));
  }

  if (layout === "hierarchy") {
    // Distance from the most-connected note, not an invented causal hierarchy.
    const root = [...nodes].sort((a,b) => b.degree - a.degree)[0];
    const depths = new Map([[root.id, 0]]);
    const queue = [root.id];
    for (const id of queue) {
      for (const edge of graph.edges.filter(edge => edge.from === id || edge.to === id)) {
        const next = edge.from === id ? edge.to : edge.from;
        if (!depths.has(next)) { depths.set(next, depths.get(id)! + 1); queue.push(next); }
      }
    }
    simulation.force("y", forceY(node => (depths.get(node.id) ?? 5) * -110).strength(1));
  }

  simulation.tick(240);
  if (layout === "timeline") {
    const dates = [...new Set(nodes.map(node => node.recordedAt))].sort();
    dates.forEach((date, dateIndex) => {
      const group = nodes.filter(node => node.recordedAt === date).sort((a,b) => a.id.localeCompare(b.id));
      group.forEach((node, index) => {
        node.x = (dateIndex - (dates.length - 1) / 2) * 220;
        node.y = ((group.length - 1) / 2 - index) * 45;
      });
    });
  }
  const center = nodes.reduce((sum,node) => ({x:sum.x + node.x/nodes.length, y:sum.y + node.y/nodes.length, z:sum.z + node.z/nodes.length}), {x:0,y:0,z:0});
  return nodes.map(node => ({ ...node, x:(node.x-center.x)*spread, y:(node.y-center.y)*spread, z:layout === "brain" ? (node.z-center.z)*spread : 0 }));
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
