import "server-only";
import { cache } from "react";
import pg from "pg";
import { brainCatalog } from "./brain-catalog.ts";
import { selectPublicBrain } from "./brain.ts";
import { createBrainRepository, readPublishedBrainGraph } from "./brain-postgres-repository.ts";
import { createBlogPrivacyScanPolicyFromEnvironment } from "./blog-privacy-scanner.ts";
import { getBlogPublicPool, publicBlogProjectionContext } from "./blog-public-source.ts";
import { resolveBrainBlogTitles } from "./brain-blog-sources.ts";
import { withBlogReadSnapshot } from "./public-blog-projection.ts";
import { readBlogTitles } from "./public-blog-detail.ts";
import { resolvePublicSiteOrigin } from "./public-site-origin.ts";

export function getBrainRepository() {
  if (process.env.HLOG_BRAIN_DATABASE_ENABLED !== "1" || !process.env.DATABASE_URL) throw new Error("storage_unavailable");
  const shared = globalThis as typeof globalThis & { hlogBrainPool?: pg.Pool };
  shared.hlogBrainPool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return createBrainRepository(shared.hlogBrainPool, createBlogPrivacyScanPolicyFromEnvironment(process.env), selectPublicBrain(brainCatalog));
}

export const loadPublicBrain = cache(async () => {
  const origin = process.env.HLOG_PUBLIC_BASE_URL ? resolvePublicSiteOrigin(process.env.HLOG_PUBLIC_BASE_URL) : undefined;
  if (process.env.HLOG_BRAIN_DATABASE_ENABLED !== "1") {
    return resolveBrainBlogTitles(selectPublicBrain(brainCatalog), slugs =>
      withBlogReadSnapshot(getBlogPublicPool(), client => readBlogTitles(client, slugs, publicBlogProjectionContext())), origin);
  }
  return withBlogReadSnapshot(getBlogPublicPool(), async client => {
    const context = publicBlogProjectionContext();
    const graph = await readPublishedBrainGraph(client, context.policy, selectPublicBrain(brainCatalog));
    return resolveBrainBlogTitles(graph, slugs => readBlogTitles(client, slugs, context), origin);
  });
});
