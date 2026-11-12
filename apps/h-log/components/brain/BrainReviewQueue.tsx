import { brainReviewFilterLabels, brainReviewReasonLabels, brainReviewStatusLabels, type BrainReviewQuery, type BrainReviewQueue as Queue } from "@/lib/brain-review";

export function BrainReviewQueue({ query, queue, error }: { query: BrainReviewQuery; queue: Queue | null; error: string }) {
  const href = (extra: Record<string, string>) => `/admin/brain?${new URLSearchParams({ status: query.status, reason: query.reason, ...extra })}`;
  return <details className="capture-review-queue">
    <summary>다시 확인할 기록</summary>
    <p className="capture-help">질문과 연결, 직접 남긴 확인 요청을 기준으로 찾습니다. 오래된 기록을 틀린 내용으로 판단하지는 않습니다.</p>
    <form action="/admin/brain" method="get" className="capture-fields">
      <label>재검토 상태<select name="status" defaultValue={query.status}>{Object.entries(brainReviewFilterLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>재검토 이유<select name="reason" defaultValue={query.reason}><option value="all">모든 이유</option>{Object.entries(brainReviewReasonLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <div className="capture-actions"><button type="submit">목록 조회</button></div>
    </form>
    {error && <p role="alert" className="capture-error">{error} <a href={href({})}>목록 다시 조회</a></p>}
    {queue && <>
      {!queue.notes.length && <p className="capture-help">이 조건에 맞는 기록이 없습니다.</p>}
      <ul className="capture-review-list">{queue.notes.map(note => <li key={note.id}>
        <a href={href({ note: note.id, ...(query.after ? { after: query.after } : {}) })}>{note.title}</a>
        <small>v{note.revision} · {brainReviewStatusLabels[note.status]} · {note.reasons.map(reason => brainReviewReasonLabels[reason]).join(" · ") || "지정된 이유 없음"}</small>
        {note.checkedAt && <small>확인 시각 {new Date(note.checkedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</small>}
      </li>)}</ul>
      <div className="capture-actions">{query.after && <a href={href({})}>첫 페이지</a>}{queue.nextCursor && <a href={href({ after: queue.nextCursor })}>다음 20개</a>}</div>
    </>}
  </details>;
}
