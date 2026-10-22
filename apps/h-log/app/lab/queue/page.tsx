import type { Metadata } from "next";
import Link from "next/link";
import { QueueReplay } from "@/components/lab/QueueReplay";
import { Container } from "@/components/ui";
import { getProjectBySlug } from "@/lib/projects";

const description = "가상 작업 6개로 Queue의 처리 실패, DLQ 보관, 원인 해결 후 재처리 흐름을 한 단계씩 살펴봅니다.";

export const metadata: Metadata = {
  title: "Queue와 DLQ 재생 실험",
  description,
  alternates: { canonical: "/lab/queue" },
  openGraph: { title: "Queue와 DLQ 재생 실험", description, url: "/lab/queue", type: "website" },
};

export default function QueueLabPage() {
  const project = getProjectBySlug("redisson-async-processing-recovery")!;
  return (
    <Container className="py-12 break-keep wrap-anywhere md:py-16">
      <Link className="rounded-md text-sm text-[#b6bdff] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href="/portfolio">포트폴리오 목록</Link>
      <div className="mb-8 mt-8 max-w-3xl">
        <p className="text-sm font-semibold text-[#b6bdff]">가상 데이터 실험</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-5xl">Queue와 DLQ 재생 실험</h1>
        <p className="mt-5 text-base leading-8 text-slate-300">{description}</p>
        <p className="mt-3 text-sm leading-7 text-slate-400">미리 정한 작업과 실패 조건을 브라우저에서 재생합니다. 단계 숫자는 실제 처리 시간이나 성능 수치가 아닙니다.</p>
        <a className="mt-4 inline-flex min-h-11 items-center rounded-md text-sm text-[#b6bdff] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href="#queue-design">실험과 실제 설계 비교</a>
      </div>
      <noscript><p className="mb-6 rounded-xl border border-slate-600 p-4 text-sm leading-7 text-slate-200">재생 조작에는 JavaScript가 필요합니다. 아래에는 Queue에 작업 6개를 넣은 초기 상태가 표시됩니다.</p></noscript>
      <QueueReplay />
      <section aria-labelledby="queue-design-heading" className="mt-10 scroll-mt-28 border-t border-slate-700 pt-8 focus:outline-none" id="queue-design" tabIndex={-1}>
        <h2 className="text-2xl font-semibold text-white" id="queue-design-heading">실험과 실제 설계</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">이 실험은 작업이 어디에 남는지 보여 주는 모델입니다. 실제 시스템을 설계할 때는 아래 조건을 따로 확인해야 합니다.</p>
        <dl className="mt-6 grid gap-6 lg:grid-cols-3">
          {[
            { title: "동시성과 중복 처리", model: "Worker 수만큼 작업을 가져오고, 다음 단계에서 결과를 한꺼번에 확정합니다.", check: "여러 Worker의 처리 순서, 작업 중단과 재전달을 다뤄야 합니다. 같은 작업을 다시 받아도 결과가 중복 반영되지 않을 기준이 필요합니다." },
            { title: "네트워크와 처리 확인", model: "성공과 실패를 미리 정합니다. 연결 지연이나 응답 유실은 없습니다.", check: "응답을 받기 전에 연결이 끊기면 처리 여부를 어떻게 확인할지, 어떤 실패를 재시도할지 정해야 합니다." },
            { title: "영속성과 복구", model: "작업은 브라우저 메모리에만 있으며 새로고침하면 초기화됩니다.", check: "Queue에 넣는 시점과 DB 변경의 경계, 저장소나 Worker 재시작 후 작업을 복구할 기준을 확인해야 합니다." },
          ].map(({ title, model, check }) => (
            <div className="min-w-0 border-t border-slate-700 pt-5" key={title}>
              <dt className="font-semibold text-[#b6bdff]">{title}</dt>
              <dd className="mt-3 space-y-3 text-sm leading-7 text-slate-300">
                <p><span className="font-semibold text-white">실험에서는 </span>{model}</p>
                <p><span className="font-semibold text-white">실제 설계에서는 </span>{check}</p>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm leading-7 text-slate-400">DLQ 재처리 버튼은 실패 원인이 해결됐다고 가정합니다. 실제로는 원인과 작업 내용을 확인하고 재처리 대상을 골라야 합니다. 위 항목은 설계 시 확인할 조건이며, 이 실험이나 아래 프로젝트에서 모두 검증했다는 뜻은 아닙니다.</p>
        <div className="mt-8 border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white">연결된 프로젝트</h3>
          <Link className="mt-3 inline-flex min-h-11 items-center rounded-md py-2 font-semibold leading-7 text-[#b6bdff] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href={`/portfolio/${project.slug}`}>{project.context}</Link>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">요청과 후속 처리의 분리, 실패 작업의 복구 흐름을 다룬 사례입니다. 프로젝트의 설계 설명과 연결된 글을 이어서 읽을 수 있습니다.</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">이 화면의 작업 수·시도 횟수는 가상 값입니다. 프로젝트에 기록된 응답 시간·처리량·복구 시간의 측정 근거로 사용하지 않습니다.</p>
        </div>
      </section>
    </Container>
  );
}
