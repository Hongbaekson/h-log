import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Tag } from "lucide-react";

import { Badge, Container } from "@/components/ui";
import { getPublicBlogIndex } from "@/lib/blog-public";
import { blogContentStore } from "@/lib/blog-public-data";

export const metadata: Metadata = {
  description:
    "백엔드 개발, 운영, 자동화 워크플로우를 DB 기반 블로그로 정리합니다.",
  title: "Blog | 손홍백",
};

type BlogPageProps = {
  searchParams?: Promise<{
    page?: string;
    tag?: string;
  }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = (await searchParams) ?? {};
  const selectedTag = params.tag;
  const index = getPublicBlogIndex(blogContentStore, {
    page: Number(params.page),
    pageSize: 6,
    tag: selectedTag,
  });

  return (
    <>
      <section className="pt-12 pb-10 md:pt-16">
        <Container>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Blog
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-end">
            <div>
              <h1 className="hero-heading max-w-3xl text-4xl leading-[1.08] tracking-normal text-white md:text-6xl">
                개발하며 남기는 운영 기록
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                DB 기반 수동 발행부터 자동화까지, 백엔드와 운영 관점에서 검증 가능한 글만 공개합니다.
              </p>
            </div>
            <div className="border-y border-slate-700/80 py-4">
              <div className="flex items-center justify-between py-3 text-sm font-semibold text-slate-300">
                Published
                <span className="font-mono text-cyan-200">{index.pagination.totalItems}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 py-3 text-sm font-semibold text-slate-300">
                Public policy
                <span className="font-mono text-emerald-300">published only</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="border-y border-slate-700/80 py-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Tag aria-hidden="true" size={16} strokeWidth={2} />
                  Tags
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-cyan-300/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                    href="/blog"
                  >
                    전체
                  </Link>
                  {index.tagCounts.map((tagCount) => (
                    <Link
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-cyan-300/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                      href={`/blog?tag=${encodeURIComponent(tagCount.tag)}`}
                      key={tagCount.tag}
                    >
                      {tagCount.tag} {tagCount.count}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            <div className="grid gap-5">
              {index.selectedTag ? (
                <Link
                  className="inline-flex w-fit items-center gap-2 rounded-xl text-sm font-semibold text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                  href="/blog"
                >
                  <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
                  {index.selectedTag} 필터 해제
                </Link>
              ) : null}

              {index.posts.map((post) => (
                <article
                  className="group border-t border-slate-700/80 py-7 transition-colors hover:border-cyan-300/50"
                  key={post.slug}
                >
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays aria-hidden="true" size={15} strokeWidth={2} />
                      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">
                      {post.articleMode.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h2 className="card-heading mt-4 text-2xl leading-tight text-white md:text-3xl">
                    <Link
                      className="transition-colors group-hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                      href={post.href}
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                    {post.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag} tone="slate">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </article>
              ))}

              <div className="flex flex-col gap-3 border-t border-slate-700/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">
                  {index.pagination.currentPage} / {index.pagination.totalPages} page
                </p>
                <div className="flex gap-2">
                  {index.pagination.currentPage > 1 ? (
                    <PaginationLink
                      label="이전"
                      page={index.pagination.currentPage - 1}
                      tag={selectedTag}
                    />
                  ) : null}
                  {index.pagination.currentPage < index.pagination.totalPages ? (
                    <PaginationLink
                      icon="next"
                      label="다음"
                      page={index.pagination.currentPage + 1}
                      tag={selectedTag}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function PaginationLink({
  icon = "previous",
  label,
  page,
  tag,
}: {
  icon?: "next" | "previous";
  label: string;
  page: number;
  tag?: string;
}) {
  const query = new URLSearchParams({ page: String(page) });

  if (tag) {
    query.set("tag", tag);
  }

  return (
    <Link
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-300/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
      href={`/blog?${query.toString()}`}
    >
      {icon === "previous" ? <ArrowLeft aria-hidden="true" size={15} strokeWidth={2} /> : null}
      {label}
      {icon === "next" ? <ArrowRight aria-hidden="true" size={15} strokeWidth={2} /> : null}
    </Link>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
