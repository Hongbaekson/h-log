import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";

import { Badge, Container } from "@/components/ui";
import {
  getPublicBlogPostBySlug,
  getPublicBlogPosts,
  type PublicBlogContentBlock,
  type PublicBlogInlineContent,
} from "@/lib/blog-public";
import { blogContentStore } from "@/lib/blog-public-data";

type BlogDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getPublicBlogPosts(blogContentStore).map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPublicBlogPostBySlug(slug, blogContentStore);

  if (!post) {
    return {
      title: "Blog",
    };
  }

  return {
    alternates: {
      canonical: post.href,
    },
    description: post.description,
    openGraph: {
      description: post.description,
      title: post.title,
      type: "article",
    },
    title: `${post.title} | Blog`,
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const post = getPublicBlogPostBySlug(slug, blogContentStore);

  if (!post) {
    notFound();
  }

  return (
    <>
      <section className="pt-12 pb-10 md:pt-16">
        <Container>
          <Link
            className="inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            href="/blog"
          >
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={2} />
            Blog
          </Link>

          <div className="mt-8 max-w-4xl">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} tone={tag === "DB" || tag === "OCI" ? "cyan" : "slate"}>
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="hero-heading mt-6 text-4xl leading-[1.08] tracking-normal text-white md:text-6xl">
              {post.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              {post.description}
            </p>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> ·{" "}
              {post.articleMode.replaceAll("_", " ")}
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
            <article
              className="min-w-0 border-y border-slate-700/80 py-8 text-slate-300 [&_code]:rounded-md [&_code]:bg-slate-950/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-cyan-100 [&_h1]:sr-only [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-normal [&_h2]:text-white [&_p]:mt-5 [&_p]:leading-8 [&_pre]:mt-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-950/70 [&_pre]:p-4"
            >
              {post.contentBlocks.map(renderContentBlock)}
            </article>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="border-y border-slate-700/80 py-5">
                <h2 className="text-sm font-semibold text-white">Source links</h2>
                <div className="mt-4 grid gap-3">
                  {post.sourceLinks.map((source) => (
                    <a
                      className="group rounded-xl border border-slate-700 p-4 text-sm text-slate-300 transition-colors hover:border-cyan-300/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                      href={source.url}
                      key={source.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block font-semibold">{source.title}</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {source.publisher} · {source.role}
                          </span>
                        </span>
                        <ExternalLink
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-cyan-200"
                          size={15}
                          strokeWidth={2}
                        />
                      </span>
                    </a>
                  ))}
                  <a
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-300/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                    href={post.markdownHref}
                  >
                    <FileText aria-hidden="true" size={16} strokeWidth={2} />
                    Markdown
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function renderContentBlock(block: PublicBlogContentBlock, index: number) {
  if (block.type === "code") {
    return (
      <pre key={index}>
        <code>{block.code}</code>
      </pre>
    );
  }

  if (block.type === "heading") {
    if (block.level === 1) {
      return <h1 key={index}>{renderInlineContent(block.children)}</h1>;
    }

    if (block.level === 2) {
      return <h2 key={index}>{renderInlineContent(block.children)}</h2>;
    }

    return <h3 key={index}>{renderInlineContent(block.children)}</h3>;
  }

  return <p key={index}>{renderInlineContent(block.children)}</p>;
}

function renderInlineContent(children: readonly PublicBlogInlineContent[]) {
  return children.map((child, index) => {
    if (child.type === "strong") {
      return <strong key={index}>{child.text}</strong>;
    }

    return <span key={index}>{child.text}</span>;
  });
}
