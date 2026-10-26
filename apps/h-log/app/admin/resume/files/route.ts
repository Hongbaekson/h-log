import { handleResumeRequest } from "@/lib/resume-pdf-http";
import { getResumeRepository } from "@/lib/resume-pdf-server";
export const dynamic = "force-dynamic";
export function POST(request: Request) { return handleResumeRequest(request, getResumeRepository, "files"); }
