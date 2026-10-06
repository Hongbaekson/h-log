import type { Metadata } from "next";
import { Suspense } from "react";
import { BrainExplorer } from "@/components/brain/BrainExplorer";
import { selectPublicBrain } from "@/lib/brain";
import { brainCatalog } from "@/lib/brain-catalog";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "손홍백의 경험, 해결 방법, 생각과 질문을 연결한 개인 기록 공간입니다.",
  alternates: { canonical: "/brain" },
};

export default function BrainPage() {
  const graph = selectPublicBrain(brainCatalog);
  return <div className="brain-page">
    <header className="brain-page-heading"><div><p className="brain-eyebrow"><span aria-hidden="true" />기억을 꺼내 두는 곳</p><h1>Second Brain<span aria-hidden="true">.</span></h1><p className="brain-intro">어떻게 해결했고, 무엇을 고민했는지.<br className="brain-mobile-break" /> 다시 꺼내 보고 싶은 나의 기록들.</p></div><dl className="brain-counts"><div><dt>기록</dt><dd>{graph.nodes.length}</dd></div><div><dt>연결</dt><dd>{graph.edges.length}</dd></div></dl></header>
    <Suspense fallback={<p className="brain-loading">기록을 불러오는 중…</p>}><BrainExplorer graph={graph} /></Suspense>
  </div>;
}
