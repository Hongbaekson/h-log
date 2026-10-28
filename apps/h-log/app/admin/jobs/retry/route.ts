import { handleJobRetryRequest } from "@/lib/blog-job-retry-http";
import { executeJobRetry } from "@/lib/blog-admin-operations-server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) { return handleJobRetryRequest(request,executeJobRetry); }
export async function GET(request: Request) { return handleJobRetryRequest(request,executeJobRetry); }
