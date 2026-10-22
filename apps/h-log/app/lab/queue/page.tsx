import type { Metadata } from "next";
import Link from "next/link";
import { QueueReplay } from "@/components/lab/QueueReplay";
import { Container } from "@/components/ui";

const description = "가상 작업 6개로 Queue의 처리 실패, DLQ 보관, 원인 해결 후 재처리 흐름을 한 단계씩 살펴봅니다.";

export const metadata: Metadata = {
  title: "Queue와 DLQ 재생 실험",
  description,
  alternates: { canonical: "/lab/queue" },
  openGraph: { title: "Queue와 DLQ 재생 실험", description, url: "/lab/queue", type: "website" },
};

export default function QueueLabPage() {
  return (
    <Container className="py-12 break-keep wrap-anywhere md:py-16">
      <Link className="rounded-md text-sm text-[#b6bdff] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href="/portfolio">포트폴리오 목록</Link>
      <div className="mb-8 mt-8 max-w-3xl">
        <p className="text-sm font-semibold text-[#b6bdff]">가상 데이터 실험</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-5xl">Queue와 DLQ 재생 실험</h1>
        <p className="mt-5 text-base leading-8 text-slate-300">{description}</p>
        <p className="mt-3 text-sm leading-7 text-slate-400">미리 정한 작업과 실패 조건을 브라우저에서 재생합니다. 단계 숫자는 실제 처리 시간이나 성능 수치가 아닙니다.</p>
      </div>
      <noscript><p className="mb-6 rounded-xl border border-slate-600 p-4 text-sm leading-7 text-slate-200">재생 조작에는 JavaScript가 필요합니다. 아래에는 Queue에 작업 6개를 넣은 초기 상태가 표시됩니다.</p></noscript>
      <QueueReplay />
      <p className="mt-10 border-t border-slate-700 pt-6 text-sm leading-7 text-slate-400">이 모델은 작업을 가져오는 단계와 결과를 확인하는 단계를 나눠 보여 줍니다. 실제 Queue의 네트워크, 저장소, Worker 장애나 중복 전달은 재현하지 않습니다.</p>
    </Container>
  );
}
