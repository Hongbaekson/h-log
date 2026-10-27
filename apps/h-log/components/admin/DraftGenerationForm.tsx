"use client";
import { useRef, useState } from "react";
import type { DraftCommand } from "@/lib/blog-draft-requests";

export function DraftGenerationForm({ inputHash, enabled }: { inputHash: string; enabled: boolean }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef<DraftCommand | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    pending.current ??= { commandId: crypto.randomUUID(), inputHash, reason: reason.trim() };
    setBusy(true); setMessage("요청을 저장하고 있어요.");
    try {
      const response = await fetch("/admin/automation/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pending.current), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (response.status === 202 && result.status === "accepted" && typeof result.requestId === "string") { window.location.reload(); return; }
      if (response.status >= 500) throw Error("uncertain");
      pending.current = null; setUncertain(false);
      const messages: Record<string,string> = { input_changed: "자료가 바뀌었어요. 새로고침한 뒤 확인해 주세요.", generation_disabled: "서버에서 초안 요청을 허용하지 않은 상태예요.", input_stale: "자료가 오래됐어요. 갱신한 뒤 다시 요청해 주세요.", unsafe_reason: "요청 사유에서 개인정보나 내부 주소를 빼 주세요." };
      setMessage(messages[result.error] ?? "요청을 저장하지 못했어요. 입력과 로그인 상태를 확인해 주세요.");
    } catch { setUncertain(true); setMessage("접수 여부를 확인하지 못했어요. 같은 요청을 다시 확인하거나 새로고침해 목록을 확인해 주세요."); }
    finally { setBusy(false); }
  }
  return <form className="review-editor" onSubmit={submit}>
    <label>요청 사유<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={400} rows={3} required disabled={busy || uncertain || !enabled} placeholder="요청을 남기는 이유를 간단히 적어 주세요." /></label>
    <p>요청은 실행 대기 목록에 저장됩니다. 완성된 글은 비공개 초안이며, 블로그 검토에서 읽고 수정할 수 있어요.</p>
    <p>같은 자료로 다시 요청해도 초안을 중복 생성하지 않습니다.</p>
    <div className="review-actions"><button disabled={busy || !enabled || (!uncertain && !reason.trim())} type="submit">{busy ? "저장 중…" : uncertain ? "같은 요청 다시 확인" : "비공개 초안 요청"}</button><a href="/admin/automation">목록 새로고침</a></div>
    <p role="status" aria-live="polite">{message}</p>
    <noscript>초안을 요청하려면 JavaScript를 켜 주세요. 아래 목록은 그대로 확인할 수 있습니다.</noscript>
  </form>;
}
