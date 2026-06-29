"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  LoaderCircle,
  Search,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import { Badge } from "@/components/ui";
import type { BlogSearchApiResponse } from "@/lib/blog-search";
import {
  createBlogSearchUiSnapshot,
  type BlogSearchUiSnapshot,
} from "@/lib/blog-search-ui";

const initialSnapshot = createBlogSearchUiSnapshot({
  query: "",
});

export function BlogSearchPanel() {
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState<BlogSearchUiSnapshot>(initialSnapshot);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextQuery = query.trim();

    setSnapshot(
      createBlogSearchUiSnapshot({
        loading: true,
        query: nextQuery,
      }),
    );

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(nextQuery)}`,
        {
          cache: "no-store",
        },
      );
      const body = (await response.json()) as BlogSearchApiResponse;

      setSnapshot(
        createBlogSearchUiSnapshot({
          query: nextQuery,
          response: body,
        }),
      );
    } catch (error) {
      setSnapshot(
        createBlogSearchUiSnapshot({
          errorMessage: error instanceof Error ? error.message : "unknown error",
          query: nextQuery,
        }),
      );
    }
  }

  return (
    <div className="border-y border-slate-700/80 py-6">
      <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
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
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950/40 pr-4 pl-11 text-sm font-medium text-white outline-none transition-colors placeholder:text-slate-500 hover:border-slate-500 focus:border-cyan-300"
            id="blog-search-query"
            maxLength={120}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="pgvector, OCI, Nginx"
            type="search"
            value={query}
          />
        </div>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
          disabled={snapshot.status === "loading"}
          type="submit"
        >
          {snapshot.status === "loading" ? (
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

      <div aria-live="polite" className="mt-5 min-h-8">
        {snapshot.status === "idle" ? null : <SearchSnapshotView snapshot={snapshot} />}
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
          {snapshot.items.length}개 결과
        </p>
        {snapshot.cached ? <Badge tone="mint">캐시됨</Badge> : null}
      </div>
      <div className="grid gap-3">
        {snapshot.items.map((item) => (
          <article
            className="border-t border-slate-800 pt-4 transition-colors hover:border-cyan-300/50"
            key={item.slug}
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" size={14} strokeWidth={2} />
                <time dateTime={item.publishedAt}>{item.publishedDateLabel}</time>
              </span>
              <span className="font-mono uppercase tracking-[0.14em] text-cyan-200">
                {item.matchReasonLabel}
              </span>
              <span className="font-mono text-emerald-300">{item.scoreLabel}</span>
            </div>
            <h2 className="card-heading mt-2 text-xl leading-tight text-white">
              <Link
                className="transition-colors hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                href={item.href}
              >
                {item.title}
              </Link>
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              {item.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag} tone="slate">
                  {tag}
                </Badge>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
