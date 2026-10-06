import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrainNote } from "@/components/brain/BrainNote";
import { findBrainNode } from "@/lib/brain";
import { loadPublicBrain } from "@/lib/brain-server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const node = findBrainNode(await loadPublicBrain(), slug);
  if (!node) return { title: "기록을 찾을 수 없습니다", robots: { index: false, follow: false } };
  return { title: `${node.title} · Second Brain`, description: node.summary, alternates: { canonical: `/brain/${node.id}` } };
}

export default async function BrainDetailPage({ params }: Props) {
  const { slug } = await params;
  const graph = await loadPublicBrain();
  const node = findBrainNode(graph, slug);
  if (!node) notFound();
  return <div className="brain-detail-page"><Link className="brain-back-link" href={`/brain?note=${node.id}`}><ArrowLeft size={16} aria-hidden="true" />Second Brain에서 연결 보기</Link><BrainNote node={node} graph={graph} asPage /></div>;
}
