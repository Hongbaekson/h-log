import { handleEditorialRequest } from "@/lib/blog-editorial-http";
import { executeEditorialCommand } from "@/lib/blog-admin-review-server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) { return handleEditorialRequest(request, executeEditorialCommand); }
export async function GET(request: Request) { return handleEditorialRequest(request, executeEditorialCommand); }
