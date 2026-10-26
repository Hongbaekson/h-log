import { Download } from "lucide-react";
import { getResumeRepository } from "@/lib/resume-pdf-server";
import { resumePublicationEpoch } from "@/lib/resume-pdf";

export async function ResumeDownload() {
  const epoch = resumePublicationEpoch(process.env);
  if (process.env.HLOG_RESUME_PDF_ENABLED !== "1" || !epoch) return null;
  try {
    if (!await getResumeRepository().publicMetadata(epoch)) return null;
  } catch {
    return <p className="mt-6 text-sm text-slate-400">지금은 PDF를 확인할 수 없습니다. 아래 온라인 이력서를 확인해 주세요.</p>;
  }
  return <div className="mt-6">
    <a href="/api/resume/pdf" download="이력서.pdf" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#5865f2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#4752c4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"><Download aria-hidden="true" size={17} />이력서 다운로드</a>
    <p className="mt-3 text-xs leading-6 text-slate-400">공개 중인 PDF입니다. 파일이 내려간 경우 이 페이지를 새로 열어 주세요.</p>
  </div>;
}
