import { requireAdminOwner } from "@/lib/admin-server";
import { loadAdminAudit } from "@/lib/blog-admin-operations-server";
import { actionLabels, actorLabels, parseAuditQuery, targetLabels } from "@/lib/blog-admin-operations";
import { AdminObservation } from "@/components/admin/AdminObservation";
import { OperationsError, OperationsPagination, OperationsSelect, OperationTime } from "@/components/admin/AdminOperations";
import "../operations.css";

const dollars = (value: number) => new Intl.NumberFormat("ko-KR", { style: "currency", currency: "USD", maximumFractionDigits: 6 }).format(value);

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminOwner();
  let query;
  try { query = parseAuditQuery(await searchParams); } catch { return <OperationsError path="/admin/audit" invalid />; }
  let data;
  try { data = await loadAdminAudit(query); } catch { return <OperationsError path="/admin/audit" />; }
  return <div className="admin-operations">
    <header className="admin-heading"><p>운영 기록 · 읽기 전용</p><h1>변경 이력</h1><span>저장된 관리자 명령, 정책 변경과 사용량을 확인합니다.</span></header>
    <AdminObservation observedAt={data.observedAt} />
    <section aria-labelledby="usage-title" className="ops-usage"><h2 id="usage-title">기록된 비용과 한도</h2><p className="ops-caption">일·월 구분은 UTC 기준입니다. 아래 금액은 기록된 추정 비용의 합계이며 실제 청구액과 다를 수 있습니다.</p>
      <div className="ops-cost-windows">{(["day", "month"] as const).map(key => {
        const usage = data.usage[key];
        const exceeded = usage.limit.state === "limited" && usage.knownCost >= usage.limit.amount;
        return <div key={key}><h3>{key === "day" ? "오늘" : "이번 달"} <span>UTC</span></h3><strong className="ops-cost">{usage.events ? dollars(usage.knownCost) : "기록 없음"}</strong>
          <p>{usage.limit.state === "limited" ? `한도 ${dollars(usage.limit.amount)}` : usage.limit.state === "unlimited" ? "한도 미설정 · 무제한" : "한도 설정 오류"}</p>
          {exceeded && <p className="ops-warning">{usage.limit.state === "limited" && usage.limit.amount === 0 ? "한도 0 · 새 호출 차단 기준" : "기록된 금액이 한도에 도달했습니다"}</p>}
          <p>{usage.events}건 기록 · 금액 미상 {usage.unknownAmount}건</p><p className="ops-warning">비용 근거 미기록 {usage.unknownBasis}건</p>
        </div>;
      })}</div>
      <p className="ops-caption">금액 미상은 합계에서 빠집니다. 현재 원장에는 추정 금액과 구독 포함 여부를 구분하는 근거가 없어 0달러도 무료로 단정하지 않습니다. 기록이 없는 호출의 비용은 이 합계로 확인할 수 없습니다. 한도는 이 화면에서 변경하지 않습니다.</p>
    </section>
    <form action="/admin/audit" method="get" className="ops-filters">
      <OperationsSelect name="target" label="대상" value={query.target} options={targetLabels} />
      <OperationsSelect name="actor" label="실행 주체" value={query.actor} options={actorLabels} />
      <button type="submit">조회</button><a href="/admin/audit">초기화</a>
    </form>
    <div className="ops-list-heading"><h2>변경 목록</h2><span>페이지당 20건 · 최신 기록순</span></div>
    {data.actions.length === 0 ? <p className="ops-empty">조회 조건에 맞는 변경 이력이 없습니다.</p> : <ul className="ops-records">
      {data.actions.map(action => <li key={action.ref}>
        <div className="ops-record-heading"><h3>{actionLabels[action.action]}</h3><span className="ops-badge">{targetLabels[action.target]}</span><span className="ops-muted">{actorLabels[action.actor]}</span></div>
        <p className="ops-reference">이력 {action.ref.slice(0,12)} · 대상 {action.targetRef.slice(0,12)}</p>
        <p className="ops-audit-time"><OperationTime at={action.createdAt} /></p>
        {action.policy && <p className="ops-policy">revision {action.policy.revision} · 요청한 설정: 초안 작성 {action.policy.generation ? "ON" : "OFF"} / 자동 공개 {action.policy.publication ? "ON" : "OFF"} / 새 작업 {action.policy.jobs ? "ON" : "OFF"}</p>}
        <p className="ops-caption">{action.hasCommand ? "명령 식별자 기록됨" : "명령 식별자 미기록"} · {action.hasReason ? "사유 기록 있음 · 원문 숨김" : "사유 미기록"}</p>
      </li>)}
    </ul>}
    <OperationsPagination path="/admin/audit" query={query} hasNext={data.hasNext} />
    <p className="ops-caption">명령 기록은 작업 완료나 공개 성공을 뜻하지 않습니다. 글·오류·사유 원문과 내부 식별자는 표시하지 않으며, 참조값은 원장 식별자의 요약 hash입니다. 정책의 현재 적용 여부는 <a href="/admin/automation">자동 작성</a>에서 확인할 수 있습니다.</p>
  </div>;
}
