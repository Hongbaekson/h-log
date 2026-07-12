import { getPublicBlogPostMarkdown } from "@/lib/blog-public";
import { loadPublicBlogContentStore } from "@/lib/blog-public-source";

export const dynamic = "force-dynamic";

type BlogMarkdownRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: BlogMarkdownRouteContext) {
  const { slug } = await params;
  const store = await loadPublicBlogContentStore();
  const markdown = getPublicBlogPostMarkdown(slug, store);

  if (!markdown) {
    return notFoundResponse();
  }

  return new Response(markdown, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}

function notFoundResponse(): Response {
  return new Response("Not found\n", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
    status: 404,
  });
}
