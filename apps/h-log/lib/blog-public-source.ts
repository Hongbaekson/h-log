import { cache } from "react";
import pg from "pg";

import {
  createPostgresBlogRepository,
  type PostgresBlogRepository,
} from "./blog-postgres-repository.ts";
import type { BlogContentStore } from "./blog-public.ts";
import {
  createPostgresBlogUsageLedger,
  type BlogUsageLedger,
} from "./blog-usage-ledger.ts";
import { createBlogPrivacyScanPolicyFromEnvironment } from "./blog-privacy-scanner.ts";

const { Pool } = pg;

type BlogPublicRepository = Pick<
  PostgresBlogRepository,
  "findPublicBlogContent"
>;

type BlogPoolGlobal = typeof globalThis & {
  hlogBlogPublicPool?: pg.Pool;
};

export function createBlogPublicContentLoader(
  repository: BlogPublicRepository,
): () => Promise<BlogContentStore> {
  return () => repository.findPublicBlogContent();
}

export const loadPublicBlogContentStore = cache(async () => {
  const repository = createPublicBlogRepository();

  return repository.findPublicBlogContent();
});

export const loadPublicBlogContentStoreBySlug = cache(async (slug: string) => {
  const repository = createPublicBlogRepository();

  return repository.findPublicBlogContentBySlug(slug);
});

export async function isPublicBlogSlug(slug: string): Promise<boolean> {
  const store = await createPublicBlogRepository().findPublicBlogContentBySlug(
    slug,
  );

  return store.posts.length > 0;
}

export function getBlogUsageLedger(): BlogUsageLedger {
  return createPostgresBlogUsageLedger(getBlogPublicPool());
}

function getBlogPublicPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for the public blog read path");
  }

  const sharedGlobal = globalThis as BlogPoolGlobal;

  if (!sharedGlobal.hlogBlogPublicPool) {
    sharedGlobal.hlogBlogPublicPool = new Pool({ connectionString });
  }

  return sharedGlobal.hlogBlogPublicPool;
}

function createPublicBlogRepository(): PostgresBlogRepository {
  return createPostgresBlogRepository(getBlogPublicPool(), {
    privacyScanPolicy: createBlogPrivacyScanPolicyFromEnvironment(process.env),
  });
}
