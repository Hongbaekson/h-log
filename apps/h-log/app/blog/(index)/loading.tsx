import { LoaderCircle } from "lucide-react";

import { Container } from "@/components/ui";

export default function BlogLoading() {
  return (
    <section className="py-20">
      <Container>
        <div
          aria-live="polite"
          className="border-y border-slate-700/80 py-12"
          role="status"
        >
          <LoaderCircle
            aria-hidden="true"
            className="animate-spin text-cyan-200"
            size={22}
            strokeWidth={2}
          />
          <p className="mt-4 text-base font-semibold text-white">
            블로그 글을 불러오는 중입니다.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            공개된 글과 태그를 확인하고 있습니다.
          </p>
        </div>
      </Container>
    </section>
  );
}
