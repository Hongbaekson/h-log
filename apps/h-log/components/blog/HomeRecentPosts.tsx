import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui";
import { getPublicBlogIndex, type PublicBlogPost } from "@/lib/blog-public";
import { formatPublicBlogArticleMode, formatPublicBlogDate } from "@/lib/blog-public-presentation";
import { loadPublicBlogContentStore } from "@/lib/blog-public-source";

export async function HomeRecentPosts() {
  let posts: PublicBlogPost[] | null;
  try {
    const store = await loadPublicBlogContentStore();
    posts = getPublicBlogIndex(store, { pageSize: 3 }).posts;
  } catch {
    console.error("home_recent_posts_unavailable");
    posts = null;
  }

  if (posts?.length === 0) return null;

  return (
    <section aria-labelledby="home-recent-title" className="pb-16 md:pb-24">
      <Container>
        <div className="home-section-heading">
          <div>
            <p className="section-kicker">RECENT POSTS</p>
            <h2 id="home-recent-title">최근 글</h2>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 text-sm text-[#b6bdff] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]" href="/blog">
            모든 글 보기 <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        {posts === null ? (
          <div className="border-t border-white/10 py-6 text-sm leading-7 text-slate-300">
            <p role="status">최근 글을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
            <form action="/" method="get">
              <button className="mt-2 inline-flex min-h-11 cursor-pointer items-center text-[#b6bdff] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]" type="submit">
                다시 불러오기
              </button>
            </form>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {posts.map((post) => (
              <article className="min-w-0 border-t border-white/10 pt-5" key={post.slug}>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                  <time dateTime={post.publishedAt}>{formatPublicBlogDate(post.publishedAt)}</time>
                  <span>{formatPublicBlogArticleMode(post.articleMode)}</span>
                </div>
                <h3 className="mt-3 text-lg leading-7 font-semibold text-white wrap-anywhere">
                  <Link className="hover:text-[#b6bdff] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]" href={post.href}>
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-300 wrap-anywhere">{post.description}</p>
              </article>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
