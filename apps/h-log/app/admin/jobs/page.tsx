import { requireAdminOwner } from "@/lib/admin-server";
import { loadAdminJobs } from "@/lib/blog-admin-operations-server";
import { importanceLabels, jobStatusLabels, jobTypeLabels, parseJobsQuery } from "@/lib/blog-admin-operations";
import { AdminObservation } from "@/components/admin/AdminObservation";
import { AutomationPolicyForm } from "@/components/admin/AutomationPolicyForm";
import { JobRetryForm } from "@/components/admin/JobRetryForm";
import { retrySupportedTypes } from "@/lib/blog-job-retry";
import { PERSISTENT_WORKER_RETRY_LIMIT } from "@/lib/blog-persistent-worker";
import { OperationsError, OperationsPagination, OperationsSelect, OperationTime } from "@/components/admin/AdminOperations";
import "../operations.css";
import "../posts/posts.css";
import "../automation/automation.css";

const failureLabels = { none: "현재 실패 상태 아님", retry_pending: "실패 후 재시도 대기", required_failed: "필수 검증 실패", optional_failed: "후속 작업 실패" };

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminOwner();
  let query;
  try { query = parseJobsQuery(await searchParams); } catch { return <OperationsError path="/admin/jobs" invalid />; }
  let data;
  try { data = await loadAdminJobs(query); } catch { return <OperationsError path="/admin/jobs" />; }
  return <div className="admin-operations">
    <header className="admin-heading"><p>운영 기록과 작업 관리</p><h1>작업 원장</h1><span>발행 작업의 현재 상태와 처리 대상 버전을 확인합니다.</span></header>
    <AdminObservation observedAt={data.observedAt} />
    <aside className="ops-notice"><strong>워커 프로세스 · 미관측</strong><p>작업이 없거나 완료됐다는 기록만으로 워커가 실행 중인지, 쉬고 있는지 알 수 없습니다. 프로세스 상태는 아직 수집하지 않습니다.</p></aside>
    <details className="ops-policy-control"><summary>새 작업 처리 중지·재개</summary><div className="post-review"><AutomationPolicyForm policy={data.policy} observedAt={data.observedAt} jobsOnly /></div><p className="ops-caption">먼저 승인된 작업은 완료될 수 있습니다. 공개된 글의 필수 검증과 철회는 계속하며, 프로세스를 종료하지 않습니다.</p></details>
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
        {job.status === "failed" && (retrySupportedTypes.includes(job.type) && job.isCurrentVersion && job.targetHash && job.retryCount < PERSISTENT_WORKER_RETRY_LIMIT && (job.importance === "required" ? ["failed_publish","failed_verification","publishing","verifying"].includes(job.postStatus) : job.postStatus === "published") ? <JobRetryForm target={{jobId:job.adminId,expectedRetryCount:job.retryCount,expectedPostRevision:job.postRevision,expectedVersion:job.targetVersion,expectedHash:job.targetHash}} /> : <p className="ops-caption">이 작업은 직접 재시도할 수 없습니다. 버전·재시도 상한을 확인하거나 <a href="/admin/posts">글 검토</a>에서 수정본을 준비해 주세요.</p>)}
      </li>)}
    </ul>}
    <OperationsPagination path="/admin/jobs" query={query} hasNext={data.hasNext} />
    <p className="ops-caption">목록은 작업별 최신 상태입니다. 전체 실행 횟수·개별 시도 이력·최초 대기 시각·DLQ는 현재 기록하지 않습니다. lease 만료도 프로세스 중단을 입증하지 않습니다. 자동 실패 처리와 수동 요청은 같은 {PERSISTENT_WORKER_RETRY_LIMIT}회 상한을 사용하며, 수동 요청마다 재시도 횟수를 1회 소비합니다. 공개 후 필수 검증 실패와 외부 호출의 결과가 불명확한 작업은 글 검토·운영 확인으로 복구합니다.</p>
  </div>;
}
