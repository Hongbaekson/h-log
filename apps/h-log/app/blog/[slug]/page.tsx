import type { Metadata } from "next";
import type { ReactNode } from "react";
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
import {
  formatPublicBlogArticleMode,
  formatPublicBlogDate,
} from "@/lib/blog-public-presentation";
import { loadPublicBlogContentStoreBySlug } from "@/lib/blog-public-source";
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
  const store = await loadPublicBlogContentStoreBySlug(slug);
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
  const store = await loadPublicBlogContentStoreBySlug(slug);
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
              <time dateTime={post.publishedAt}>{formatPublicBlogDate(post.publishedAt)}</time> ·{" "}
              {formatPublicBlogArticleMode(post.articleMode)}
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="blog-reading-layout grid gap-10 lg:grid-cols-[minmax(0,72ch)_16rem] lg:justify-between">
            <div className="min-w-0 max-w-[72ch]">
              {post.tableOfContents.length > 0 && (
                <details className="mb-8 rounded-xl border border-slate-700 bg-[#191d3a]/50 lg:hidden">
                  <summary className="cursor-pointer rounded-xl px-4 py-4 font-semibold text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]">
                    목차
                  </summary>
                  <div className="max-h-[60vh] overflow-y-auto px-2 pb-3">
                    {renderTableOfContents(post.tableOfContents)}
                  </div>
                </details>
              )}
              <article
                className="min-w-0 border-y border-slate-700/80 py-8 text-slate-300 [&_code]:rounded-md [&_code]:bg-slate-950/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-cyan-100 [&>h1]:sr-only [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-normal [&_h2]:text-white [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-white [&_p]:mt-5 [&_p]:leading-8 [&_pre]:mt-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-700 [&_pre]:bg-slate-950/70 [&_pre]:p-4 [&_pre]:focus-visible:outline [&_pre]:focus-visible:outline-2 [&_pre]:focus-visible:outline-offset-4 [&_pre]:focus-visible:outline-cyan-300"
              >
                {post.contentBlocks.map(renderContentBlock)}
              </article>

              <section aria-label="참고 출처" className="mt-10 border-b border-slate-700/80 pb-6">
                <h2 className="text-sm font-semibold text-white">참고 출처</h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  글 작성에 참고한 공개 자료입니다. 외부 링크는 새 창에서 열립니다.
                </p>
                <div className="mt-4 grid gap-3">
                  {post.sourceLinks.map((source) => (
                    <a
                      className="group min-w-0 rounded-xl border border-slate-700 p-4 text-sm text-slate-300 wrap-anywhere transition-colors hover:border-cyan-300/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
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
              </section>
            </div>
            {post.tableOfContents.length > 0 && (
              <aside className="sticky top-28 hidden max-h-[calc(100dvh-8rem)] self-start overflow-y-auto border-l border-slate-700/80 pl-3 lg:block">
                <h2 className="px-3 pb-3 text-sm font-semibold text-slate-100">목차</h2>
                {renderTableOfContents(post.tableOfContents)}
              </aside>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}

function renderTableOfContents(headings: PublicBlogPost["tableOfContents"]): ReactNode {
  return (
    <nav aria-label="목차">
      <ol className="space-y-1 p-1 text-sm leading-6">
        {headings.map((heading) => (
          <li className={heading.level === 3 ? "pl-3" : undefined} key={heading.id}>
            <a
              className="block min-h-10 rounded-md px-3 py-2 text-slate-300 wrap-anywhere hover:bg-[#5865f2]/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6bdff]"
              href={`#${encodeURIComponent(heading.id)}`}
            >
              {heading.text || "제목 없는 구역"}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function renderContentBlock(block: PublicBlogContentBlock, index: number): ReactNode {
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

  if (block.type === "list") {
    const List = block.start === null ? "ul" : "ol";

    return (
      <List
        className={`mt-5 space-y-2 pl-6 leading-8 ${block.start === null ? "list-disc" : "list-decimal"}`}
        key={index}
        start={block.start ?? undefined}
      >
        {block.items.map((item, itemIndex) => (
          <li className="min-w-0 wrap-anywhere [&>ol]:mt-2 [&>ul]:mt-2 [&>:first-child]:mt-0" key={itemIndex}>
            {item.map(renderContentBlock)}
          </li>
        ))}
      </List>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote
        className="mt-5 min-w-0 border-l-2 border-[#5865f2] pl-4 wrap-anywhere [&>:first-child]:mt-0"
        key={index}
      >
        {block.children.map(renderContentBlock)}
      </blockquote>
    );
  }

  if (block.type === "table") {
    return (
      <div
        aria-label="표 (가로 스크롤)"
        className="relative mt-6 max-w-full overflow-x-auto rounded-xl border border-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
        key={index}
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-[36rem] table-fixed border-collapse text-sm leading-7 wrap-anywhere">
          <thead className="bg-[#5865f2]/10 text-slate-100">
            <tr>
              {block.header.map((cell, column) => (
                <th
                  className="border-b border-slate-700 px-4 py-3 align-top font-semibold"
                  key={column}
                  scope="col"
                  style={{ textAlign: block.align[column] ?? "left" }}
                >
                  {renderInlineContent(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/70">
            {block.rows.map((row, rowIndex) => (
              <tr className="even:bg-slate-800/30" key={rowIndex}>
                {row.map((cell, column) => (
                  <td
                    className="px-4 py-3 align-top"
                    key={column}
                    style={{ textAlign: block.align[column] ?? "left" }}
                  >
                    {renderInlineContent(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "heading") {
    if (block.level === 1) {
      return <h1 className="mt-10 scroll-mt-28 text-2xl font-bold text-white wrap-anywhere" id={block.id} key={index} tabIndex={-1}>{renderInlineContent(block.children)}</h1>;
    }

    const Heading = block.level === 2 ? "h2" : "h3";

    return (
      <Heading
        className="scroll-mt-28 rounded-sm wrap-anywhere focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
        id={block.id}
        key={index}
        tabIndex={-1}
      >
        {renderInlineContent(block.children)}
        <a
          aria-label="이 제목으로 이동"
          className="ml-2 inline-block rounded-sm font-normal text-slate-400 hover:text-[#b6bdff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
          href={`#${encodeURIComponent(block.id)}`}
        >
          <span aria-hidden="true">#</span>
        </a>
      </Heading>
    );
  }

  return <p key={index}>{renderInlineContent(block.children)}</p>;
}

function renderInlineContent(children: readonly PublicBlogInlineContent[]): ReactNode {
  return children.map((child, index) => {
    if (child.type === "code") {
      return <code key={index}>{child.text}</code>;
    }

    if (child.type === "strong") {
      return <strong key={index}>{renderInlineContent(child.children)}</strong>;
    }

    if (child.type === "link") {
      const external = child.href.startsWith("https:");

      return (
        <a
          className="rounded-sm text-[#b6bdff] underline decoration-[#b6bdff]/50 underline-offset-4 wrap-anywhere hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
          href={child.href}
          key={index}
          rel={external ? "noopener noreferrer" : undefined}
          target={external ? "_blank" : undefined}
        >
          {renderInlineContent(child.children)}
          {external && (
            <>
              <span className="sr-only"> (새 창에서 열림)</span>
              <ExternalLink aria-hidden="true" className="ml-1 inline-block align-baseline" size={12} />
            </>
          )}
        </a>
      );
    }

    return <span key={index}>{child.text}</span>;
  });
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
