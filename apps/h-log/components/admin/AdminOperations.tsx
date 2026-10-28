import type { AuditQuery, JobsQuery } from "@/lib/blog-admin-operations";

export function OperationsSelect({ name, label, value, options }: { name: string; label: string; value: string; options: Record<string, string> }) {
  return <label>{label}<select name={name} defaultValue={value}><option value="all">전체</option>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}
export function OperationsPagination({ path, query, hasNext }: { path: string; query: JobsQuery | AuditQuery; hasNext: boolean }) {
  const href = (page: number) => {
    const params = new URLSearchParams(Object.entries({ ...query, page }).map(([key, value]) => [key, String(value)]));
    return `${path}?${params}`;
  };
  return <nav className="ops-pagination" aria-label="조회 페이지">
    {query.page > 1 ? <a href={href(query.page - 1)}>← 이전 페이지</a> : <span />}
    <span>{query.page} 페이지</span>
    {hasNext && query.page < 10000 ? <a href={href(query.page + 1)}>다음 페이지 →</a> : <span>{hasNext ? "조회 범위 끝" : "마지막 페이지"}</span>}
  </nav>;
}
export function OperationsError({ path, invalid = false }: { path: string; invalid?: boolean }) {
  return <section className="ops-error" role="alert">
    <h2>{invalid ? "조회 조건을 확인해 주세요" : path === "/admin/jobs" ? "작업을 불러오지 못했습니다" : "이력을 불러오지 못했습니다"}</h2>
    <p>{invalid ? "지원하는 필터와 1~10,000 사이의 페이지를 선택해 주세요." : "저장소 연결 또는 조회 중 오류가 발생했습니다. 기록이 없는 상태와는 다릅니다. 잠시 후 다시 조회해 주세요."}</p>
    <a href={path}>{invalid ? "조회 조건 초기화" : "다시 조회"}</a>
  </section>;
}
export function OperationTime({ at }: { at: string | null }) {
  return at ? <time dateTime={at}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(at))} KST</time> : <>미기록</>;
}
