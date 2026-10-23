import { buildPublicSitemapXml } from "@/lib/blog-crawler-output";
import { loadPublicBlogContentStore } from "@/lib/blog-public-source";
import { loadPublicBrain } from "@/lib/brain-server";
import { projects } from "@/lib/projects";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const store = await loadPublicBlogContentStore();
  const brain = await loadPublicBrain();
  const sitemapXml = buildPublicSitemapXml(store, {
    origin: resolvePublicSiteOrigin(request.url),
    paths: [
      "/",
      "/resume",
      "/portfolio",
      ...projects.map((project) => `/portfolio/${project.slug}`),
      "/blog",
      "/brain",
      ...brain.nodes.map((node) => `/brain/${node.id}`),
    ],
  });

  return new Response(sitemapXml, {
    headers: {
      "cache-control": process.env.HLOG_BRAIN_DATABASE_ENABLED === "1" ? "no-store" : "public, max-age=300",
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
