import type { Metadata } from "next";
import { Rss } from "lucide-react";

import { BlogSearchPanel } from "@/components/blog/BlogSearchPanel";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { BlogPostRow } from "@/components/blog/BlogPostRow";
import { BlogTopicFilters } from "@/components/blog/BlogTopicFilters";
import { BlogSeries } from "@/components/blog/BlogSeries";
import { getPublicBlogSeries } from "@/lib/blog-series";
import { buildBlogBrowseHref, parseBlogBrowseParams, type BlogBrowseParams } from "@/lib/blog-search-ui";
import { Container } from "@/components/ui";
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
  const series = !state.query && !state.tag && index.pagination.currentPage === 1 ? getPublicBlogSeries(store) : [];

  return (
    <>
      <section className="pt-8 pb-6 md:pt-12">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="hero-heading text-3xl leading-tight tracking-normal text-white md:text-4xl">
                개발 기록
              </h1>
              <a
                className="inline-flex min-h-10 items-center gap-2 rounded-sm text-sm text-[#b6bdff] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
                href="/feed.xml"
                type="application/rss+xml"
              >
                <Rss aria-hidden="true" size={15} />
                RSS 구독
              </a>
            </div>
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
            {!state.query && <div className="grid">
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
                  <BlogPostRow
                    key={post.slug}
                    title={post.title}
                    href={post.href}
                    description={post.description}
                    publishedAt={post.publishedAt}
                    publishedDateLabel={formatPublicBlogDate(post.publishedAt)}
                    metadataLabel={formatPublicBlogArticleMode(post.articleMode)}
                    tags={post.tags}
                    thumbnail={post.thumbnail}
                  />
                ))
              )}

              <BlogPagination pagination={index.pagination} state={state} />
            </div>}
            </BlogSearchPanel>
            {series.length > 0 && (
              <section aria-label="시리즈" className="mt-12 space-y-4">
                <h2 className="text-lg font-semibold text-white">순서대로 읽기</h2>
                {series.map((item) => <BlogSeries key={item.id} series={item} />)}
              </section>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
