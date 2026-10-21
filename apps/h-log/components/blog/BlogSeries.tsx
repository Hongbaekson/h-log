import Link from "next/link";
import type { PublicBlogSeries } from "@/lib/blog-series";

export function BlogSeries({ series, currentSlug }: { series: PublicBlogSeries; currentSlug?: string }) {
  const current = series.posts.find((post) => post.slug === currentSlug);
  return (
    <details className="min-w-0 rounded-xl border border-slate-700 bg-[#191d3a]/50" open={!currentSlug}>
      <summary className="cursor-pointer rounded-xl px-5 py-4 text-slate-100 wrap-anywhere focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]">
        <span className="text-xs font-semibold text-[#b6bdff]">시리즈{current ? ` · 현재 ${current.order}편` : ` · 공개 글 ${series.posts.length}편`}</span>
        <span className="mt-2 block font-semibold leading-7">{series.title}</span>
      </summary>
      <div className="px-5 pb-4">
        <p className="text-sm leading-7 text-slate-300 wrap-anywhere">{series.description}</p>
        <ol className="mt-4 divide-y divide-slate-700/80 border-t border-slate-700/80">
          {series.posts.map((post) => (
            <li key={post.slug} value={post.order}>
              <Link
                aria-current={post.slug === currentSlug ? "page" : undefined}
                className="flex min-h-11 items-start gap-3 rounded-md px-2 py-3 text-sm leading-7 text-slate-200 hover:bg-[#5865f2]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6bdff] aria-[current=page]:bg-[#5865f2]/15"
                href={post.href}
              >
                <span className="shrink-0 font-mono text-[#b6bdff]">{post.order}편</span>
                <span className="min-w-0 wrap-anywhere">{post.title}{post.slug === currentSlug && <span className="sr-only"> (현재 글)</span>}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
