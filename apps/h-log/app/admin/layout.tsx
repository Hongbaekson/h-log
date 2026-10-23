import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { requireAdminOwner } from "@/lib/admin-server";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "관리자", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminOwner();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span aria-hidden="true">h.</span><div><strong>h-log</strong><p>관리자</p></div></div>
        <AdminNavigation />
        <div className="admin-sidebar-bottom">
          <p><LockKeyhole size={14} aria-hidden="true" /> 소유자 전용</p>
          <a href={resolvePublicSiteOrigin("http://localhost:3000")} target="_blank" rel="noreferrer">공개 사이트 보기 <span className="sr-only">(새 창)</span><span aria-hidden="true">↗</span></a>
        </div>
      </aside>
      <div className="admin-workspace">
        <div className="admin-topbar"><span>내 작업 공간</span><span className="admin-private"><LockKeyhole size={13} aria-hidden="true" /> 비공개</span></div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
