"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { BrainSceneHandle } from "./BrainScene";
import { brainBasisLabels, brainKindLabels, brainRelationLabels, brainTopics, findBrainNode, type BrainGraph, type BrainKind, type BrainNode, type BrainRelation, type BrainTopic } from "@/lib/brain";
import { filterBrainGraph, type BrainLayout } from "@/lib/brain-layout";

const BrainScene = dynamic(() => import("./BrainScene"), { ssr: false, loading: () => <p className="mem-loading" role="status">기억의 연결을 펼치는 중…</p> });
const layouts: Record<BrainLayout, string> = { brain: "브레인", free: "자유", topics: "주제별", hierarchy: "계층", timeline: "시간순" };
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const readMotion = () => window.matchMedia(motionQuery).matches;
const serverMotion = () => true;

function MemoryDialog({ type, onClose, children }: { type: "reader" | "filters"; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const media = window.matchMedia("(max-width: 767px)");
    const show = () => {
      dialog.close();
      if (type === "filters" || media.matches) dialog.showModal(); else dialog.show();
      if (type === "filters") dialog.querySelector<HTMLButtonElement>("button")?.focus({preventScroll:true});
    };
    show();
    media.addEventListener("change", show);
    return () => {
      media.removeEventListener("change", show);
      dialog.close();
      const target = trigger?.isConnected && trigger !== document.body ? trigger : document.querySelector<HTMLInputElement>('.mem-search');
      target?.focus({preventScroll:true});
    };
  }, [type]);
  return <dialog ref={ref} className={type === "reader" ? "mem-detail" : "mem-mobile-dialog"} aria-label={type === "reader" ? "기록 읽기" : "그래프 필터"}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const r = event.currentTarget.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose();
    }}>{children}</dialog>;
}

function MemoryNote({ node, graph, select }: { node: BrainNode; graph: BrainGraph; select: (id: string) => void }) {
  const related = graph.edges.filter(edge => edge.from === node.id || edge.to === node.id);
  return <article aria-label="선택한 기록">
    <h2>{node.title}</h2>
    <div className="mem-meta"><span className="mem-badge">{brainTopics[node.topic].label}</span><span className="mem-badge">{brainKindLabels[node.kind]}</span><span className="mem-badge">{related.length}개 연결</span><span className="mem-badge">{brainBasisLabels[node.basis].label}</span></div>
    <p className="mem-summary">{node.summary}</p>
    <section className="mem-detail-section"><h3 className="mem-detail-title">태그</h3><div className="mem-meta">{node.tags.map(tag => <span className="mem-badge" key={tag}>{tag}</span>)}</div></section>
    {node.sections.map(section => <section className="mem-detail-section" key={section.heading}><h3 className="mem-detail-title">{section.heading}</h3><div className="mem-body">{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></section>)}
    <section className="mem-detail-section"><h3 className="mem-detail-title">기록의 근거 · {brainBasisLabels[node.basis].label}</h3><div className="mem-body"><p>{brainBasisLabels[node.basis].description}</p></div></section>
    {node.questions.length > 0 && <section className="mem-detail-section"><h3 className="mem-detail-title">남겨 둔 질문</h3><div className="mem-body">{node.questions.map(question => <p key={question}>{question}</p>)}</div></section>}
    {related.length > 0 && <section className="mem-detail-section" aria-label="연결된 기록"><h3 className="mem-detail-title">연결 노드</h3><div className="mem-list">{related.map(edge => {
      const other = graph.nodes.find(item => item.id === (edge.from === node.id ? edge.to : edge.from))!;
      return <button className="mem-row" type="button" key={`${edge.from}-${edge.to}-${edge.relation}`} onClick={() => select(other.id)}><strong>{other.title}</strong><small>{brainRelationLabels[edge.relation]} · {edge.reason}</small></button>;
    })}</div></section>}
    <section className="mem-detail-section" aria-label="기록의 출처"><h3 className="mem-detail-title">참고한 기록</h3><div className="mem-body">{node.sources.map(source => <p key={source.label}>{source.href ? <a href={source.href} {...(source.href.startsWith("https:") ? {target:"_blank",rel:"noreferrer","aria-label":`${source.label} (새 창)`} : {})}>{source.label}</a> : source.label}</p>)}<p>정리일 <time dateTime={node.recordedAt}>{node.recordedAt}</time></p></div></section>
  </article>;
}

function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return <button type="button" className={`mem-chip${active ? " active" : ""}`} aria-pressed={active} onClick={onClick}><span>{children}</span>{count !== undefined && <span>{count}</span>}</button>;
}

export function BrainExplorer({ graph }: { graph: BrainGraph }) {
  const params = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const api = useRef<BrainSceneHandle | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, readMotion, serverMotion);
  const query = params.get("q") ?? "";
  const topic = params.get("topic") ?? "all";
  const tag = params.get("tag") ?? "";
  const kind = params.get("kind") ?? "";
  const relation = params.get("relation") ?? "";
  const basis = params.get("basis") ?? "";
  const lens = params.get("lens") ?? "all";
  const layout = Object.hasOwn(layouts, params.get("layout") ?? "") ? params.get("layout") as BrainLayout : "brain";
  const color = params.get("color") === "topic" ? "topic" : "kind";
  const spread = params.get("spacing") === "wide" ? 1.34 : params.get("spacing") === "compact" ? .72 : 1;
  const labels = params.get("labels") !== "off";
  const view = params.get("view") === "list" || unavailable ? "list" : "graph";
  const selected = findBrainNode(graph, params.get("note") ?? "");
  const preview = view === "graph" && !filtersOpen && hovered !== selected?.id ? findBrainNode(graph, hovered ?? "") : undefined;
  const results = useMemo(() => filterBrainGraph(graph, {query, topic, tag, kinds:kind && kind !== "all" ? kind.split(",") : [], relations:relation ? relation.split(",") : [], basis}), [graph, query, topic, tag, kind, relation, basis]);
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    graph.nodes.forEach(node => node.tags.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1)));
    return [...counts].sort((a,b) => b[1] - a[1]).slice(0, 8);
  }, [graph]);
  const filtered = Boolean(query || topic !== "all" || tag || kind || relation || basis);
  useEffect(() => { if (selected) { readerRef.current?.focus({preventScroll:true}); readerRef.current?.parentElement?.scrollTo(0,0); } }, [selected]);

  function update(values: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(values).forEach(([key,value]) => value && value !== "all" ? next.set(key,value) : next.delete(key));
    const url = `${window.location.pathname}${next.size ? `?${next}` : ""}`;
    if (replace) window.history.replaceState(null,"",url); else window.history.pushState(null,"",url);
    setHovered(null);
  }
  function clearFilters() { update({q:null,topic:null,tag:null,kind:null,relation:null,basis:null,lens:null,note:null}); }
  function select(id: string | null) {
    update({note:id, ...((id && !results.nodes.some(node => node.id === id)) ? {q:null,topic:null,tag:null,kind:null,relation:null,basis:null,lens:null} : {})});
    setFiltersOpen(false);
  }
  function toggle(key: "kind" | "relation", value: string) {
    const values = new Set((params.get(key) ?? "").split(",").filter(Boolean));
    if (values.has(value)) values.delete(value); else values.add(value);
    update({[key]:[...values].join(","),lens:null,note:null});
  }
  function chooseLens(value: string) {
    update({lens:value,topic:null,tag:null,q:null,kind:value === "thoughts" ? "reflection,question" : null,relation:null,basis:null,
      layout:value === "topics" ? "topics" : value === "connections" ? "hierarchy" : "brain",color:value === "topics" ? "topic" : "kind",note:null});
  }

  function sidebar(mobile = false) {
    const Title = mobile ? "h2" : "h1";
    return <aside className="mem-side" aria-label="Second Brain 필터">
      <div className="mem-side-top"><Link href="/" className="mem-round" aria-label="H-Log 홈으로">←</Link>{mobile ? <button type="button" className="mem-round" aria-label="필터 닫기" onClick={() => setFiltersOpen(false)}>×</button> : <div className="mem-lang" aria-label="한국어 개인 기록"><span>ko</span><span>log</span></div>}</div>
      <div><div className="mem-eyebrow">지식 그래프</div><Title className="mem-title">H-Log Second Brain</Title><div className="mem-counts"><span><strong>{graph.nodes.length}</strong> 노드</span><span>·</span><span><strong>{graph.edges.length}</strong> 엣지</span></div></div>
      <div className="mem-rule" />
      <section className="mem-section"><div className="mem-section-title">렌즈</div><div className="mem-chipset">{[["all","전체"],["topics","토픽별"],["connections","연결별"],["thoughts","생각별"],["basis","기록 vs 내 생각"]].map(([value,label]) => <Chip key={value} active={lens === value} onClick={() => chooseLens(value)}>{label}</Chip>)}</div>
        {lens === "basis" && <div className="mem-chipset mem-status">{Object.entries(brainBasisLabels).map(([value,description]) => <Chip key={value} active={basis === value} count={graph.nodes.filter(node => node.basis === value).length} onClick={() => update({basis:basis === value ? null : value,note:null})}>{description.label}</Chip>)}</div>}
      </section>
      <div className="mem-rule" />
      <section className="mem-section"><div className="mem-section-title">주제 · 태그로 보기</div>
        <input className="mem-search" type="search" value={query} aria-label="기록 검색" placeholder="노드, 생각, 해결 방법 검색" onChange={event => update({q:event.target.value,note:null},true)} onKeyDown={event => { if (event.key === "Enter" && results.nodes[0]) select(results.nodes[0].id); }} />
        <div className="mem-search-results" aria-label="검색 결과">{query && <>{results.nodes.slice(0,8).map(node => <button className="mem-search-hit" type="button" key={node.id} onClick={() => select(node.id)}><strong>{node.title}</strong><small>{brainTopics[node.topic].label} · {brainBasisLabels[node.basis].label}</small><small>{node.summary}</small></button>)}{!results.nodes.length && <div className="mem-status">검색 결과 없음</div>}</>}</div>
        <div className="mem-mini">태그</div><div className="mem-chipset"><Chip active={!tag} count={graph.nodes.length} onClick={() => update({tag:null,note:null})}>전체</Chip>{tags.map(([value,count]) => <Chip key={value} active={tag === value} count={count} onClick={() => update({tag:tag === value ? null : value,note:null})}>{value}</Chip>)}</div>
        <div className="mem-mini">토픽</div><div className="mem-chipset"><Chip active={topic === "all"} count={graph.nodes.length} onClick={() => update({topic:null,note:null})}>전체</Chip>{(Object.keys(brainTopics) as BrainTopic[]).map(value => <Chip key={value} active={topic === value} count={graph.nodes.filter(node => node.topic === value).length} onClick={() => update({topic:topic === value ? null : value,note:null})}>{brainTopics[value].label}</Chip>)}</div>
      </section>
      <div className="mem-rule" />
      <section className="mem-section"><div className="mem-section-title">노드 유형</div><div className="mem-chipset">{(Object.keys(brainKindLabels) as BrainKind[]).map(value => <Chip key={value} active={kind.split(",").includes(value)} count={graph.nodes.filter(node => node.kind === value).length} onClick={() => toggle("kind",value)}>{brainKindLabels[value]}</Chip>)}</div></section>
      <section className="mem-section"><div className="mem-section-title">엣지 유형</div><div className="mem-chipset"><Chip active={!relation} count={graph.edges.length} onClick={() => update({relation:null,note:null})}>전체</Chip>{(Object.keys(brainRelationLabels) as BrainRelation[]).map(value => <Chip key={value} active={relation.split(",").includes(value)} count={graph.edges.filter(edge => edge.relation === value).length} onClick={() => toggle("relation",value)}>{brainRelationLabels[value]}</Chip>)}</div></section>
      <div className="mem-status" role="status" aria-live="polite">{results.nodes.length}/{graph.nodes.length}개 노드 표시{"\n"}{results.edges.length}/{graph.edges.length}개 연결 표시{layout === "timeline" && "\n정리일 기준"}{layout === "hierarchy" && "\n유형별 계층"}</div>
      <div className="mem-chipset mem-section">
        <Chip active={view === "list"} onClick={() => { setUnavailable(false); update({view:view === "graph" ? "list" : null}); }}>{view === "graph" ? "목록 보기" : "그래프 보기"}</Chip>
        {!reducedMotion && <Chip active={paused} onClick={() => setPaused(value => !value)}>{paused ? "움직임 시작" : "움직임 멈추기"}</Chip>}
        <Chip active={false} onClick={() => api.current?.fit()}>전체 보기</Chip>
        {filtered && <Chip active={false} onClick={clearFilters}>필터 초기화</Chip>}
      </div>
    </aside>;
  }

  return <div className="mem-app">
    {sidebar()}
    <section className="mem-stage" aria-label="Second Brain 그래프">
      {view === "graph" && <BrainScene graph={graph} matches={results} selectedId={selected?.id ?? null} layout={layout} spread={spread} color={color} labels={labels} paused={paused} apiRef={api} onSelect={select} onHover={setHovered} onUnavailable={() => setUnavailable(true)} />}
      <div className="mem-topbar"><button className="mem-round mem-menu" type="button" aria-label="필터 열기" onClick={() => setFiltersOpen(true)}>☰</button><div className="mem-tools">
        <div className="mem-control" aria-label="배치"><span>브레인</span>{(Object.keys(layouts) as BrainLayout[]).map(value => <button key={value} type="button" className={layout === value ? "active" : ""} aria-pressed={layout === value} data-layout={value} onClick={() => update({layout:value,view:null})}>{layouts[value]}</button>)}</div>
        <div className="mem-control" aria-label="색상 기준"><span>색상 기준</span>{[["kind","유형"],["topic","분야"]].map(([value,label]) => <button key={value} type="button" className={color === value ? "active" : ""} aria-pressed={color === value} onClick={() => update({color:value})}>{label}</button>)}</div>
        <div className="mem-control" aria-label="노드 간격"><span>노드 간격</span>{[["compact","좁게",.72],["normal","보통",1],["wide","넓게",1.34]].map(([value,label,factor]) => <button key={value} type="button" className={spread === factor ? "active" : ""} aria-pressed={spread === factor} onClick={() => update({spacing:String(value)})}>{label}</button>)}</div>
        <div className="mem-control"><button type="button" onClick={() => api.current?.reset()}>다시 정렬</button><button type="button" aria-pressed={labels} onClick={() => update({labels:labels ? "off" : null})}>{labels ? "라벨 숨기기" : "라벨 보이기"}</button></div>
      </div></div>
      {view === "list" && <section className="mem-catalog" aria-label="기록 목록"><h2>기록 모아보기</h2>{unavailable && <p className="mem-status" role="status">이 환경에서는 그래프를 열 수 없어 기록을 목록으로 보여드립니다.</p>}<div className="mem-list">{results.nodes.map(node => <button type="button" className="mem-row" key={node.id} onClick={() => select(node.id)}><strong>{node.title}</strong><small>{brainKindLabels[node.kind]} · {brainTopics[node.topic].label}</small><small>{node.summary}</small></button>)}</div></section>}
      {!results.nodes.length && <div className="mem-empty"><p>이 조건에 맞는 기록이 없습니다.</p><Chip active={false} onClick={clearFilters}>필터 초기화</Chip></div>}
      {preview && <section className="mem-preview" aria-live="polite"><div className="mem-preview-kicker">{brainKindLabels[preview.kind]}</div><h3>{preview.title}</h3><p>{preview.summary.length > 128 ? `${preview.summary.slice(0,125)}…` : preview.summary}</p><small>클릭하시면 본문이 열립니다.</small></section>}
      {selected && <MemoryDialog type="reader" onClose={() => select(null)}><div className="mem-detail-toolbar"><Link href={`/brain/${selected.id}`}>개별 페이지 ↗</Link><button type="button" className="mem-round" aria-label="기록 닫기" onClick={() => select(null)}>×</button></div><div ref={readerRef} className="mem-detail-content" tabIndex={-1}><MemoryNote node={selected} graph={graph} select={select} /></div></MemoryDialog>}
    </section>
    {filtersOpen && <MemoryDialog type="filters" onClose={() => setFiltersOpen(false)}>{sidebar(true)}</MemoryDialog>}
  </div>;
}
