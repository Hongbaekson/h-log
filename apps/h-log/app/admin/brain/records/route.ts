import { handleBrainCaptureRequest } from "@/lib/brain-capture-http";
import { getBrainRepository } from "@/lib/brain-server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return handleBrainCaptureRequest(request, getBrainRepository); }
export async function POST(request: Request) { return handleBrainCaptureRequest(request, getBrainRepository); }
