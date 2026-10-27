"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminPostReview } from "@/lib/blog-admin-review";
import type { EditorialClaim, EditorialCommand, EditorialDraft, EditorialReceipt } from "@/lib/blog-editorial-command";

const claimLabels: Record<EditorialClaim["type"], string> = { version: "버전", date: "날짜", price: "비용", api: "API·동작", performance: "성능", security: "보안", benchmark: "측정 결과", support: "지원 범위", opinion: "의견" };
const errors: Record<string,string> = {
  invalid_request: "입력한 내용과 길이를 확인해 주세요.", request_too_large: "본문은 128 KiB 이내로 줄여 주세요.",
  revision_conflict: "다른 요청으로 글이 바뀌었습니다. 입력을 따로 보관한 뒤 최신 버전을 열어 주세요.",
  state_conflict: "글 상태가 바뀌었거나 작업이 진행 중입니다. 최신 상태를 확인해 주세요.",
  version_conflict: "최신 수정본을 새 버전으로 저장한 뒤 검토해 주세요. 이미 발행 요청한 버전은 다시 보내지 않습니다.",
  command_conflict: "같은 요청 번호에 다른 내용이 들어갔습니다. 최신 상태를 확인해 주세요.",
  quality_blocked: "발행 검사를 통과하지 못했습니다. 본문의 주장·공식 출처 또는 근거·개인정보를 확인하고 새 버전으로 저장해 주세요.",
  publication_disabled: "서버에서 수동 발행을 아직 허용하지 않았습니다.", unsafe_reason: "변경 사유에 내부 정보나 URL을 넣지 말아 주세요.", review_required: "저장한 본문과 근거를 먼저 검토해 주세요.",
};
export function BlogEditorialActions({ review, publishEnabled }: { review: AdminPostReview; publishEnabled: boolean }) {
  const { post, version } = review;
  const [draft, setDraft] = useState<EditorialDraft>(()=>({ title: version?.title ?? post.title, description: version?.description ?? "", contentMarkdown: version?.contentMarkdown ?? "",
    claims: version?.editorialReview?.claims ?? [], evidencePaths: version?.editorialReview?.evidencePaths ?? [] }));
  const [reason,setReason] = useState("");
  const [confirmed,setConfirmed] = useState(false);
  const [retractionConfirmed,setRetractionConfirmed] = useState(false);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [pending,setPending] = useState<EditorialCommand | null>(null);
  const [dirty,setDirty] = useState(false);
  const unsaved = useRef(false);
  useEffect(()=>{
    const unload = (event: BeforeUnloadEvent)=>{ if (unsaved.current) { event.preventDefault(); event.returnValue=""; } };
    const leave = (event: MouseEvent)=>{
      const link = (event.target as Element).closest("a[href]");
      if (unsaved.current && link && link.getAttribute("target") !== "_blank" && !link.getAttribute("href")?.startsWith("#")
        && !window.confirm("저장하지 않은 내용이나 결과를 확인하지 못한 요청이 있습니다. 이 화면을 나갈까요?")) { event.preventDefault(); event.stopPropagation(); }
    };
    addEventListener("beforeunload",unload); document.addEventListener("click",leave,true);
    return ()=>{ removeEventListener("beforeunload",unload); document.removeEventListener("click",leave,true); };
  },[]);
  if (!version) return null;
  const latest = version.versionNo === review.latestVersionNo;
  const canSave = latest && !["retracted","unpublished","queued","researching","publishing","verifying"].includes(post.status) && version.contentMarkdown !== null;
  const canPublish = canSave && publishEnabled && !!version.editorialReview && review.hashMatches === true && !review.jobs.length && !(post.status === "published" && version.id === post.currentVersionId);
  const canRetract = ["published","correction_pending"].includes(post.status) && version.id === post.currentVersionId;
  function change(value: Partial<EditorialDraft>) { setDraft(prev=>({...prev,...value})); setDirty(true); setConfirmed(false); setRetractionConfirmed(false); unsaved.current=true; }
  function claim(index: number, value: Partial<EditorialClaim>) { change({ claims: draft.claims.map((c,i)=>i===index?{...c,...value}:c) }); }
  async function send(command: EditorialCommand) {
    setBusy(true); setPending(command); unsaved.current=true; setMessage("");
    try {
      const response = await fetch("/admin/posts/commands", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(command), signal:AbortSignal.timeout(20000), cache:"no-store" });
      const data = await response.json() as EditorialReceipt & {error?:string};
      if (!response.ok) {
        if (response.status >= 500 || response.status === 408) throw new Error("uncertain");
        setPending(null); unsaved.current=dirty; setMessage(errors[data.error ?? ""] ?? "요청이 거부됐습니다. 인증과 최신 상태를 확인해 주세요."); return;
      }
      if (data.postId !== post.id || !Number.isInteger(data.versionNo) || !Number.isInteger(data.commandRevision)) throw new Error("uncertain");
      unsaved.current=false; setPending(null);
      const url = new URL(location.href); url.searchParams.set("version",String(data.versionNo)); url.hash="post-review";
      // Publishing/retraction keep the version URL; assigning only the same hash would leave stale controls.
      if (url.href === location.href) location.reload();
      else location.assign(url.pathname+url.search+url.hash);
    } catch { setMessage("처리 결과를 확인하지 못했습니다. 같은 요청을 다시 확인해 주세요. 이 화면을 닫으면 요청 정보가 사라집니다."); }
    finally { setBusy(false); }
  }
  function submit(action: EditorialCommand["action"]) {
    if (!reason.trim()) { setMessage("변경 사유를 적어 주세요."); return; }
    if (action === "retract" && !retractionConfirmed) return;
    const command: EditorialCommand = { action, commandId:crypto.randomUUID(), postId:post.id, expectedRevision:post.commandRevision, expectedStatus:post.status,
      expectedCurrentVersionId:post.currentVersionId, versionId:version!.id, reason,
      ...(action === "save" ? {draft:{...draft,evidencePaths:draft.evidencePaths.map(path=>path.trim()).filter(Boolean)}} : action === "publish" ? {contentHash:version!.contentHash,confirmed} : {}) };
    void send(command);
  }
  return <section className="review-editor" aria-label="글 수정과 발행">
    <h3>글 수정과 발행</h3>
    <noscript><p>수정본 저장과 발행·철회에는 JavaScript가 필요합니다.</p></noscript>
    <p>기존 글의 수정본을 새 버전으로 저장합니다. 저장만으로 공개본은 바뀌지 않습니다. 새 글은 <a href="/admin/automation">자동 작성</a>에서 비공개 초안으로 요청할 수 있어요.</p>
    {!latest && <p>이전 버전은 읽기만 가능합니다. 버전 번호에서 최신 v{review.latestVersionNo}을 열어 주세요.</p>}
    <details><summary>수정본과 근거 작성</summary>
      <fieldset disabled={!canSave || busy || !!pending}>
        <label>제목<input value={draft.title} maxLength={200} onChange={e=>change({title:e.target.value})} /></label>
        <label>요약<textarea rows={3} value={draft.description} maxLength={1000} onChange={e=>change({description:e.target.value})} /></label>
        <label>본문 (Markdown)<textarea className="review-markdown" rows={14} value={draft.contentMarkdown} onChange={e=>change({contentMarkdown:e.target.value})} /></label>
        <label>확인한 코드·실험 기록 (한 줄에 하나)<textarea rows={2} value={draft.evidencePaths.join("\n")} onChange={e=>change({evidencePaths:e.target.value.split("\n")})} /></label>
        <p>내부 경로 대신 공개 가능한 근거 이름이나 상대 경로를 적어 주세요. 실험 글은 근거가 필요합니다.</p>
        <h4>검토할 주장</h4><p>본문에 있는 문장을 그대로 옮겨 근거를 연결하세요. 사실·수치와 의견을 구분하고, 사실 주장에는 공식 출처 또는 확인한 기록을 남겨 주세요.</p>
        {draft.claims.map((c,i)=><div className="review-claim" key={i}>
          <label>주장 {i+1}<textarea rows={2} maxLength={2000} value={c.text} onChange={e=>claim(i,{text:e.target.value})} /></label>
          <label>주장 {i+1} 유형<select value={c.type} onChange={e=>claim(i,{type:e.target.value as EditorialClaim["type"]})}>{Object.entries(claimLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
          <label>주장 {i+1} 출처<select value={c.sourceId} onChange={e=>claim(i,{sourceId:e.target.value})}><option value="">연결하지 않음</option>{review.sources.map(s=><option key={s.id} value={s.id}>{s.title} ({s.role})</option>)}</select></label>
          <label>주장 {i+1} 확인 기록<input maxLength={300} value={c.evidencePath} onChange={e=>claim(i,{evidencePath:e.target.value})} /></label>
          <label>주장 {i+1} 근거 발췌 (240자 이내)<textarea rows={2} maxLength={240} value={c.evidenceQuote} onChange={e=>claim(i,{evidenceQuote:e.target.value})} /></label>
          <button type="button" onClick={()=>change({claims:draft.claims.filter((_,n)=>n!==i)})}>주장 {i+1} 삭제</button>
        </div>)}
        {draft.claims.length<30 && <button type="button" onClick={()=>change({claims:[...draft.claims,{text:"",type:"api",sourceId:"",evidencePath:"",evidenceQuote:""}]})}>주장 추가</button>}
      </fieldset>
    </details>
    <fieldset disabled={busy || !!pending}>
      <label>변경 사유<input maxLength={400} value={reason} onChange={e=>setReason(e.target.value)} /></label>
      <div className="review-actions"><button type="button" disabled={!canSave} onClick={()=>submit("save")}>새 버전으로 저장</button></div>
      <label className="review-confirm"><input type="checkbox" checked={confirmed} disabled={dirty || !canPublish} onChange={e=>setConfirmed(e.target.checked)} />저장된 v{version.versionNo}의 본문 전체와 주장·근거, 개인정보·조직명, 표현을 검토했습니다.</label>
      <p>발행 요청 후 기존 공개본은 잠시 내려갑니다. 워커가 본문·개인정보를 검사한 뒤 공개하고, 공개 URL 검사에 실패하면 다시 숨깁니다. 서버 검사만으로 사실 확인이 끝나는 것은 아닙니다.</p>
      {!publishEnabled && <p>서버의 수동 발행 허용이 꺼져 있습니다.</p>}
      {dirty && <p>수정한 내용을 저장하고 새 버전을 다시 검토해 주세요.</p>}
      {canRetract && <label className="review-confirm"><input type="checkbox" checked={retractionConfirmed} disabled={dirty} onChange={e=>setRetractionConfirmed(e.target.checked)} />철회하면 이 글이 공개 목록과 본문에서 내려가는 것을 확인했습니다.</label>}
      <div className="review-actions">
        <button type="button" disabled={!canPublish || !confirmed || dirty} onClick={()=>submit("publish")}>검토한 버전 발행 요청</button>
        <button type="button" className="review-retract" disabled={!canRetract || !retractionConfirmed || dirty} onClick={()=>submit("retract")}>현재 공개 글 철회</button>
      </div>
    </fieldset>
    {message && <p role="alert">{message}</p>}
    {pending && !busy && <button type="button" onClick={()=>void send(pending)}>같은 요청 다시 확인</button>}
    {busy && <p role="status">처리 결과를 확인하고 있습니다.</p>}
  </section>;
}
