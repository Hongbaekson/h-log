import { NextResponse, type NextRequest } from "next/server";
import { authorizeBrainOwner, brainPrivateHeaders } from "./lib/brain-owner";

export function proxy(request: NextRequest) {
  const denied = authorizeBrainOwner(request);
  if (denied) return denied;
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(brainPrivateHeaders)) response.headers.set(name, value);
  return response;
}

export const config = { matcher: ["/admin/brain/:path*"] };
