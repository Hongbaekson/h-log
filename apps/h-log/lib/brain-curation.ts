import { selectPublicBrain, type BrainGraph, type BrainNode } from "./brain.ts";
import { assertSafeBrainPublication, type BrainSnapshot } from "./brain-capture.ts";
import type { BlogPrivacyScanPolicy } from "./blog-privacy-scanner.ts";

export type BrainOrder = "recent" | "recorded" | "event";
export function sortBrainNodes<T extends Pick<BrainNode, "id" | "recordedAt" | "occurredOn">>(nodes: T[], order: BrainOrder): T[] {
  return [...nodes].sort((a, b) => {
    const dates = order === "event" ? (a.occurredOn || "9999").localeCompare(b.occurredOn || "9999") : 0;
    return dates || (order === "recent" ? b.recordedAt.localeCompare(a.recordedAt) : a.recordedAt.localeCompare(b.recordedAt)) || a.id.localeCompare(b.id);
  });
}
export function mergePublishedBrain(base: BrainGraph, snapshots: BrainSnapshot[], policy: BlogPrivacyScanPolicy = {}): BrainGraph {
  const safe = snapshots.filter(node => {
    try { assertSafeBrainPublication(node, policy); return true; }
    catch (error) { if (error instanceof Error && error.message === "public_copy_blocked") return false; throw error; }
  });
  return selectPublicBrain({
    nodes: [...base.nodes, ...safe].map(node => ({ ...node, visibility: "public" })),
    edges: [...base.edges, ...safe.flatMap(node => (node.links ?? []).map(link => ({
      from: node.id, to: link.target, relation: link.relation, reason: link.reason,
    })))].map(edge => ({ ...edge, visibility: "public" })),
  });
}
