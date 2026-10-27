import { handleAutomationPolicyRequest } from "@/lib/blog-automation-http";
import { submitAutomationPolicy } from "@/lib/blog-draft-server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) { return handleAutomationPolicyRequest(request, submitAutomationPolicy); }
export async function GET(request: Request) { return handleAutomationPolicyRequest(request, submitAutomationPolicy); }
