import type { Metadata } from "next";

import { BlogSearchPanel } from "@/components/blog/BlogSearchPanel";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { BlogPostRow } from "@/components/blog/BlogPostRow";
import { BlogTopicFilters } from "@/components/blog/BlogTopicFilters";
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
          </div>
        </Container>
      </section>
    </>
  );
}
