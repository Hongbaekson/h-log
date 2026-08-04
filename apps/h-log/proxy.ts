import { NextResponse, type NextRequest } from "next/server";

import { isPublicBlogSlug } from "@/lib/blog-public-source";

export async function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice("/blog/".length);

  if (slug.endsWith(".md")) {
    return NextResponse.next();
  }

  if (!(await isPublicBlogSlug(slug))) {
    return NextResponse.rewrite(new URL("/__hlog-not-found", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/blog/:slug",
};
