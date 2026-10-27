"use client";
import { useRef, useState } from "react";
import type { AutomationCommand, AutomationFlags, AutomationPolicy } from "@/lib/blog-automation-policy";

const labels: Record<keyof AutomationFlags, string> = { generation: "초안 생성 허용", publication: "자동 공개 허용", jobs: "새 작업 처리 허용" };
const descriptions: Record<keyof AutomationFlags, string> = { generation: "초안 요청과 일일 작성에 적용해요.", publication: "일일 작성 결과가 검사를 통과하면 공개를 진행해요. 끄면 초안으로 남깁니다.", jobs: "끄면 새 생성과 발행, 선택 후처리를 시작하지 않아요. 공개된 글의 필수 검증과 철회는 계속할 수 있어요." };
const blocked = { policy_off: "설정에서 꺼짐", server_disabled: "서버에서 허용하지 않음", jobs_paused: "새 작업 처리가 중지됨" };

export function AutomationPolicyForm({ policy, observedAt }: { policy: AutomationPolicy; observedAt: string }) {
  const [requested, setRequested] = useState(policy.requested);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [message, setMessage] = useState("");
  const pending = useRef<AutomationCommand | null>(null);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    pending.current ??= { ...requested, commandId: crypto.randomUUID(), expectedRevision: policy.revision, reason: reason.trim() };
    setBusy(true); setMessage("설정을 저장하고 있어요.");
    try {
      const response = await fetch("/admin/automation/policy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pending.current), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (response.ok && Number.isInteger(result.revision)) { window.location.reload(); return; }
      if (response.status >= 500) throw Error("uncertain");
      pending.current = null; setUncertain(false);
      setMessage(result.error === "revision_conflict" ? "다른 화면에서 설정을 바꿨어요. 새로고침한 뒤 다시 확인해 주세요." : result.error === "unsafe_reason" ? "변경 사유에서 개인정보와 내부 주소를 빼 주세요." : "저장하지 못했어요. 입력과 로그인 상태를 확인해 주세요.");
    } catch { setUncertain(true); setMessage("저장 여부를 확인하지 못했어요. 같은 요청을 다시 확인해 주세요."); }
    finally { setBusy(false); }
  }
  return <form className="review-editor automation-policy" onSubmit={save}>
    <p>저장된 설정 #{policy.revision} · <time dateTime={observedAt}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(observedAt))}</time> 확인</p>
    {(Object.keys(labels) as (keyof AutomationFlags)[]).map(key => <div className="automation-option" key={key}>
      <label><input type="checkbox" checked={requested[key]} disabled={busy || uncertain} onChange={e => setRequested({ ...requested, [key]: e.target.checked })} />{labels[key]}</label>
      <p>{descriptions[key]}</p>
      <p className="automation-effective">저장된 설정: {policy.requested[key] ? "ON" : "OFF"} · 실제 허용: {policy.effective[key] ? "ON" : "OFF"}{policy.reasons[key] && ` · ${blocked[policy.reasons[key]]}`}</p>
    </div>)}
    <label>설정 변경 사유<textarea rows={2} maxLength={400} value={reason} required disabled={busy || uncertain} onChange={e => setReason(e.target.value)} placeholder="설정을 바꾸는 이유를 적어 주세요." /></label>
    <p>실제 허용 상태는 이 서버의 설정 기준입니다. 실행자도 각 서버의 허용 범위를 다시 확인해요. 설정을 저장해도 타이머나 프로세스를 켜고 끄지는 않습니다.</p>
    <div className="review-actions"><button type="submit" disabled={busy || (!uncertain && !reason.trim())}>{busy ? "저장 중…" : uncertain ? "같은 설정 요청 다시 확인" : "자동화 설정 저장"}</button><a href="/admin/automation">상태 새로고침</a></div>
    <p role="status" aria-live="polite">{message}</p>
    <noscript>설정을 바꾸려면 JavaScript를 켜 주세요. 저장된 설정과 실행 현황은 그대로 읽을 수 있습니다.</noscript>
  </form>;
}
