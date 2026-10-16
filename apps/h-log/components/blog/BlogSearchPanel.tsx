"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  LoaderCircle,
  Search,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState, useTransition } from "react";

import { BlogPagination } from "./BlogPagination";
import { BlogPostRow } from "./BlogPostRow";
import type { BlogSearchHttpResponse } from "@/lib/blog-search";
import {
  createBlogSearchUiSnapshot,
  buildBlogBrowseHref,
  parseBlogBrowseParams,
  type BlogBrowseState,
  type BlogSearchUiSnapshot,
} from "@/lib/blog-search-ui";

export function BlogSearchPanel({ state, filters, children }: { state: BlogBrowseState; filters: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const [query, setQuery] = useState(state.query);
  const [snapshot, setSnapshot] = useState<BlogSearchUiSnapshot>(() => createBlogSearchUiSnapshot({
    query: state.query, loading: Boolean(state.query),
  }));
  const [attempt, setAttempt] = useState(0);
  const [isPending, startTransition] = useTransition();
  const href = buildBlogBrowseHref(state);

  useEffect(() => {
    if (!state.query) return;
    const controller = new AbortController();
    async function search() {
      try {
        const response = await fetch(href.replace("/blog?", "/api/search?"), {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok && response.status !== 400 && response.status !== 429) throw new Error("search failed");
        const body = await response.json() as BlogSearchHttpResponse;
        if (body.status !== "ok" && body.status !== "blocked") throw new Error("invalid search response");
        if (!controller.signal.aborted) setSnapshot(createBlogSearchUiSnapshot({ query: state.query, response: body }));
      } catch {
        if (!controller.signal.aborted) setSnapshot(createBlogSearchUiSnapshot({ query: state.query, errorMessage: "search failed" }));
      }
    }
    void search();
    return () => controller.abort();
  }, [href, state.query, attempt]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const next = { ...state, query: parseBlogBrowseParams({ q: query }).query, page: 1 };
    const nextHref = buildBlogBrowseHref(next);
    if (nextHref === href && next.query) {
      setSnapshot(createBlogSearchUiSnapshot({ query: next.query, loading: true }));
      setAttempt((value) => value + 1);
    } else {
      startTransition(() => router.push(nextHref, { scroll: false }));
    }
  }

  return (
    <div className="min-w-0">
      <form action="/blog" method="get" className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={handleSubmit}>
        {state.tag && <input name="tag" type="hidden" value={state.tag} />}
        <label className="sr-only" htmlFor="blog-search-query">
          블로그 검색
        </label>
        <div className="relative min-w-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-500"
            size={18}
            strokeWidth={2}
          />
          <input
            aria-describedby="blog-search-help"
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950/40 pr-4 pl-11 text-sm font-medium text-white outline-none transition-colors placeholder:text-slate-500 hover:border-slate-500 focus-visible:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            id="blog-search-query"
            maxLength={120}
            minLength={2}
            name="q"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="궁금한 기술이나 주제"
            type="search"
            value={query}
          />
        </div>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#a3aaff]/30 bg-[#5865f2] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#4752c4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3aaff] sm:px-5"
          aria-disabled={isPending}
          type="submit"
        >
          {isPending || snapshot.status === "loading" ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin"
              size={17}
              strokeWidth={2}
            />
          ) : (
            <Search aria-hidden="true" size={17} strokeWidth={2} />
          )}
          검색
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-400" id="blog-search-help">
        검색어를 2자 이상 입력해 주세요.
      </p>

      {(state.query || state.tag) && (
        <Link className="mt-4 inline-block rounded-md text-sm text-[#b6bdff] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]" href="/blog">
          검색·필터 초기화
        </Link>
      )}

      {filters}

      <div aria-live="polite" aria-busy={isPending || snapshot.status === "loading"} className="mt-5 min-h-8">
        {!state.query ? children : (
          <div className="grid gap-3">
            <p className="text-xs text-slate-400">
              검색어: <span className="break-words font-mono text-cyan-200">{snapshot.query}</span>
            </p>
            <SearchSnapshotView snapshot={snapshot} />
            {snapshot.status === "results" && snapshot.pagination && <BlogPagination pagination={snapshot.pagination} state={state} />}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchSnapshotView({ snapshot }: { snapshot: BlogSearchUiSnapshot }) {
  if (snapshot.status === "loading") {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-slate-300">
        <LoaderCircle
          aria-hidden="true"
          className="animate-spin text-cyan-200"
          size={16}
          strokeWidth={2}
        />
        {snapshot.message}
      </p>
    );
  }

  if (
    snapshot.status === "blocked" ||
    snapshot.status === "empty" ||
    snapshot.status === "error"
  ) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-slate-300">
        <AlertTriangle
          aria-hidden="true"
          className={snapshot.status === "error" ? "text-amber-200" : "text-cyan-200"}
          size={16}
          strokeWidth={2}
        />
        {snapshot.message}
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-300">
          {snapshot.pagination?.totalItems}개 결과
        </p>
      </div>
      <div className="grid">
        {snapshot.items.map((item) => (
          <BlogPostRow
            key={item.slug}
            title={item.title}
            href={item.href}
            description={item.description}
            publishedAt={item.publishedAt}
            publishedDateLabel={item.publishedDateLabel}
            metadataLabel={item.matchReasonLabel}
            tags={item.tags}
            thumbnail={item.thumbnail}
          />
        ))}
      </div>
    </div>
  );
}
