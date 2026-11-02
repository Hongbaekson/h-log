import { requireAdminOwner } from "@/lib/admin-server";
import { loadAdminMonitoring } from "@/lib/admin-monitoring-server";
import { monitoringResultLabels, monitoringStateLabels, monitoringTaskLabels } from "@/lib/admin-monitoring";
import { AdminObservation } from "@/components/admin/AdminObservation";
import { OperationTime } from "@/components/admin/AdminOperations";
import "../operations.css";
import "./monitoring.css";

const sourceLabels = { db: "DB·비용", expectations: "예정 스케줄", ...monitoringTaskLabels };
const scheduleLabels = { enabled: "예정 스케줄 활성", disabled: "예정 스케줄 비활성", maintenance: "정비 시간" };
const dollars = (value: number) => new Intl.NumberFormat("ko-KR", { style: "currency", currency: "USD", maximumFractionDigits: 6 }).format(value);

export default async function AdminMonitoringPage() {
  await requireAdminOwner();
  const snapshot = await loadAdminMonitoring();
  const data = snapshot.data;
  return <div className="admin-operations admin-monitoring">
    <header className="admin-heading"><p>운영 상태 · 읽기 전용</p><h1>운영 모니터링</h1><span>서비스 응답과 실행 기록을 함께 확인합니다.</span></header>
    <div className="monitor-actions"><a href="/admin/monitoring">다시 조회</a><span>자동 발행이나 재시도 설정은 바꾸지 않습니다.</span></div>
    <AdminObservation observedAt={snapshot.observedAt} />
    {snapshot.connection !== "ready" && <section className="ops-error monitor-section" role="status">
      <h2>{snapshot.connection === "unconfigured" ? "모니터링 연결이 설정되지 않았습니다" : "모니터링을 불러오지 못했습니다"}</h2>
      <p>{snapshot.connection === "unconfigured" ? "서버의 비공개 모니터링 연결을 설정하면 수집된 상태를 확인할 수 있습니다." : "연결 또는 지표 응답을 확인하지 못했습니다. 잠시 후 다시 조회해 주세요."} 확인하지 못한 상태를 정상이나 0으로 표시하지 않습니다.</p>
    </section>}
    {data && <>
      <section className="monitor-section" aria-labelledby="services-title"><h2 id="services-title">서비스와 수집 상태</h2>
        <p className="ops-caption">최근 3분 안에 수집된 응답입니다. HTTP·DB 연결 확인과 작업 완료는 별개입니다.</p>
        <dl className="monitor-services">{data.services.map(service => <div key={service.key}><dt>{service.label}</dt><dd className={service.state === "ready" ? "monitor-ready" : "ops-warning"}>{service.state === "ready" ? "정상 응답" : service.state === "down" ? "확인 실패" : monitoringStateLabels[service.state]}</dd></div>)}</dl>
      </section>
      <section className="monitor-section" aria-labelledby="runs-title"><h2 id="runs-title">최근 실행과 검증 성공</h2>
        <p className="ops-caption">예정 스케줄은 운영 설정의 기대값입니다. 실제 타이머·워커 프로세스의 실행 여부는 이 값만으로 알 수 없습니다.</p>
        <p className="ops-caption">스케줄 수집 상태: <strong>{monitoringStateLabels[data.sources.find(source => source.key === "expectations")!.state]}</strong></p>
        <ul className="ops-records">{data.tasks.map(task => <li key={task.key}>
          <div className="ops-record-heading"><h3>{monitoringTaskLabels[task.key]}</h3><span className="ops-badge">{task.schedule ? scheduleLabels[task.schedule] : "스케줄 미확인"}</span>{task.state !== "ready" && <span className="ops-warning">{monitoringStateLabels[task.state]}</span>}</div>
          <dl className="ops-facts monitor-task-facts">
            <div><dt>최근 시도</dt><dd>{task.state === "ready" ? <OperationTime at={task.lastAttemptAt} /> : "확인 불가"}</dd></div>
            <div><dt>최근 실행 결과</dt><dd>{task.result ? monitoringResultLabels[task.result] : "확인 불가"}</dd></div>
            <div><dt>{task.key === "autopublish" ? "필수 검증을 마친 발행 성공" : task.key === "backup" ? "백업 파일 검사 성공" : "격리 복구 검증 성공"}</dt><dd>{task.state !== "ready" ? "확인 불가" : task.lastSuccessAt ? <OperationTime at={task.lastSuccessAt} /> : "성공 이력 없음"}</dd></div>
          </dl>
        </li>)}</ul>
        <p className="ops-caption">발행 성공은 해당 실행의 공개 버전·필수 검증 6종·본문 hash를 확인한 기록입니다. 초안 생성·건너뜀·워커 idle과 구분합니다. 최근 시도가 실패해도 이전 성공 시각은 보존합니다. 백업 파일 생성과 실제 복구 검증도 각각 확인합니다.</p>
      </section>
      <section className="monitor-section" aria-labelledby="cost-title"><h2 id="cost-title">기록된 비용</h2>
        <p className="ops-caption">UTC 일·월 기준입니다. 근거가 있는 금액만 합산하므로 실제 청구액과 다를 수 있습니다.</p>
        <div className="ops-cost-windows">{data.costs.map(cost => <div key={cost.window}><h3>{cost.window === "day" ? "오늘" : "이번 달"} <span>UTC</span></h3>
          <strong className="ops-cost">{cost.knownCost === null ? "확인 불가" : dollars(cost.knownCost)}</strong>
          {cost.state !== "ready" ? <p className="ops-warning">{monitoringStateLabels[cost.state]}</p> : <>
            <p className={cost.unknownEvents ? "ops-warning" : ""}>금액·근거 미확인 {cost.unknownEvents}건 · 합계에서 제외</p><p>구독 포함 기록 {cost.includedEvents}건</p>
            <p>{cost.budget === "invalid" ? "한도 설정 오류" : cost.budget === "unlimited" ? "한도 미설정 · 무제한" : cost.budget === "zero" ? "한도 0 · 새 호출 차단 기준" : `한도 ${dollars(cost.limit!)}`}</p>
          </>}
        </div>)}</div>
        <p className="ops-caption">0달러가 모든 호출의 무료 이용을 뜻하지 않습니다. 이 화면에서 비용 한도를 변경하지 않습니다.</p>
      </section>
      <details className="monitor-sources"><summary>수집 시각과 원본 상태</summary><dl className="ops-facts">{data.sources.map(source => <div key={source.key}><dt>{sourceLabels[source.key]}</dt><dd>{monitoringStateLabels[source.state]}<small>마지막 수집 성공: <OperationTime at={source.collectedAt} /></small></dd></div>)}</dl></details>
    </>}
    <section className="monitor-section monitor-grafana" aria-labelledby="grafana-title"><h2 id="grafana-title">자세한 지표는 Grafana에서</h2>
      <p>로컬 모니터링이 실행 중이거나 SSH 터널이 연결돼 있어야 합니다. Grafana 소유자 계정으로 별도 로그인해 주세요.</p>
      <a href="http://127.0.0.1:3030/d/hlog-operations" target="_blank" rel="noreferrer">로컬 터널에서 Grafana 열기 <span className="sr-only">(새 창)</span><span aria-hidden="true">↗</span></a>
      <p className="ops-caption">같은 서버의 모니터링은 서버 전체가 멈추면 함께 중단됩니다. 독립 외부 감시와 운영 적용은 별도 검증이 필요합니다.</p>
    </section>
  </div>;
}
