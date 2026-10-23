import { NextResponse, type NextRequest } from "next/server";
import { authorizeAdminOwner, adminPrivateHeaders } from "./lib/admin-owner";

export function proxy(request: NextRequest) {
  const denied = authorizeAdminOwner(request);
  if (denied) return denied;
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(adminPrivateHeaders)) response.headers.set(name, value);
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
