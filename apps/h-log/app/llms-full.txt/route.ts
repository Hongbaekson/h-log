import { buildBlogCrawlerOutputs } from "@/lib/blog-crawler-output";
import { blogContentStore } from "@/lib/blog-public-data";

export function GET(request: Request) {
  const outputs = buildBlogCrawlerOutputs(blogContentStore, {
    origin: new URL(request.url).origin,
  });

  return new Response(outputs.llmsFullTxt, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
