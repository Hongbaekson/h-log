import type { Metadata } from "next";
import { requireAdminOwner } from "@/lib/admin-server";
import { getResumeRepository } from "@/lib/resume-pdf-server";
import { ResumeManager } from "@/components/admin/ResumeManager";
import type { ResumeState } from "@/lib/resume-pdf";
import "./resume.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "이력서 PDF 관리", robots: { index: false, follow: false } };

export default async function ResumeAdminPage() {
  await requireAdminOwner();
  const heading = <header className="admin-heading"><p>내 이력서</p><h1>이력서 PDF</h1><span>수정한 파일을 보관하고, 페이지마다 내용을 확인하세요.</span></header>;
  if (process.env.HLOG_RESUME_PDF_ENABLED !== "1") return <>{heading}<p>PDF 보관 기능이 아직 설정되지 않았습니다.</p></>;
  let state: ResumeState;
  try { state = await getResumeRepository().list(); }
  catch { return <>{heading}<p role="alert">보관함에 연결하지 못했습니다. 잠시 뒤 다시 열어 주세요.</p><a className="resume-reload" href="/admin/resume">다시 열기</a></>; }
  return <>{heading}<ResumeManager initialState={state} /></>;
}
