import { buildPublicSitemapXml } from "@/lib/blog-crawler-output";
import { loadPublicBlogContentStore } from "@/lib/blog-public-source";
import { projects } from "@/lib/projects";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const store = await loadPublicBlogContentStore();
  const sitemapXml = buildPublicSitemapXml(store, {
    origin: resolvePublicSiteOrigin(request.url),
    paths: [
      "/",
      "/resume",
      "/portfolio",
      ...projects.map((project) => `/portfolio/${project.slug}`),
      "/blog",
    ],
  });

  return new Response(sitemapXml, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
