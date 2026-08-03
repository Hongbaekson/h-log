import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const origin = resolvePublicSiteOrigin(request.url);
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Sitemap: ${origin}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
