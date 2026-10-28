"use client";
import { useRef, useState } from "react";
import type { JobRetryCommand } from "@/lib/blog-job-retry";

export function JobRetryForm({ target }: { target: Omit<JobRetryCommand,"commandId"|"reason"|"confirmed"> }) {
  const [reason,setReason]=useState(""); const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false), [uncertain,setUncertain]=useState(false), [message,setMessage]=useState("");
  const pending=useRef<JobRetryCommand|null>(null);
  async function submit(event:React.FormEvent) {
    event.preventDefault(); if(busy) return;
    pending.current ??= {...target,commandId:crypto.randomUUID(),reason:reason.trim(),confirmed:true};
    setBusy(true);setMessage("재시도를 요청하고 있어요.");
    try {
      const response=await fetch("/admin/jobs/retry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(pending.current),signal:AbortSignal.timeout(20000)});
      const result=await response.json();
      if(response.ok && result.status==="queued") {window.location.reload();return;}
      if(response.status>=500) throw Error("uncertain");
      pending.current=null;setUncertain(false);
      const errors:Record<string,string>={automation_paused:"새 작업 처리 또는 발행이 허용되지 않았어요. 위 설정과 서버 허용 상태를 확인해 주세요.",retry_limit:"재시도 상한에 도달했어요. 원인을 다시 확인해 주세요.",unsafe_reason:"사유에서 개인정보와 내부 주소를 빼 주세요.",retry_not_supported:"이 작업은 여기서 재시도할 수 없어요. 글 검토나 운영 확인이 필요합니다."};
      setMessage(errors[result.error]??"작업이나 버전이 바뀌었을 수 있어요. 새로고침한 뒤 확인해 주세요.");
    } catch {setUncertain(true);setMessage("접수 여부를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.");}
    finally {setBusy(false);}
  }
  return <details className="ops-retry"><summary>이 작업 재시도</summary><form onSubmit={submit}>
    <p>같은 버전의 작업 한 건을 다시 대기시킵니다. 실행은 워커가 맡으며, 기존 재시도 횟수와 원인 기록은 보존합니다.</p>
    <label>조치한 내용<textarea rows={2} required maxLength={400} value={reason} disabled={busy||uncertain} onChange={e=>setReason(e.target.value)} /></label>
    <label className="ops-confirm"><input type="checkbox" required checked={confirmed} disabled={busy||uncertain} onChange={e=>setConfirmed(e.target.checked)} />실패 원인과 v{target.expectedVersion}의 hash를 확인했고, 재처리가 안전하다고 판단했습니다.</label>
    <button disabled={busy||(!uncertain&&(!confirmed||!reason.trim()))} type="submit">{busy?"접수 중…":uncertain?"같은 재시도 요청 확인":"한 건 재시도 요청"}</button>
    <p role="status">{message}</p><noscript>재시도 요청에는 JavaScript가 필요합니다.</noscript>
  </form></details>;
}
