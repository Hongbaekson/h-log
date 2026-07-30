"use client";

import { RotateCcw } from "lucide-react";

import { Container } from "@/components/ui";

export default function BlogError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="py-20">
      <Container>
        <div className="border-y border-amber-300/30 py-12">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
            Blog unavailable
          </p>
          <h1 className="card-heading mt-4 text-2xl text-white">
            블로그를 불러오지 못했습니다.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
            잠시 후 다시 시도해 주세요. 공개 글 대신 예제 글을 표시하지 않습니다.
          </p>
          <button
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-amber-300/40 px-4 text-sm font-semibold text-amber-100 transition-colors hover:border-amber-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            onClick={reset}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={16} strokeWidth={2} />
            다시 시도
          </button>
        </div>
      </Container>
    </section>
  );
}
