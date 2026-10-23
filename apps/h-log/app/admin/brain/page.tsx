import type { Metadata } from "next";
import { BrainCapture } from "@/components/brain/BrainCapture";
import { requireAdminOwner } from "@/lib/admin-server";
import { getBrainRepository } from "@/lib/brain-server";
import type { BrainNoteSummary } from "@/lib/brain-capture";
import { selectPublicBrain } from "@/lib/brain";
import { brainCatalog } from "@/lib/brain-catalog";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import "./capture.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "나만 보는 기록", robots: { index: false, follow: false } };

export default async function BrainCapturePage() {
  await requireAdminOwner();
  if (process.env.HLOG_BRAIN_DATABASE_ENABLED !== "1") {
    return <div className="brain-capture"><header className="capture-header"><div><p className="capture-eyebrow">SECOND BRAIN</p><h1>나만 보는 기록</h1><p>저장 기능이 아직 설정되지 않았습니다.</p></div></header><p className="capture-help">저장소를 연결하면 이곳에서 기록을 쓰고 공개할 사본을 고를 수 있습니다. 공개 Second Brain은 그대로 볼 수 있습니다.</p></div>;
  }
  let notes: BrainNoteSummary[];
  try { notes = await getBrainRepository().listOwnerNotes(); }
  catch { return <div className="brain-capture"><header className="capture-header"><div><p className="capture-eyebrow">SECOND BRAIN</p><h1>나만 보는 기록</h1></div></header><p role="alert">저장소에 연결하지 못했습니다. 잠시 뒤 다시 열어 주세요.</p></div>; }
  return <BrainCapture initialNotes={notes} catalog={selectPublicBrain(brainCatalog)} publicOrigin={resolvePublicSiteOrigin("http://localhost:3000")} />;
}
