import { handleResumeDownload } from "@/lib/resume-pdf-download";
import { getResumeRepository } from "@/lib/resume-pdf-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = (request: Request) => handleResumeDownload(request, getResumeRepository);
export const HEAD = GET;
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
export const OPTIONS = GET;
