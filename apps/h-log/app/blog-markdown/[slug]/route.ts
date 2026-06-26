import { getPublicBlogPostMarkdown, getPublicBlogPosts } from "@/lib/blog-public";
import { blogContentStore } from "@/lib/blog-public-data";

type BlogMarkdownRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getPublicBlogPosts(blogContentStore).map((post) => ({
    slug: post.slug,
  }));
}

export async function GET(_request: Request, { params }: BlogMarkdownRouteContext) {
  const { slug } = await params;
  const markdown = getPublicBlogPostMarkdown(slug, blogContentStore);

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
