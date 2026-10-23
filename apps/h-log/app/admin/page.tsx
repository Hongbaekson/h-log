import Link from "next/link";
import { ArrowUpRight, Brain, CircleDashed } from "lucide-react";
import { requireAdminOwner } from "@/lib/admin-server";

export default async function AdminPage() {
  await requireAdminOwner();
  const brainEnabled = process.env.HLOG_BRAIN_DATABASE_ENABLED === "1";
  const brainConfigured = brainEnabled && Boolean(process.env.DATABASE_URL);
  return (
    <div className="admin-overview">
      <header className="admin-heading"><p>내 기록과 운영</p><h1>관리자 개요</h1><span>기록을 정리하고, 공개할 내용을 확인하는 공간입니다.</span></header>
      <section className="admin-brain-panel" aria-labelledby="admin-brain-title">
        <div className="admin-panel-heading"><Brain size={25} aria-hidden="true" /><span className="admin-status">{brainConfigured ? "설정됨" : "미설정"}</span></div>
        <h2 id="admin-brain-title">Second Brain</h2>
        <p>고민했던 일과 해결한 과정을 남겨 두세요.<br />원문은 나만 보고, 확인한 사본만 공개합니다.</p>
        <div className="admin-panel-bottom">
          <span>{brainConfigured ? "저장소 연결은 기록 화면에서 확인할 수 있습니다." : brainEnabled ? "저장소 연결 정보가 필요합니다." : "저장 기능을 설정하면 기록을 남길 수 있습니다."}</span>
          <Link href="/admin/brain" prefetch={false}>{brainConfigured ? "기록 관리" : "설정 상태 확인"}<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
      <section className="admin-next" aria-labelledby="admin-next-title">
        <div><CircleDashed size={19} aria-hidden="true" /><h2 id="admin-next-title">이어서 추가할 기능</h2></div>
        <ul>
          <li><strong>글과 이력서 관리</strong><p>글 검토와 발행, PDF 등록·교체·공개 여부를 관리할 예정입니다.</p></li>
          <li><strong>자동 작성과 작업 관리</strong><p>자동 작성 허용, 작업 조회와 재시도, 모니터링을 차례로 연결합니다.</p></li>
          <li><strong>비공개 실험실</strong><p>Queue 실험을 관리자 영역으로 옮길 예정입니다. 현재 실험 페이지는 아직 공개 상태입니다.</p></li>
        </ul>
        <p className="admin-note">준비 중인 기능은 아직 사용할 수 없습니다. 실제 운영 상태는 각 기능이 연결된 뒤 표시합니다.</p>
      </section>
      <details className="admin-access-help"><summary>공용 기기에서 사용했다면</summary><p>브라우저가 인증 정보를 기억할 수 있습니다. 전용 프로필이나 비공개 창을 사용하고, 사용 후 창을 닫아 주세요. 접근 키가 노출됐다면 서버에서 키를 교체해야 합니다.</p></details>
    </div>
  );
}
