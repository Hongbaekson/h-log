import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { PublicBlogPagination } from "@/lib/blog-public";
import { buildBlogBrowseHref, type BlogBrowseState } from "@/lib/blog-search-ui";

export function BlogPagination({ pagination, state }: { pagination: PublicBlogPagination; state: BlogBrowseState }) {
  if (!pagination.totalItems) return null;
  return (
    <nav aria-label="글 목록 페이지" className="mt-6 flex flex-col gap-3 border-t border-slate-700/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-400">{pagination.currentPage} / {pagination.totalPages} 페이지</p>
      <div className="flex gap-2">
        {([
          { page: pagination.currentPage - 1, label: "이전", Icon: ArrowLeft },
          { page: pagination.currentPage + 1, label: "다음", Icon: ArrowRight },
        ]).map(({ page, label, Icon }) => page >= 1 && page <= pagination.totalPages && (
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-[#5865f2] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
            href={buildBlogBrowseHref({ ...state, page })}
            key={label}
          >
            {label === "이전" && <Icon aria-hidden="true" size={15} />}
            {label}
            {label === "다음" && <Icon aria-hidden="true" size={15} />}
          </Link>
        ))}
      </div>
    </nav>
  );
}
