import { handleResumeRequest } from "@/lib/resume-pdf-http";
import { getResumeRepository } from "@/lib/resume-pdf-server";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string; page: string }> }) {
  return handleResumeRequest(request, getResumeRepository, await context.params);
}
