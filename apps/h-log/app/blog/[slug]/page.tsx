import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { Badge, Container } from "@/components/ui";
import {
  getPublicBlogPostBySlug,
  type PublicBlogContentBlock,
  type PublicBlogInlineContent,
  type PublicBlogPost,
  type PublicBlogSourceLink,
} from "@/lib/blog-public";
import { loadPublicBlogContentStore } from "@/lib/blog-public-source";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

type BlogDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await loadPublicBlogContentStore();
  const post = getPublicBlogPostBySlug(slug, store);

  if (!post) {
    return {
      title: "블로그",
    };
  }

  return {
    alternates: {
      canonical: post.href,
    },
    description: post.description,
    openGraph: {
      description: post.description,
      images: ["/opengraph-image"],
      title: post.title,
      type: "article",
      url: post.href,
    },
    title: `${post.title} | 블로그`,
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const store = await loadPublicBlogContentStore();
  const post = getPublicBlogPostBySlug(slug, store);

  if (!post) {
    notFound();
  }

  const origin = resolvePublicSiteOrigin("http://localhost:3000");
  const postUrl = new URL(post.href, `${origin}/`).toString();
  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    author: {
      "@type": "Person",
      name: siteConfig.name,
      url: origin,
    },
    dateModified: post.updatedAt,
    datePublished: post.publishedAt,
    description: post.description,
    headline: post.title,
    inLanguage: "ko-KR",
    keywords: post.tags,
    mainEntityOfPage: postUrl,
    url: postUrl,
  };

  return (
    <>
      <JsonLd data={blogPostingJsonLd} />
      <section className="pt-12 pb-10 md:pt-16">
        <Container>
          <Link
            className="inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            href="/blog"
          >
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={2} />
            블로그 목록
          </Link>

          <div className="mt-8 max-w-4xl">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} tone={tag === "DB" || tag === "OCI" ? "cyan" : "slate"}>
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="hero-heading mt-6 break-words text-4xl leading-[1.08] tracking-normal text-white md:text-6xl">
              {post.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              {post.description}
            </p>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> ·{" "}
              {formatArticleMode(post.articleMode)}
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,72ch)_16rem] lg:justify-between">
            <article
              className="min-w-0 max-w-[72ch] border-y border-slate-700/80 py-8 text-slate-300 [&_code]:rounded-md [&_code]:bg-slate-950/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-cyan-100 [&_h1]:sr-only [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-normal [&_h2]:text-white [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-white [&_p]:mt-5 [&_p]:leading-8 [&_pre]:mt-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-950/70 [&_pre]:p-4 [&_pre]:focus-visible:outline [&_pre]:focus-visible:outline-2 [&_pre]:focus-visible:outline-offset-4 [&_pre]:focus-visible:outline-cyan-300"
            >
              {post.contentBlocks.map(renderContentBlock)}
            </article>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="border-y border-slate-700/80 py-5">
                <h2 className="text-sm font-semibold text-white">참고 출처</h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  글 작성에 참고한 공개 자료입니다. 외부 링크는 새 창에서 열립니다.
                </p>
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
                          <span className="sr-only"> (새 창에서 열림)</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {source.publisher} · {formatSourceRole(source.role)}
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
                    Markdown 원문 보기
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
  if (block.type === "diagram") {
    return (
      <figure
        className="mt-8 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/50"
        key={`${block.assetHash}-${index}`}
      >
        <Image
          alt={block.alt}
          className="h-auto w-full"
          height={675}
          src={block.path}
          unoptimized
          width={1200}
        />
        <figcaption className="border-t border-slate-700 px-4 py-3 text-sm text-slate-400">
          {block.alt}
        </figcaption>
      </figure>
    );
  }

  if (block.type === "code") {
    return (
      <pre key={index} tabIndex={0}>
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
    if (child.type === "code") {
      return <code key={index}>{child.text}</code>;
    }

    if (child.type === "strong") {
      return <strong key={index}>{child.text}</strong>;
    }

    return <span key={index}>{child.text}</span>;
  });
}

function formatArticleMode(value: PublicBlogPost["articleMode"]): string {
  const labels: Record<PublicBlogPost["articleMode"], string> = {
    applied_analysis: "적용 분석",
    document_analysis: "문서 분석",
    experiment: "실험 기록",
    ops_incident: "운영 회고",
    project_record: "프로젝트 기록",
  };

  return labels[value];
}

function formatSourceRole(value: PublicBlogSourceLink["role"]): string {
  const labels: Record<PublicBlogSourceLink["role"], string> = {
    discovery: "발견 자료",
    official: "공식 자료",
    original: "원문",
    reaction: "반응 자료",
    reference: "참고 자료",
  };

  return labels[value];
}
