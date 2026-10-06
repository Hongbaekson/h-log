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
  return <div className="memory-page">
    <Suspense fallback={<p className="brain-loading">기록을 불러오는 중…</p>}><BrainExplorer graph={graph} /></Suspense>
  </div>;
}
