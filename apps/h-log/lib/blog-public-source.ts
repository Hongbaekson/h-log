import { cache } from "react";
import pg from "pg";

import {
  createPostgresBlogRepository,
  type PostgresBlogRepository,
} from "./blog-postgres-repository.ts";
import {
  createPostgresBlogUsageLedger,
  type BlogUsageLedger,
} from "./blog-usage-ledger.ts";
import { createBlogPrivacyScanPolicyFromEnvironment } from "./blog-privacy-scanner.ts";
import { verifyBlogThumbnailFiles } from "./blog-thumbnails.ts";
import { readPublicBlogList } from "./public-blog-list.ts";
import { projectionContext } from "./public-read-model.ts";
import { readPublicBlogDetail, readProjectRelatedPosts } from "./public-blog-detail.ts";

import { readCrawlerResponse } from "./public-crawler.ts";
import { resolvePublicSiteOrigin } from "./public-site-origin.ts";
import type { PostPublishCrawlerOutputName } from "./blog-post-publish-verification.ts";

const { Pool } = pg;

type BlogPoolGlobal = typeof globalThis & {
  hlogBlogPublicPool?: pg.Pool;
};

export const loadPublicBlogContentStore = cache(async () => {
  const repository = createPublicBlogRepository();

  return verifyBlogThumbnailFiles(await repository.findPublicBlogContent());
});

// Primitive arguments let metadata and page share the same result within one render.
export const loadPublicBlogIndex = cache(async (page: number, tag?: string, pageSize = 6) =>
  readPublicBlogList(getBlogPublicPool(), { page, tag, pageSize }, publicBlogProjectionContext()),
);

export const publicBlogProjectionContext = () => projectionContext(createBlogPrivacyScanPolicyFromEnvironment(process.env));
export const loadPublicBlogDetail = cache((slug: string) => readPublicBlogDetail(getBlogPublicPool(), slug, publicBlogProjectionContext()));
export const loadProjectRelatedPosts = cache((slug: string) => readProjectRelatedPosts(getBlogPublicPool(), slug, publicBlogProjectionContext()));

export const loadPublicBlogContentStoreBySlug = cache(async (slug: string) => {
  const repository = createPublicBlogRepository();

  return verifyBlogThumbnailFiles(await repository.findPublicBlogContentBySlug(slug));
});

export function getBlogUsageLedger(): BlogUsageLedger {
  return createPostgresBlogUsageLedger(getBlogPublicPool());
}

export function getBlogPublicPool(): pg.Pool {
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

export async function publicCrawlerResponse(name: PostPublishCrawlerOutputName, request: Request) {
  try {
    return await readCrawlerResponse(getBlogPublicPool(), name, resolvePublicSiteOrigin(request.url), publicBlogProjectionContext(),
      { signal: request.signal });
  } catch {
    console.error("public_crawler_unavailable", name);
    return new Response("Internal Server Error\n", { status: 500, headers: { "cache-control": "private, no-store" } });
  }
}
