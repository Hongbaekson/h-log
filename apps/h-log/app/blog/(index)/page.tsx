import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { BlogSearchPanel } from "@/components/blog/BlogSearchPanel";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { BlogTopicFilters } from "@/components/blog/BlogTopicFilters";
import { buildBlogBrowseHref, parseBlogBrowseParams, type BlogBrowseParams } from "@/lib/blog-search-ui";
import { Badge, Container } from "@/components/ui";
import { getPublicBlogIndex } from "@/lib/blog-public";
import {
  formatPublicBlogArticleMode,
  formatPublicBlogDate,
} from "@/lib/blog-public-presentation";
import { loadPublicBlogContentStore } from "@/lib/blog-public-source";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/blog",
  },
  description:
    "개발하며 풀었던 문제와 운영하면서 배운 점을 정리합니다.",
  title: "블로그",
};

type BlogPageProps = {
  searchParams?: Promise<BlogBrowseParams>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = (await searchParams) ?? {};
  const state = parseBlogBrowseParams(params);
  const store = await loadPublicBlogContentStore();
  const index = getPublicBlogIndex(store, {
    page: state.page,
    pageSize: 6,
    tag: state.tag ?? undefined,
  });

  return (
    <>
      <section className="pt-8 pb-6 md:pt-12">
        <Container>
          <div className="mx-auto max-w-4xl">
            <h1 className="hero-heading text-3xl leading-tight tracking-normal text-white md:text-4xl">
              개발 기록
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300 md:text-base">
              개발하며 풀었던 문제와 운영하면서 배운 점을 정리합니다.
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="mx-auto max-w-4xl">
            <BlogSearchPanel
              key={buildBlogBrowseHref(state)}
              state={state}
              filters={<BlogTopicFilters tags={index.tagCounts} state={state} />}
            >
            {!state.query && <div className="grid gap-5">
              {index.posts.length === 0 ? (
                <div className="border-y border-slate-700/80 py-10">
                  <h2 className="card-heading text-xl text-white wrap-anywhere">
                    {index.selectedTag
                      ? `${index.selectedTag} 태그의 공개 글이 없습니다.`
                      : "아직 공개된 글이 없습니다."}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {index.selectedTag
                      ? "다른 태그를 선택하거나 전체 글을 확인해 주세요."
                      : "새 글을 올리면 이곳에서 확인할 수 있습니다."}
                  </p>
                </div>
              ) : (
                index.posts.map((post) => (
                  <article
                    className="group border-t border-slate-700/80 py-7 transition-colors hover:border-cyan-300/50"
                    key={post.slug}
                  >
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays aria-hidden="true" size={15} strokeWidth={2} />
                        <time dateTime={post.publishedAt}>{formatPublicBlogDate(post.publishedAt)}</time>
                      </span>
                      <span className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">
                        {formatPublicBlogArticleMode(post.articleMode)}
                      </span>
                    </div>
                    <h2 className="card-heading mt-4 text-2xl leading-tight wrap-anywhere text-white md:text-3xl">
                      <Link
                        className="transition-colors group-hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                        href={post.href}
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 wrap-anywhere md:text-base">
                      {post.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Badge className="max-w-full wrap-anywhere" key={tag} tone="slate">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </article>
                ))
              )}

              <BlogPagination pagination={index.pagination} state={state} />
            </div>}
            </BlogSearchPanel>
          </div>
        </Container>
      </section>
    </>
  );
}
