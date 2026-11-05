import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BrainExplorer } from "@/components/brain/BrainExplorer";
import { loadPublicBrain } from "@/lib/brain-server";
import { withPageSocialMetadata } from "@/lib/page-social-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = withPageSocialMetadata({
  title: "Second Brain",
  description: "손홍백의 경험, 해결 방법, 생각과 질문을 연결한 개인 기록 공간입니다.",
  alternates: { canonical: "/brain" },
}, "/brain");

export default async function BrainPage() {
  const graph = await loadPublicBrain();
  return <div className="memory-page">
    <Suspense fallback={
      <section className="brain-index" aria-label="공개 기록 목록" tabIndex={0}>
        <div>
          <Link className="brain-back-link" href="/">H-Log 홈으로</Link>
          <h1>Second Brain</h1>
          <p>기록을 선택하면 개별 페이지에서 읽을 수 있습니다.</p>
          <ul>{graph.nodes.map(node => <li key={node.id}>
            <Link href={`/brain/${node.id}`}><strong>{node.title}</strong><span>{node.summary}</span></Link>
          </li>)}</ul>
        </div>
      </section>
    }><BrainExplorer graph={graph} /></Suspense>
  </div>;
}
