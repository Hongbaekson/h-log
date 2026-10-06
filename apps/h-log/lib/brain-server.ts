import "server-only";
import { cache } from "react";
import pg from "pg";
import { brainCatalog } from "./brain-catalog.ts";
import { selectPublicBrain } from "./brain.ts";
import { createBrainRepository } from "./brain-postgres-repository.ts";
import { createBlogPrivacyScanPolicyFromEnvironment } from "./blog-privacy-scanner.ts";

export function getBrainRepository() {
  if (process.env.HLOG_BRAIN_DATABASE_ENABLED !== "1" || !process.env.DATABASE_URL) throw new Error("storage_unavailable");
  const shared = globalThis as typeof globalThis & { hlogBrainPool?: pg.Pool };
  shared.hlogBrainPool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return createBrainRepository(shared.hlogBrainPool, createBlogPrivacyScanPolicyFromEnvironment(process.env));
}

export const loadPublicBrain = cache(async () => {
  const graph = selectPublicBrain(brainCatalog);
  if (process.env.HLOG_BRAIN_DATABASE_ENABLED !== "1") return graph;
  const nodes = await getBrainRepository().findPublicNodes();
  return { nodes: [...graph.nodes, ...nodes], edges: graph.edges };
});
