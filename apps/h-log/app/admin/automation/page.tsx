import Link from "next/link";
import { requireAdminOwner } from "@/lib/admin-server";
import { loadDraftRequests } from "@/lib/blog-draft-server";
import { DraftGenerationForm } from "@/components/admin/DraftGenerationForm";
import { AutomationPolicyForm } from "@/components/admin/AutomationPolicyForm";
import "../posts/posts.css";
import "./automation.css";
const labels: Record<string,string> = { queued: "실행 대기", running: "작성 중", result_ready: "초안 저장 대기", completed: "초안 저장 완료", blocked: "작성 중단", needs_review: "실행 결과 확인 필요" };
const reasons: Record<string,string> = { budget_exceeded: "사용 한도에 도달해 중단했습니다.", input_stale: "자료가 오래되어 중단했습니다.", input_unsafe: "자료가 개인정보 검사를 통과하지 못했습니다.", input_changed: "저장된 자료를 확인해야 합니다.", input_unavailable: "자료 또는 저장소를 확인해야 합니다.", generation_failed: "글의 근거나 품질 검사를 통과하지 못했습니다.", no_topic: "작성할 주제를 고르지 못했습니다.", weak_sources: "출처가 충분하지 않습니다.", provider_outcome_unknown: "외부 생성 결과가 불명확합니다. 확인 전에는 새 생성을 실행하지 않습니다.", result_persistence_failed: "생성 이후 저장이 끝나지 않았습니다. 보관된 결과가 있으면 재실행 시 저장만 이어갑니다.", interrupted_before_provider: "작성 전에 실행이 중단됐습니다. 상태를 확인해야 합니다." };
export default async function AutomationPage() {
  await requireAdminOwner();
  const heading = <header className="admin-heading"><p>내 글 관리</p><h1>자동 작성</h1><span>준비된 자료로 초안을 요청하고, 작성 결과를 확인하세요.</span></header>;
  let data: Awaited<ReturnType<typeof loadDraftRequests>>;
  try { data = await loadDraftRequests(); }
  catch { return <>{heading}<p role="alert">요청 목록을 불러오지 못했어요. 저장소 설정을 확인한 뒤 다시 열어 주세요.</p></>; }
  return <div className="post-review draft-requests">{heading}
    <section className="review-detail" aria-labelledby="automation-policy-title">
      <div className="review-section-heading"><h2 id="automation-policy-title">자동화 허용 설정</h2><span className="review-status">설정 #{data.automation.policy.revision}</span></div>
      <AutomationPolicyForm policy={data.automation.policy} observedAt={data.automation.observedAt} />
    </section>
    <section className="review-detail" aria-labelledby="automation-inflight-title">
      <div className="review-section-heading"><h2 id="automation-inflight-title">이미 시작한 작업</h2><a href="/admin/automation">새로고침</a></div>
      <p className="review-caption">중지 전에 허용한 호출은 이후에 시작되거나 끝날 수 있어요. 중지 뒤 도착한 생성 결과는 초안으로 남고, 새 공개는 다시 허용하기 전까지 진행하지 않습니다.</p>
      {data.automation.inflight.length ? <ul className="draft-history">{data.automation.inflight.map(r => <li key={`${r.kind}-${r.id}`}><span>{r.kind}</span><span>허용 당시 설정 #{r.revision ?? "기록 없음"}</span><small>{r.admittedAt ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(r.admittedAt)) : "시각 기록 없음"} · {r.status === "needs_review" ? "결과 확인 필요" : r.status === "lease_expired" ? "실행 기한 만료 · 재확인 필요" : "실행 예약됨 · 완료 전"}</small><small>{r.id}</small></li>)}</ul> : <p className="review-empty">완료되지 않은 실행 예약이 없습니다.</p>}
      <p className="review-caption">종류별 최대 20개 예약을 표시합니다. 예약 기록만으로 프로세스가 살아 있는지 알 수는 없어요. 타이머와 프로세스 상태: 확인되지 않음.</p>
    </section>
    <section className="review-detail" aria-labelledby="draft-request-title">
      <div className="review-section-heading"><h2 id="draft-request-title">새 초안 요청</h2><span className="review-status">{data.enabled ? "요청 가능" : "요청 중지"}</span></div>
      {!data.enabled && <p className="review-caption">초안 생성과 새 작업 처리가 모두 허용되어야 요청할 수 있어요. 위 설정의 차단 이유를 확인해 주세요.</p>}
      {data.input ? <><h3 className="draft-input-title">{data.input.title}</h3><p className="review-caption">출처 {data.input.sourceCount}개 · 이 자료를 바탕으로 작성할 주제를 고릅니다.</p><DraftGenerationForm inputHash={data.input.hash} enabled={data.enabled} /></> : <p>{data.inputError}</p>}
    </section>
    <section className="review-detail" aria-labelledby="draft-history-title">
      <div className="review-section-heading"><h2 id="draft-history-title">최근 요청</h2><a href="/admin/automation">새로고침</a></div>
      <p className="review-caption">최근 20개 · 시각은 한국 기준입니다. 화면을 다시 열어도 요청은 남아 있어요.</p>
      {data.requests.length === 0 ? <p className="review-empty">아직 요청한 초안이 없습니다.</p> : <ol className="draft-history">{data.requests.map(r => <li key={r.id}>
        <span className="review-status">{labels[r.status] ?? "상태 확인 필요"}</span><time dateTime={r.createdAt}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(r.createdAt))}</time>
        <small>요청 {r.id}</small>{r.reasonCode && <p>{reasons[r.reasonCode] ?? "실행 기록을 확인해야 합니다."}</p>}
        {r.postId && <Link href={`/admin/posts?post=${encodeURIComponent(r.postId)}#post-review`} prefetch={false}>비공개 초안 검토</Link>}
      </li>)}</ol>}
    </section>
    <p className="review-caption">수동으로 요청한 초안은 자동 공개하지 않습니다. 블로그 검토에서 저장본을 확인한 뒤 발행을 요청하세요.</p>
  </div>;
}
