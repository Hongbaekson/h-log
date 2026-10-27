import "server-only";
import pg from "pg";
import { requireAdminOwner } from "./admin-server";
import { readAdminPosts, type AdminPostReviewQuery } from "./blog-admin-review.ts";
import { createBlogEditorialRepository } from "./blog-editorial-actions.ts";
import type { EditorialCommand } from "./blog-editorial-command.ts";

export async function loadAdminPosts(query: AdminPostReviewQuery) {
  await requireAdminOwner();
  return readAdminPosts(getPool(), query);
}
export async function executeEditorialCommand(command: EditorialCommand) {
  await requireAdminOwner();
  return createBlogEditorialRepository(getPool(), { publishEnabled: process.env.HLOG_BLOG_MANUAL_PUBLISH_ENABLED === "1" }).execute(command);
}
function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("storage_unavailable");
  const shared = globalThis as typeof globalThis & { hlogAdminReviewPool?: pg.Pool };
  if (!shared.hlogAdminReviewPool) {
    shared.hlogAdminReviewPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 3000, statement_timeout: 5000, query_timeout: 6000 });
    shared.hlogAdminReviewPool.on("error", () => console.warn("Admin review storage connection interrupted."));
  }
  return shared.hlogAdminReviewPool;
}
