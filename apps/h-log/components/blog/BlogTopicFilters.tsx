import Link from "next/link";

import type { PublicBlogTagCount } from "@/lib/blog-public";
import { buildBlogBrowseHref, type BlogBrowseState } from "@/lib/blog-search-ui";

export function BlogTopicFilters({ tags, state }: { tags: PublicBlogTagCount[]; state: BlogBrowseState }) {
  const primary = tags.filter((item, index) => index < 4 || item.tag === state.tag);
  const remaining = tags.filter((item, index) => index >= 4 && item.tag !== state.tag);

  function tagLink(tag: string | null, count?: number) {
    const selected = tag === state.tag;
    return (
      <Link
        aria-current={selected ? "page" : undefined}
        className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[#a3aaff] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3aaff] ${
          selected ? "border-[#a3aaff] bg-[#5865f2]/20 text-[#dce0ff]" : "border-slate-700 text-slate-300"
        }`}
        href={buildBlogBrowseHref({ ...state, tag, page: 1 })}
        key={tag ?? "all"}
        title={tag ?? undefined}
      >
        <span className="min-w-0 truncate">{tag ?? "전체"}</span>
        {count !== undefined && <span className="shrink-0 font-mono">{count}</span>}
      </Link>
    );
  }

  return (
    <nav aria-label="블로그 태그" className="mt-5 border-t border-slate-700/80 pt-4">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-white">주제별로 보기</h2>
        <p className="text-xs text-slate-400">태그별 전체 공개 글 수</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tagLink(null)}
        {primary.map(({ tag, count }) => tagLink(tag, count))}
      </div>
      {remaining.length > 0 && (
        <details className="group mt-2">
          <summary className="w-fit cursor-pointer rounded-md py-2 text-xs font-semibold text-[#b6bdff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3aaff]">
            <span className="group-open:hidden">태그 더 보기 ({remaining.length})</span>
            <span className="hidden group-open:inline">태그 접기</span>
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {remaining.map(({ tag, count }) => tagLink(tag, count))}
          </div>
        </details>
      )}
      {state.tag && !tags.some(({ tag }) => tag === state.tag) && (
        <p className="mt-3 text-sm text-slate-300 wrap-anywhere">선택한 태그: {state.tag}</p>
      )}
    </nav>
  );
}
