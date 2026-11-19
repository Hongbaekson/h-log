import { publicCrawlerResponse } from "@/lib/blog-public-source";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return publicCrawlerResponse("sitemap.xml", request);
}
