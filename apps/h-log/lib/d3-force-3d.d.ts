// Public APIs used by the graph layout. d3-force-3d 3.0.6 ships no declarations.
declare module "d3-force-3d" {
  export interface SimulationNode {
    x?: number; y?: number; z?: number;
    vx?: number; vy?: number; vz?: number;
  }
  export interface Force<Node extends SimulationNode> {
    (alpha: number): void;
    initialize?: (nodes: Node[], random: () => number, dimensions: number) => void;
  }
  export interface Simulation<Node extends SimulationNode> {
    force(name: string, force: Force<Node>): this;
    stop(): this;
    tick(iterations: number): this;
  }
  export interface LinkForce<Node extends SimulationNode> extends Force<Node> {
    id(accessor: (node: Node) => string): this;
    distance(distance: number): this;
    strength(strength: number): this;
  }
  export interface StrengthForce<Node extends SimulationNode> extends Force<Node> {
    strength(strength: number): this;
  }
  export function forceSimulation<Node extends SimulationNode>(nodes: Node[], dimensions?: 2 | 3): Simulation<Node>;
  export function forceLink<Node extends SimulationNode>(links: { source: string | Node; target: string | Node }[]): LinkForce<Node>;
  export function forceManyBody<Node extends SimulationNode>(): StrengthForce<Node>;
  export function forceCenter<Node extends SimulationNode>(x?: number, y?: number, z?: number): Force<Node>;
  export function forceCollide<Node extends SimulationNode>(radius: number): Force<Node>;
  export function forceX<Node extends SimulationNode>(target: number | ((node: Node) => number)): StrengthForce<Node>;
  export function forceY<Node extends SimulationNode>(target: number | ((node: Node) => number)): StrengthForce<Node>;
}
