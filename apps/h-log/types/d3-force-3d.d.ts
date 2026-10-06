// The package has no published TypeScript definitions. Only the API used by the
// layout is declared here; runtime behavior remains owned by d3-force-3d.
declare module "d3-force-3d" {
  interface Node { id: string; x?: number; y?: number; z?: number }
  interface Force { strength(value: number): Force }
  interface LinkForce extends Force {
    id(accessor: (node: Node) => string): LinkForce;
    distance(value: number): LinkForce;
    strength(value: number): LinkForce;
  }
  interface Simulation<T extends Node> {
    force(name: string, force: Force): Simulation<T>;
    stop(): Simulation<T>;
    tick(iterations: number): Simulation<T>;
  }
  export function forceSimulation<T extends Node>(nodes: T[], dimensions: number): Simulation<T>;
  export function forceLink(links: { source: string; target: string }[]): LinkForce;
  export function forceManyBody(): Force;
  export function forceCenter(x?: number, y?: number, z?: number): Force;
  export function forceCollide(radius: number): Force;
  export function forceX(target: (node: Node) => number): Force;
  export function forceY(target: (node: Node) => number): Force;
  export function forceZ(target: (node: Node) => number): Force;
}
