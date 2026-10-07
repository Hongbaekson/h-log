"use client";

import { useEffect, useState, type FormEvent } from "react";
import { brainBasisLabels, brainKindLabels, brainRelationLabels, brainTopics, type BrainBasis, type BrainGraph, type BrainKind, type BrainRelation, type BrainTopic } from "@/lib/brain";
import type { BrainDraft, BrainNoteSummary, BrainOwnerNote } from "@/lib/brain-capture";
import { sortBrainNodes, type BrainOrder } from "@/lib/brain-curation";

const emptyDraft: BrainDraft = {
  title: "", originalText: "", publicTitle: "", publicSummary: "", publicBody: "",
  kind: "reflection", topic: "principles", basis: "profile", tags: [], occurredOn: "", shareOccurredOn: false, links: [],
};
const messages: Record<string, string> = {
  invalid_draft: "제목과 원문, 각 항목의 길이를 확인해 주세요.",
  invalid_link: "자기 자신이나 없는 기록에는 연결할 수 없습니다. 연결 대상을 다시 골라 주세요.",
  public_copy_required: "공개용 제목·요약·본문을 모두 적어 주세요.",
  public_copy_blocked: "공개용 내용에 연락처, 내부 주소나 비공개 식별자가 있는지 확인해 주세요.",
  revision_conflict: "다른 창에서 먼저 수정했습니다. 입력한 내용을 따로 보관한 뒤 기록을 다시 열어 주세요.",
  request_too_large: "입력한 내용이 너무 깁니다. 기록을 나눠서 저장해 주세요.",
  storage_unavailable: "저장소에 연결하지 못했습니다. 입력한 내용은 이 화면에 남아 있습니다.",
};
async function request<T>(path = "", command?: object): Promise<T> {
  const response = await fetch(`/admin/brain/records${path}`, {
    cache: "no-store",
    ...(command ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(command) } : {}),
  });
  if ([401, 403, 404].includes(response.status)) throw new Error("접근 권한이나 기록을 확인할 수 없습니다. 화면을 다시 열어 주세요.");
  const result = await response.json();
  if (!response.ok) throw new Error(messages[result.error] ?? "요청을 처리하지 못했습니다. 입력한 내용은 이 화면에 남아 있습니다.");
  return result as T;
}

export function BrainCapture({ initialNotes, catalog }: { initialNotes: BrainNoteSummary[]; catalog: BrainGraph }) {
  const [notes, setNotes] = useState(initialNotes);
  const [note, setNote] = useState<BrainOwnerNote | null>(null);
  const [draft, setDraft] = useState<BrainDraft>({ ...emptyDraft });
  const [tagText, setTagText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<BrainOrder>("recent");
  const targets = [...catalog.nodes, ...notes].filter(item => item.id !== note?.id);
  const visibleNotes = sortBrainNodes(notes.map(item => ({ ...item, recordedAt: item.createdAt })), order).filter(item =>
    `${item.title} ${item.tags.join(" ")}`.normalize("NFKC").toLowerCase().includes(query.normalize("NFKC").trim().toLowerCase()));
  const laterReflections = notes.filter(item => item.links?.some(link => link.target === note?.id && link.relation === "revises"));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change<K extends keyof BrainDraft>(key: K, value: BrainDraft[K]) {
    setDraft(current => ({ ...current, [key]: value })); setDirty(true); setConfirmed(false); setMessage("");
  }
  async function load(id: string) {
    const [current, list] = await Promise.all([
      request<{ note: BrainOwnerNote }>(`?id=${encodeURIComponent(id)}`), request<{ notes: BrainNoteSummary[] }>(),
    ]);
    setNote(current.note); setDraft(current.note.draft); setTagText(current.note.draft.tags.join(", "));
    setNotes(list.notes); setDirty(false); setConfirmed(false);
  }
  async function open(id?: string, previous?: BrainNoteSummary) {
    if (dirty && !window.confirm("저장하지 않은 내용을 닫을까요?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (id) await load(id);
      else { setNote(null); setDraft({ ...emptyDraft, ...(previous ? { topic: previous.topic, links: [{ target: previous.id, relation: "revises", reason: "" }] } : {}) }); setTagText(""); setDirty(Boolean(previous)); setConfirmed(false); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "기록을 열지 못했습니다."); }
    finally { setBusy(false); }
  }
  async function act(action: "save" | "publish" | "unpublish", event?: FormEvent) {
    event?.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const command = action === "save"
        ? { action, ...(note ? { id: note.id } : {}), revision: note?.revision ?? 0, draft: { ...draft, tags: tagText.split(",").map(tag => tag.trim()).filter(Boolean) } }
        : { action, id: note!.id, revision: note!.revision, ...(action === "publish" ? { confirmed } : {}) };
      const result = await request<{ id: string }>("", command);
      await load(result.id);
      setMessage(action === "save" ? "비공개로 저장했습니다." : action === "publish" ? "확인한 사본을 공개했습니다." : "공개를 해제했습니다. 원문과 수정 이력은 남아 있습니다.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "요청을 확인하지 못했습니다. 입력한 내용을 보관해 주세요."); }
    finally { setBusy(false); }
  }

  return <div className="brain-capture">
    <header className="capture-header"><div><p className="capture-eyebrow">PRIVATE NOTES</p><h1>나만 보는 기록</h1><p>그때 있었던 일과 생각을 편하게 적어 두세요.</p></div><a href="/brain" target="_blank" rel="noreferrer">Second Brain 열기 ↗</a></header>
    <div className="capture-layout">
      <aside className="capture-sidebar" aria-label="내 기록"><button type="button" className="capture-primary" disabled={busy} onClick={() => open()}>새 기록 쓰기</button><h2>저장한 기록 <small>{notes.length}</small></h2>
        <label htmlFor="capture-search">내 기록 검색</label><input id="capture-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="제목이나 태그" />
        <label htmlFor="capture-order">내 기록 정렬</label><select id="capture-order" value={order} onChange={event => setOrder(event.target.value as BrainOrder)}><option value="recent">최근에 쓴 기록부터</option><option value="recorded">처음 쓴 기록부터</option><option value="event">사건 날짜순 · 모르면 맨 뒤</option></select>
        {!notes.length && <p>첫 기록을 남겨 보세요.</p>}
        {notes.length > 0 && !visibleNotes.length && <p>찾는 기록이 없습니다.</p>}
        <ul>{visibleNotes.map(item => <li key={item.id}><button type="button" disabled={busy} aria-current={note?.id === item.id ? "true" : undefined} onClick={() => open(item.id)}><strong>{item.title}</strong><small>{item.publishedRevision ? "공개 사본 있음" : "비공개"} · v{item.revision}</small><small>정리일 {new Date(item.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}{item.occurredOn ? ` · 사건 ${item.occurredOn}` : ""}</small></button></li>)}</ul>
      </aside>
      <section className="capture-editor" aria-label="기록 작성">
        <div className="capture-state"><span>{note ? `저장된 버전 v${note.revision}` : "새 기록"}</span><span>{dirty ? "저장하지 않은 내용 있음" : ""}</span>{note?.publishedRevision && <a href={`/brain/${note.id}`} target="_blank" rel="noreferrer">공개 중인 버전 v{note.publishedRevision} ↗</a>}</div>
        {note && <div className="capture-actions"><button type="button" disabled={busy} onClick={() => open(undefined, note)}>회고 이어 쓰기</button></div>}
        {laterReflections.length > 0 && <section aria-label="이후 회고"><h2>이후 회고</h2>{laterReflections.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => open(item.id)}>{item.title}</button>)}</section>}
        <form onSubmit={event => act("save", event)}>
          <fieldset disabled={busy}>
            <legend>비공개 원문</legend><p className="capture-help">이 내용은 나만 볼 수 있습니다. 수정해도 이전 원문은 이력에 남습니다.</p>
            <label htmlFor="capture-title">내 기록 제목</label><input id="capture-title" required maxLength={160} value={draft.title} onChange={event => change("title", event.target.value)} />
            <label htmlFor="capture-original">그때의 기록</label><textarea id="capture-original" required maxLength={50000} rows={9} value={draft.originalText} onChange={event => change("originalText", event.target.value)} placeholder="어떤 일이 있었고, 무엇을 고민했는지 적어 보세요." />
            <label htmlFor="capture-event">사건 날짜</label><input id="capture-event" type="date" value={draft.occurredOn ?? ""} onChange={event => change("occurredOn", event.target.value)} /><p className="capture-help">정확히 모르면 비워 두세요. 정리일은 처음 저장한 시점으로 남습니다.</p>
            <section className="capture-links" aria-label="기록 연결"><h2>이어지는 기록</h2><p className="capture-help">양쪽 기록을 공개하면 연결 종류와 이유도 함께 공개됩니다. 회고는 새 기록에서 이어 쓰세요.</p>
              {(draft.links ?? []).map((link, index) => <div className="capture-link" key={index}>
                <label htmlFor={`capture-target-${index}`}>연결 {index + 1} 대상</label><select id={`capture-target-${index}`} required value={link.target} onChange={event => change("links", draft.links!.map((item, i) => i === index ? { ...item, target: event.target.value } : item))}><option value="">기록을 골라 주세요</option>{targets.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
                <label htmlFor={`capture-relation-${index}`}>연결 {index + 1} 종류</label><select id={`capture-relation-${index}`} value={link.relation} onChange={event => change("links", draft.links!.map((item, i) => i === index ? { ...item, relation: event.target.value as BrainRelation } : item))}>{Object.entries(brainRelationLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
                <label htmlFor={`capture-reason-${index}`}>연결 {index + 1} 이유</label><input id={`capture-reason-${index}`} required maxLength={300} value={link.reason} onChange={event => change("links", draft.links!.map((item, i) => i === index ? { ...item, reason: event.target.value } : item))} />
                <div className="capture-actions">{notes.some(item => item.id === link.target) && <button type="button" onClick={() => open(link.target)}>연결한 내 기록 읽기</button>}<button type="button" onClick={() => change("links", draft.links!.filter((_, i) => i !== index))}>연결 {index + 1} 빼기</button></div>
              </div>)}
              <button type="button" disabled={(draft.links?.length ?? 0) >= 12} onClick={() => change("links", [...(draft.links ?? []), { target: "", relation: "extends", reason: "" }])}>연결 추가</button>
            </section>
            <details className="capture-public"><summary>공개용 메모 따로 쓰기</summary>
              <p className="capture-help">다른 사람에게 보여 줄 내용만 새로 적어 주세요. 원문은 여기에 자동으로 옮기지 않습니다.</p>
              <label htmlFor="capture-public-title">공개 제목</label><input id="capture-public-title" maxLength={160} value={draft.publicTitle} onChange={event => change("publicTitle", event.target.value)} />
              <label htmlFor="capture-summary">공개 요약</label><textarea id="capture-summary" rows={2} maxLength={300} value={draft.publicSummary} onChange={event => change("publicSummary", event.target.value)} />
              <label htmlFor="capture-body">공개 본문</label><textarea id="capture-body" rows={7} maxLength={30000} value={draft.publicBody} onChange={event => change("publicBody", event.target.value)} />
              <label className="capture-check"><input type="checkbox" checked={draft.shareOccurredOn ?? false} onChange={event => change("shareOccurredOn", event.target.checked)} />사건 날짜도 공개합니다.</label>
              <div className="capture-fields">
                <div><label htmlFor="capture-kind">기록 종류</label><select id="capture-kind" value={draft.kind} onChange={event => change("kind", event.target.value as BrainKind)}>{Object.entries(brainKindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
                <div><label htmlFor="capture-topic">주제</label><select id="capture-topic" value={draft.topic} onChange={event => change("topic", event.target.value as BrainTopic)}>{Object.entries(brainTopics).map(([value, item]) => <option value={value} key={value}>{item.label}</option>)}</select></div>
                <div><label htmlFor="capture-basis">기록의 근거</label><select id="capture-basis" value={draft.basis} onChange={event => change("basis", event.target.value as BrainBasis)}>{Object.entries(brainBasisLabels).map(([value, item]) => <option value={value} key={value}>{item.label}</option>)}</select></div>
              </div>
              <p className="capture-help">{brainBasisLabels[draft.basis].description}</p>
              <label htmlFor="capture-tags">태그 <small>쉼표로 구분 · 최대 12개</small></label><input id="capture-tags" value={tagText} onChange={event => { setTagText(event.target.value); setDirty(true); setConfirmed(false); }} />
              <section className="capture-preview" aria-label="공개 미리보기"><h2>공개 미리보기</h2><h3>{draft.publicTitle || "공개 제목"}</h3><p>{draft.publicSummary || "공개 요약을 적어 주세요."}</p>{draft.shareOccurredOn && draft.occurredOn && <p>사건 날짜 {draft.occurredOn}</p>}<div>{draft.publicBody || "다른 사람에게 보여 줄 본문이 여기에 표시됩니다."}</div>{draft.links?.length ? <p>연결 {draft.links.length}개 · 양쪽 기록이 공개된 연결만 표시됩니다.</p> : null}</section>
            </details>
            <div className="capture-actions"><button className="capture-primary" type="submit">{busy ? "저장하는 중…" : "비공개로 저장"}</button></div>
          </fieldset>
        </form>
        <fieldset className="capture-publish" disabled={busy || !note || dirty}>
          <legend>공개 여부</legend><p className="capture-help">저장한 공개용 메모만 방문자에게 보여 줍니다. 공개 후 수정한 내용은 다시 공개하기 전까지 비공개로 남습니다.</p>
          {(!note || dirty) && <p className="capture-help">공개 여부를 바꾸려면 먼저 저장해 주세요.</p>}
          <label className="capture-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />공개용 제목·요약·본문을 확인했습니다.</label>
          <div className="capture-actions"><button type="button" disabled={!confirmed || !draft.publicTitle.trim() || !draft.publicSummary.trim() || !draft.publicBody.trim()} onClick={() => act("publish")}>확인한 사본 공개</button>{note?.publishedRevision && <button type="button" onClick={() => act("unpublish")}>공개 해제</button>}</div>
        </fieldset>
        <p role="status" className="capture-message">{message}</p>{error && <p role="alert" className="capture-error">{error}</p>}
        {note && <details className="capture-history"><summary>수정 이력 · {note.history.length}개</summary><p className="capture-help">이전에 저장한 원문입니다. 여기서 과거 기록을 덮어쓰지 않습니다.</p>{note.history.map(version => <details key={version.revision}><summary>v{version.revision} · {new Date(version.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</summary><h3>{version.draft.title}</h3><pre>{version.draft.originalText}</pre></details>)}</details>}
      </section>
    </div>
  </div>;
}
