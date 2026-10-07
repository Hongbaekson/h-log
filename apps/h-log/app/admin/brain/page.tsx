import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BrainCapture } from "@/components/brain/BrainCapture";
import { authorizeBrainOwner } from "@/lib/brain-owner";
import { getBrainRepository } from "@/lib/brain-server";
import type { BrainNoteSummary } from "@/lib/brain-capture";
import { selectPublicBrain } from "@/lib/brain";
import { brainCatalog } from "@/lib/brain-catalog";
import "./capture.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "나만 보는 기록", robots: { index: false, follow: false } };

export default async function BrainCapturePage() {
  const request = new Request(process.env.HLOG_BRAIN_OWNER_ORIGIN || "https://unconfigured.invalid", { headers: await headers() });
  if (authorizeBrainOwner(request)) notFound();
  let notes: BrainNoteSummary[];
  try { notes = await getBrainRepository().listOwnerNotes(); }
  catch { return <div className="brain-capture"><h1>나만 보는 기록</h1><p role="alert">저장소에 연결하지 못했습니다. 잠시 뒤 다시 열어 주세요.</p></div>; }
  return <BrainCapture initialNotes={notes} catalog={selectPublicBrain(brainCatalog)} />;
}
