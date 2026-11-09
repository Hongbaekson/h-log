import "server-only";
import { cache } from "react";
import pg from "pg";
import { brainCatalog } from "./brain-catalog.ts";
import { selectPublicBrain } from "./brain.ts";
import { createBrainRepository } from "./brain-postgres-repository.ts";
import { createBlogPrivacyScanPolicyFromEnvironment } from "./blog-privacy-scanner.ts";
import { loadPublicBlogContentStore } from "./blog-public-source.ts";
import { resolveBrainBlogSources } from "./brain-blog-sources.ts";
import { resolvePublicSiteOrigin } from "./public-site-origin.ts";

export function getBrainRepository() {
  if (process.env.HLOG_BRAIN_DATABASE_ENABLED !== "1" || !process.env.DATABASE_URL) throw new Error("storage_unavailable");
  const shared = globalThis as typeof globalThis & { hlogBrainPool?: pg.Pool };
  shared.hlogBrainPool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return createBrainRepository(shared.hlogBrainPool, createBlogPrivacyScanPolicyFromEnvironment(process.env), selectPublicBrain(brainCatalog));
}

export const loadPublicBrain = cache(async () => {
  const graph = process.env.HLOG_BRAIN_DATABASE_ENABLED === "1"
    ? await getBrainRepository().findPublicGraph() : selectPublicBrain(brainCatalog);
  const origin = process.env.HLOG_PUBLIC_BASE_URL ? resolvePublicSiteOrigin(process.env.HLOG_PUBLIC_BASE_URL) : undefined;
  return resolveBrainBlogSources(graph, loadPublicBlogContentStore, origin);
});
