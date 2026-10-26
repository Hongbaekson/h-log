import "server-only";
import pg from "pg";
import { requireAdminOwner } from "./admin-server";
import { readAdminPosts, type AdminPostReviewQuery } from "./blog-admin-review.ts";

export async function loadAdminPosts(query: AdminPostReviewQuery) {
  await requireAdminOwner();
  if (!process.env.DATABASE_URL) throw new Error("storage_unavailable");
  const shared = globalThis as typeof globalThis & { hlogAdminReviewPool?: pg.Pool };
  if (!shared.hlogAdminReviewPool) {
    shared.hlogAdminReviewPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 3000, statement_timeout: 3000, query_timeout: 5000 });
    shared.hlogAdminReviewPool.on("error", () => console.warn("Admin review storage connection interrupted."));
  }
  return readAdminPosts(shared.hlogAdminReviewPool, query);
}
