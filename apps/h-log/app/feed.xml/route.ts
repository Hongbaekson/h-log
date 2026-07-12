import { buildBlogCrawlerOutputs } from "@/lib/blog-crawler-output";
import { loadPublicBlogContentStore } from "@/lib/blog-public-source";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const store = await loadPublicBlogContentStore();
  const outputs = buildBlogCrawlerOutputs(store, {
    origin: resolvePublicSiteOrigin(request.url),
  });

  return new Response(outputs.feedXml, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
