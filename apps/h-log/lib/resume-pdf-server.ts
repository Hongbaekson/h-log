import "server-only";
import pg from "pg";
import { createResumeRepository } from "./resume-pdf-repository.ts";

export function getResumeRepository() {
  if (process.env.HLOG_RESUME_PDF_ENABLED !== "1" || !process.env.DATABASE_URL) throw new Error("storage_unavailable");
  const shared = globalThis as typeof globalThis & { hlogResumePool?: pg.Pool };
  if (!shared.hlogResumePool) {
    shared.hlogResumePool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 5000 });
    shared.hlogResumePool.on("error", () => console.warn("Resume PDF storage connection interrupted."));
  }
  return createResumeRepository(shared.hlogResumePool);
}
