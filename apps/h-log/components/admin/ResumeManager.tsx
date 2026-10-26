"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, FileText, LockKeyhole, Upload } from "lucide-react";
import { resumePdfLimits, type ResumeCommand, type ResumeDetail, type ResumeNoteCommand, type ResumeReceipt, type ResumeState } from "@/lib/resume-pdf";

type Pending = { kind: "upload"; command: ResumeCommand; file: File } | { kind: "note"; command: ResumeNoteCommand };
const messages: Record<string, string> = {
  invalid_request: "입력한 내용을 확인해 주세요.", unsupported_media_type: "PDF 파일만 등록할 수 있습니다.", request_too_large: "파일은 5 MiB 이하로 골라 주세요.",
  pdf_invalid: "파일을 읽지 못했습니다. 원본 문서에서 PDF로 다시 내보내 주세요.", pdf_unsupported: "검사할 수 없는 내용이 있습니다. 암호·첨부·양식 없이 새 PDF로 내보내 주세요.",
  pdf_privacy_blocked: "연락처나 비공개 정보가 검출됐습니다. 원본을 수정한 뒤 다시 등록해 주세요.", pdf_timeout: "검사에 시간이 너무 오래 걸립니다. 이미지 용량을 줄여 다시 내보내 주세요.",
  pdf_processor_unavailable: "지금은 PDF 검사 도구를 사용할 수 없습니다. 잠시 뒤 같은 요청으로 다시 확인해 주세요.", pdf_busy: "다른 파일을 확인하고 있습니다. 잠시 뒤 같은 요청으로 다시 시도해 주세요.",
  revision_conflict: "다른 창에서 보관함이 바뀌었습니다. 목록을 새로 불러온 뒤 다시 저장해 주세요.", command_conflict: "이 요청으로 저장을 확인할 수 없습니다. 목록을 새로 불러와 주세요.",
  storage_full: "보관할 수 있는 파일 20개를 모두 채웠습니다. 기존 파일은 그대로 보관됩니다.", file_not_found: "파일을 찾지 못했습니다. 목록을 새로 불러와 주세요.",
};
const date = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
const subscribe = () => () => {};

export function ResumeManager({ initialState }: { initialState: ResumeState }) {
  const [state, setState] = useState(initialState);
  const [detail, setDetail] = useState<ResumeDetail | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading");
  const [imageAttempt, setImageAttempt] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const locked = !hydrated || busy || pending !== null;

  async function loadDetail(id: string) {
    const response = await fetch(`/admin/resume/records?id=${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error("load_failed");
    const value: ResumeDetail = await response.json();
    setDetail(value); setNote(value.note); setPage(1); setImageState("loading"); setImageAttempt(attempt => attempt + 1); setZoomed(false);
  }
  async function refresh(id = detail?.id) {
    const response = await fetch("/admin/resume/records", { cache: "no-store" });
    if (!response.ok) throw new Error("load_failed");
    setState(await response.json());
    if (id) await loadDetail(id);
  }
  async function select(id: string) {
    if (detail && note !== detail.note && !window.confirm("저장하지 않은 메모를 두고 다른 파일을 열까요?")) return;
    setBusy(true); setMessage("");
    try { await loadDetail(id); } catch { setMessage("파일 정보를 불러오지 못했습니다. 다시 선택해 주세요."); }
    finally { setBusy(false); }
  }
  async function send(request: Pending) {
    setBusy(true); setPending(request); setMessage(request.kind === "upload" ? "모든 페이지를 검사하고 있습니다. 잠시만 기다려 주세요." : "메모를 저장하고 있습니다.");
    try {
      const response = await fetch(`/admin/resume/${request.kind === "upload" ? "files" : "records"}`, {
        method: "POST", cache: "no-store",
        headers: request.kind === "upload" ? { "content-type": "application/pdf", "x-hlog-command-id": request.command.commandId, "x-hlog-expected-revision": String(request.command.expectedRevision) } : { "content-type": "application/json" },
        body: request.kind === "upload" ? request.file : JSON.stringify(request.command),
      });
      const result: ResumeReceipt & { error?: string; existingId?: string } = await response.json();
      if (!response.ok) {
        if (response.status < 500 && ![408, 429].includes(response.status)) setPending(null);
        if (result.error === "duplicate_file" && result.existingId) {
          await refresh(result.existingId); setFile(null); if (input.current) input.current.value = "";
          setMessage("같은 파일이 이미 보관돼 있습니다. 기존 파일을 열었습니다."); return;
        }
        setMessage(messages[result.error ?? ""] ?? "저장 결과를 확인하지 못했습니다. 아래 버튼으로 같은 요청을 다시 확인해 주세요."); return;
      }
      setPending(null);
      if (request.kind === "upload") { setFile(null); if (input.current) input.current.value = ""; }
      try {
        await refresh(result.targetId);
        setMessage(request.kind === "upload" ? "비공개로 보관했습니다. 페이지와 검사 내용을 확인해 주세요." : "메모를 저장했습니다. PDF 파일은 바뀌지 않았습니다.");
      } catch { setMessage("저장은 완료했지만 목록을 불러오지 못했습니다. 목록을 새로 불러와 주세요."); }
    } catch { setMessage("저장 결과를 확인하지 못했습니다. 아래 버튼으로 같은 요청을 다시 확인해 주세요."); }
    finally { setBusy(false); }
  }
  function upload(event: FormEvent) {
    event.preventDefault();
    if (!file || locked) return;
    if (!file.size || file.size > resumePdfLimits.bytes) { setMessage(messages.request_too_large); return; }
    void send({ kind: "upload", file, command: { commandId: crypto.randomUUID(), expectedRevision: state.revision } });
  }
  function movePage(next: number) { setPage(next); setImageState("loading"); }

  return <div className="resume-manager">
    <form className="resume-upload" onSubmit={upload}>
      <div className="resume-section-title"><Upload size={20} aria-hidden="true" /><h2>새 파일 보관</h2><span>{state.versions.length} / 20개</span></div>
      <p>수정한 PDF를 새 파일로 등록하세요. 기존 파일은 그대로 남고, 등록한 파일은 나만 볼 수 있습니다.</p>
      <label htmlFor="resume-file">PDF 파일 <small>5 MiB · 10페이지 이하</small></label>
      <div className="resume-upload-controls"><input ref={input} id="resume-file" type="file" accept="application/pdf,.pdf" disabled={locked || state.versions.length >= 20} onChange={event => { setFile(event.target.files?.[0] ?? null); setMessage(""); }} /><button type="submit" disabled={!file || locked || state.versions.length >= 20}>비공개로 보관</button></div>
      <p className="resume-hint">본문을 수정하려면 원본 문서에서 고친 뒤 새 PDF로 내보내 주세요. 공개와 다운로드 연결은 아직 준비 중입니다.</p>
    </form>
    <div className="resume-feedback" role="status" aria-live="polite">{message}</div>
    {pending && !busy && <div className="resume-retry"><p>이 화면을 닫으면 같은 요청을 다시 확인할 수 없습니다. 먼저 저장 결과를 확인해 주세요.</p><button onClick={() => void send(pending)}>같은 요청으로 다시 확인</button></div>}
    <div className="resume-library-heading"><h2>보관한 파일 <small>{size(state.versions.reduce((sum, item) => sum + item.byteSize, 0))}</small></h2><button className="resume-secondary" disabled={locked} onClick={async () => { setBusy(true); try { await refresh(); setMessage("최신 목록을 불러왔습니다."); } catch { setMessage("목록을 불러오지 못했습니다."); } finally { setBusy(false); } }}>목록 새로 불러오기</button></div>
    <div className="resume-grid">
      <nav className="resume-list" aria-label="보관한 이력서">
        {!state.versions.length && <p>아직 보관한 파일이 없습니다.</p>}
        <ul>{state.versions.map((item, index) => <li key={item.id}><button disabled={locked} aria-current={detail?.id === item.id ? "true" : undefined} onClick={() => void select(item.id)}><span><FileText size={18} aria-hidden="true" />이력서 {state.versions.length - index}</span><time dateTime={item.createdAt}>{date(item.createdAt)}</time><small>{item.pageCount}페이지 · {size(item.byteSize)} · {state.publicVersionId === item.id ? "공개본" : "비공개"}</small>{item.note && <p>{item.note}</p>}</button></li>)}</ul>
      </nav>
      {detail ? <section className="resume-detail" aria-label="선택한 이력서">
        <div className="resume-section-title"><h2>파일 확인</h2><span><LockKeyhole size={13} aria-hidden="true" /> 나만 보는 미리보기</span></div>
        <p className="resume-hint">{date(detail.createdAt)} 등록 · {detail.pageCount}페이지</p>
        <div className="resume-page-controls"><button className="resume-secondary" disabled={page <= 1 || imageState === "loading"} onClick={() => movePage(page - 1)} aria-label="이전 페이지"><ChevronLeft size={18} /></button><span>{page} / {detail.pageCount}페이지</span><button className="resume-secondary" disabled={page >= detail.pageCount || imageState === "loading"} onClick={() => movePage(page + 1)} aria-label="다음 페이지"><ChevronRight size={18} /></button><button className="resume-secondary resume-zoom" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? "화면에 맞추기" : "확대"}</button></div>
        <div className="resume-image-status" role="status">{imageState === "loading" ? "페이지를 불러오고 있습니다." : imageState === "error" ? "페이지를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." : "페이지를 불러왔습니다."}{imageState === "error" && <button className="resume-secondary" onClick={() => { setImageState("loading"); setImageAttempt(value => value + 1); }}>페이지 다시 불러오기</button>}</div>
        <div className="resume-preview" tabIndex={0} aria-label="이력서 페이지 이미지">
          {/* Authenticated no-store images must not pass through the public Next image cache. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={`${detail.id}-${page}-${imageAttempt}`} src={`/admin/resume/preview/${detail.id}/${page}?attempt=${imageAttempt}`} alt={`이력서 ${page}페이지`} className={zoomed ? "is-zoomed" : ""} onLoad={() => setImageState("ready")} onError={() => setImageState("error")} />
        </div>
        <form className="resume-note" onSubmit={event => { event.preventDefault(); if (!locked) void send({ kind: "note", command: { action: "save_note", commandId: crypto.randomUUID(), expectedRevision: state.revision, id: detail.id, note } }); }}>
          <label htmlFor="resume-note">나만 보는 메모 <small>{note.length} / 2,000자</small></label><textarea id="resume-note" value={note} maxLength={2000} disabled={locked} onChange={event => setNote(event.target.value)} placeholder="고친 내용이나 다시 확인할 부분을 남겨 두세요." rows={3} /><button disabled={locked || note === detail.note}>메모 저장</button>
        </form>
        <details className="resume-report"><summary>추출한 내용과 링크 확인</summary><p>자동 검사는 이미지 속 글자나 가려진 내용을 모두 찾지 못합니다. 페이지와 원본 문서도 함께 확인해 주세요.</p><h3>추출한 본문</h3><pre>{detail.inspection.text || "추출한 텍스트가 없습니다. 페이지 이미지를 확인해 주세요."}</pre><h3>문서 정보</h3><pre>{detail.inspection.metadata || "추가 문서 정보가 없습니다."}</pre><h3>링크 주소</h3>{detail.inspection.links.length ? <ul>{detail.inspection.links.map(link => <li key={link}>{link}</li>)}</ul> : <p>링크가 없습니다.</p>}<p className="resume-hash">파일 확인값: {detail.sha256}</p></details>
      </section> : <section className="resume-empty"><FileText size={32} aria-hidden="true" /><h2>확인할 파일을 골라 주세요</h2><p>페이지와 문서 정보를 확인하고<br />수정한 내용을 메모로 남길 수 있습니다.</p></section>}
    </div>
    <noscript><p>파일 등록과 미리보기는 JavaScript를 켜야 사용할 수 있습니다.</p></noscript>
  </div>;
}
