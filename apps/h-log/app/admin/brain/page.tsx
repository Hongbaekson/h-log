import type { Metadata } from "next";
import { BrainCapture } from "@/components/brain/BrainCapture";
import { requireAdminOwner } from "@/lib/admin-server";
import { getBrainRepository } from "@/lib/brain-server";
import type { BrainNoteSummary, BrainOwnerNote } from "@/lib/brain-capture";
import { BrainReviewQueue } from "@/components/brain/BrainReviewQueue";
import { parseBrainReviewQuery, type BrainReviewQueue as Queue } from "@/lib/brain-review";
import { assertBrainNoteId } from "@/lib/brain-postgres-repository";
import { selectPublicBrain } from "@/lib/brain";
import { brainCatalog } from "@/lib/brain-catalog";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import "./capture.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "나만 보는 기록", robots: { index: false, follow: false } };

export default async function BrainCapturePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminOwner();
  if (process.env.HLOG_BRAIN_DATABASE_ENABLED !== "1") {
    return <div className="brain-capture"><header className="capture-header"><div><p className="capture-eyebrow">SECOND BRAIN</p><h1>나만 보는 기록</h1><p>저장 기능이 아직 설정되지 않았습니다.</p></div></header><p className="capture-help">저장소를 연결하면 이곳에서 기록을 쓰고 공개할 사본을 고를 수 있습니다. 공개 Second Brain은 그대로 볼 수 있습니다.</p></div>;
  }
  let notes: BrainNoteSummary[];
  try { notes = await getBrainRepository().listOwnerNotes(); }
  catch { return <div className="brain-capture"><header className="capture-header"><div><p className="capture-eyebrow">SECOND BRAIN</p><h1>나만 보는 기록</h1></div></header><p role="alert">저장소에 연결하지 못했습니다. 잠시 뒤 다시 열어 주세요.</p></div>; }
  let query = parseBrainReviewQuery(new URLSearchParams()), queue: Queue | null = null, initialNote: BrainOwnerNote | null = null, reviewError = "";
  try {
    const params = await searchParams, values = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "note" || value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) values.append(key, item);
    }
    query = parseBrainReviewQuery(values);
    queue = await getBrainRepository().listReviewNotes(query);
    if (params.note !== undefined) {
      assertBrainNoteId(params.note);
      initialNote = await getBrainRepository().getOwnerNote(params.note);
      if (!initialNote) reviewError = "기록을 찾지 못했습니다.";
    }
  } catch (error) {
    reviewError = error instanceof Error && ["invalid_review_query", "invalid_note_id"].includes(error.message)
      ? "목록 조건이나 기록 주소를 확인해 주세요." : "재검토 기록을 불러오지 못했습니다.";
  }
  return <BrainCapture key={initialNote?.id ?? "new"} initialNotes={notes} initialNote={initialNote}
    reviewQueue={<BrainReviewQueue query={query} queue={queue} error={reviewError} />}
    catalog={selectPublicBrain(brainCatalog)} publicOrigin={resolvePublicSiteOrigin("http://localhost:3000")} />;
}
