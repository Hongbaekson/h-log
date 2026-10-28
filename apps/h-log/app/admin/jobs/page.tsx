import { requireAdminOwner } from "@/lib/admin-server";
import { loadAdminJobs } from "@/lib/blog-admin-operations-server";
import { importanceLabels, jobStatusLabels, jobTypeLabels, parseJobsQuery } from "@/lib/blog-admin-operations";
import { AdminObservation } from "@/components/admin/AdminObservation";
import { OperationsError, OperationsPagination, OperationsSelect, OperationTime } from "@/components/admin/AdminOperations";
import "../operations.css";

const failureLabels = { none: "현재 실패 상태 아님", retry_pending: "실패 후 재시도 대기", required_failed: "필수 검증 실패", optional_failed: "후속 작업 실패" };

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminOwner();
  let query;
  try { query = parseJobsQuery(await searchParams); } catch { return <OperationsError path="/admin/jobs" invalid />; }
  let data;
  try { data = await loadAdminJobs(query); } catch { return <OperationsError path="/admin/jobs" />; }
  return <div className="admin-operations">
    <header className="admin-heading"><p>운영 기록 · 읽기 전용</p><h1>작업 원장</h1><span>발행 작업의 현재 상태와 처리 대상 버전을 확인합니다.</span></header>
    <AdminObservation observedAt={data.observedAt} />
    <aside className="ops-notice"><strong>워커 프로세스 · 미관측</strong><p>작업이 없거나 완료됐다는 기록만으로 워커가 실행 중인지, 쉬고 있는지 알 수 없습니다. 프로세스 상태는 아직 수집하지 않습니다.</p></aside>
    <form action="/admin/jobs" method="get" className="ops-filters">
      <OperationsSelect name="status" label="작업 상태" value={query.status} options={jobStatusLabels} />
      <OperationsSelect name="importance" label="작업 구분" value={query.importance} options={importanceLabels} />
      <OperationsSelect name="lease" label="처리 기한" value={query.lease} options={{ expired: "만료된 lease" }} />
      <button type="submit">조회</button><a href="/admin/jobs">초기화</a>
    </form>
    <div className="ops-list-heading"><h2>작업 목록</h2><span>페이지당 20건 · 작업 ID 순</span></div>
    {data.jobs.length === 0 ? <p className="ops-empty">조회 조건에 맞는 작업이 없습니다. 워커의 idle 여부는 별도로 확인해야 합니다.</p> : <ul className="ops-records">
      {data.jobs.map(job => <li key={job.ref}>
        <div className="ops-record-heading"><h3>{jobTypeLabels[job.type]}</h3><span className={`ops-badge ops-${job.status}`}>{jobStatusLabels[job.status]}</span><span className="ops-muted">{importanceLabels[job.importance]}</span></div>
        <p className="ops-reference">작업 {job.ref.slice(0,12)} · 글 {job.postRef.slice(0,12)}</p>
        <dl className="ops-facts">
          <div><dt>작업 대상</dt><dd>v{job.targetVersion}{!job.isCurrentVersion && <span className="ops-warning"> · 현재 버전과 다름</span>}</dd></div>
          <div><dt>현재 버전 / 공개 버전</dt><dd>{job.currentVersion ? `v${job.currentVersion}` : "없음"} / {job.publicVersion ? `v${job.publicVersion}` : "공개본 없음"}</dd></div>
          <div><dt>기록된 재시도</dt><dd>{job.retryCount}회</dd></div>
          <div><dt>작업 시작 당시 정책</dt><dd>{job.policyRevision === null ? "미기록" : `revision ${job.policyRevision}`}</dd></div>
          <div><dt>처리 기한 (lease)</dt><dd className={job.lease === "expired" ? "ops-warning" : ""}>{job.lease === "none" ? "활성 lease 없음" : job.lease === "expired" ? "기한 만료" : "기한 내"}{job.lease !== "none" && <small><OperationTime at={job.leaseExpiresAt} /></small>}</dd></div>
          <div><dt>실패 분류</dt><dd>{failureLabels[job.failure]}{job.hasError && <small>오류 원문 있음 · 상세 원인은 미분류</small>}</dd></div>
        </dl>
        <details><summary>시각과 버전 hash</summary><dl className="ops-facts">
          <div><dt>최근 시작 기록</dt><dd><OperationTime at={job.startedAt} /></dd></div>
          <div><dt>종료 필드 기록</dt><dd><OperationTime at={job.finishedAt} /></dd></div>
        </dl><p className="ops-caption">종료 필드는 현재 실행자의 기준 시각입니다. 정확한 완료 시각이나 처리 시간으로 해석하지 않습니다.</p><code className="ops-hash">{job.targetHash ?? "유효한 hash 미기록"}</code></details>
      </li>)}
    </ul>}
    <OperationsPagination path="/admin/jobs" query={query} hasNext={data.hasNext} />
    <p className="ops-caption">목록은 작업별 최신 상태입니다. 전체 실행 횟수·개별 시도 이력·최초 대기 시각·DLQ는 현재 기록하지 않습니다. lease 만료도 프로세스 중단을 입증하지 않습니다. 재시도와 일시정지는 다음 단계에서 연결합니다.</p>
  </div>;
}
