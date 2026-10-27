import { handleDraftRequest } from "@/lib/blog-draft-http";
import { submitDraftRequest } from "@/lib/blog-draft-server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) { return handleDraftRequest(request, submitDraftRequest); }
export async function GET(request: Request) { return handleDraftRequest(request, submitDraftRequest); }
