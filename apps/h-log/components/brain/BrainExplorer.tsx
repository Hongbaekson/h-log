"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, List, Maximize, Minus, Network, Pause, Play, Plus, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { BrainNote } from "@/components/brain/BrainNote";
import type { BrainSceneHandle } from "@/components/brain/BrainScene";
import { brainBasisLabels, brainKindColors, brainKindLabels, brainRelationLabels, brainTopics, findBrainNode, type BrainGraph, type BrainKind, type BrainRelation, type BrainTopic } from "@/lib/brain";
import { filterBrainGraph, type BrainLayout } from "@/lib/brain-layout";

const BrainScene = dynamic(() => import("./BrainScene"), { ssr: false, loading: () => <p className="memory-loading" role="status">기억의 연결을 펼치는 중…</p> });
const layouts: Record<BrainLayout, string> = { brain: "브레인", free: "자유", topics: "주제별", hierarchy: "계층", timeline: "시간순" };
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const readReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const serverReducedMotion = () => true;

function MemoryDialog({ label, type, onClose, children }: { label: string; type: "reader" | "filters"; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const media = window.matchMedia("(max-width: 767px)");
    const show = () => {
      dialog.close();
      if (type === "filters" || media.matches) dialog.showModal(); else dialog.show();
    };
    show();
    media.addEventListener("change", show);
    return () => {
      media.removeEventListener("change", show);
      dialog.close();
      const target = trigger?.isConnected && trigger !== document.body ? trigger : document.querySelector<HTMLInputElement>('.memory-search input');
      target?.focus({preventScroll:true});
    };
  }, [type]);
  return <dialog ref={ref} className={`memory-dialog memory-${type}`} aria-label={label}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}
    onClick={event => { if (event.target === event.currentTarget) { const r=event.currentTarget.getBoundingClientRect(); if (event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) onClose(); } }}>
    {children}
  </dialog>;
}

export function BrainExplorer({ graph }: { graph: BrainGraph }) {
  const params = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
  const api = useRef<BrainSceneHandle | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, readReducedMotion, serverReducedMotion);
  const query = params.get("q") ?? "";
  const topic = params.get("topic") ?? "all";
  const tag = params.get("tag") ?? "";
  const kind = params.get("kind") ?? "";
  const relation = params.get("relation") ?? "";
  const basis = params.get("basis") ?? "";
  const lens = params.get("lens") ?? "all";
  const layout = Object.hasOwn(layouts, params.get("layout") ?? "") ? params.get("layout") as BrainLayout : "brain";
  const color = params.get("color") === "topic" ? "topic" : "kind";
  const spread = params.get("spacing") === "wide" ? 1.5 : params.get("spacing") === "compact" ? .7 : 1;
  const labels = params.get("labels") !== "off";
  const view = params.get("view") === "list" || unavailable ? "list" : "graph";
  const selected = findBrainNode(graph, params.get("note") ?? "");
  useEffect(() => { if (selected) readerRef.current?.focus({preventScroll:true}); }, [selected]);
  const results = useMemo(() => filterBrainGraph(graph, {query, topic, tag, kinds:kind && kind !== "all" ? kind.split(",") : [], relations:relation ? relation.split(",") : [], basis}), [graph, query, topic, tag, kind, relation, basis]);
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    graph.nodes.forEach(node => node.tags.forEach(value => counts.set(value, (counts.get(value) ?? 0)+1)));
    return [...counts].sort((a,b) => b[1]-a[1]).slice(0,14);
  }, [graph]);
  const filtered = Boolean(query || topic !== "all" || tag || kind || relation || basis);

  function update(values: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(values).forEach(([key,value]) => value && value !== "all" ? next.set(key,value) : next.delete(key));
    const url = `${window.location.pathname}${next.size ? `?${next}` : ""}`;
    if (replace) window.history.replaceState(null,"",url); else window.history.pushState(null,"",url);
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
    return <div className="memory-sidebar-content">
      <div className="memory-sidebar-top"><Link href="/" className="memory-circle" aria-label="H-Log 홈으로"><ArrowLeft size={16} /></Link><Link href="/" className="memory-brand">h-log<span>.</span></Link>{mobile && <button type="button" className="memory-circle" aria-label="필터 닫기" onClick={() => setFiltersOpen(false)}><X size={17} /></button>}</div>
      <div className="memory-identity"><p>지식 그래프</p>{mobile ? <h2>Second Brain</h2> : <h1>Second Brain</h1>}<p className="memory-totals"><strong>{graph.nodes.length}</strong> 노드 <span>·</span> <strong>{graph.edges.length}</strong> 연결</p></div>
      <section className="memory-filter-section"><h2>렌즈</h2><div className="memory-chips">{[["all","전체"],["topics","토픽별"],["connections","연결 중심"],["thoughts","생각과 질문"],["basis","구현과 회고"]].map(([value,label]) => <button key={value} type="button" aria-pressed={lens === value} onClick={() => chooseLens(value)}>{label}</button>)}</div>
        {lens === "basis" && <div className="memory-basis-options">{Object.entries(brainBasisLabels).map(([value,description]) => <button type="button" key={value} aria-pressed={basis === value} onClick={() => update({basis:basis === value ? null : value,note:null})}>{description.label}<span>{graph.nodes.filter(node => node.basis === value).length}</span></button>)}</div>}
      </section>
      <section className="memory-filter-section"><h2>주제 · 태그로 보기</h2><h3>태그</h3><div className="memory-chips memory-tags">{tags.map(([value,count]) => <button type="button" key={value} aria-pressed={tag === value} onClick={() => update({tag:tag === value ? null : value,note:null})}>{value}<span>{count}</span></button>)}</div><h3>토픽</h3><div className="memory-chips memory-topics">{(Object.keys(brainTopics) as BrainTopic[]).map(value => <button key={value} type="button" aria-pressed={topic === value} onClick={() => update({topic:topic === value ? null : value,note:null})}>{brainTopics[value].label}<span>{graph.nodes.filter(node => node.topic === value).length}</span></button>)}</div></section>
      <section className="memory-filter-section"><h2>노드 유형</h2><div className="memory-filter-rows">{(Object.keys(brainKindLabels) as BrainKind[]).map(value => <button key={value} type="button" aria-pressed={kind.split(",").includes(value)} onClick={() => toggle("kind",value)}><i style={{background:brainKindColors[value]}} /><span>{brainKindLabels[value]} <small>{value}</small></span><em>{graph.nodes.filter(node => node.kind === value).length}</em></button>)}</div></section>
      <section className="memory-filter-section"><h2>엣지 유형</h2><div className="memory-filter-rows memory-edge-types">{(Object.keys(brainRelationLabels) as BrainRelation[]).map(value => <button key={value} type="button" aria-pressed={relation.split(",").includes(value)} onClick={() => toggle("relation",value)}><i /><span>{brainRelationLabels[value]} <small>{value}</small></span><em>{graph.edges.filter(edge => edge.relation === value).length}</em></button>)}</div></section>
      <section className="memory-filter-section memory-settings"><h2>배치</h2><div className="memory-segments memory-layout-options">{(Object.keys(layouts) as BrainLayout[]).map(value => <button key={value} type="button" aria-pressed={layout === value} onClick={() => update({layout:value,view:"graph"})}>{layouts[value]}</button>)}</div><h2>색상 기준</h2><div className="memory-segments">{[["kind","유형"],["topic","분야"]].map(([value,label]) => <button type="button" key={value} aria-pressed={color === value} onClick={() => update({color:value})}>{label}</button>)}</div><h2>노드 간격</h2><div className="memory-segments">{[["compact","좁게",.7],["normal","보통",1],["wide","넓게",1.5]].map(([value,label,factor]) => <button type="button" key={value} aria-pressed={spread === factor} onClick={() => update({spacing:String(value)})}>{label}</button>)}</div>
        <div className="memory-setting-actions"><button type="button" onClick={() => setRevision(value => value+1)}><RotateCcw size={14} />다시 정렬</button><button type="button" onClick={() => update({labels:labels ? "off" : null})}>{labels ? <EyeOff size={14} /> : <Eye size={14} />}{labels ? "라벨 숨기기" : "라벨 보기"}</button>{filtered && <button type="button" onClick={clearFilters}>필터 초기화</button>}</div>
        <p>드래그로 돌리고 스크롤로 확대해 보세요.<br />노드를 선택하면 본문이 열립니다.</p><p>해결한 문제와 남겨 둔 질문.<br />작은 기록에서 생각의 연결을 찾습니다.</p>
      </section>
    </div>;
  }

  return <div className="memory-workspace">
    <h1 className="memory-mobile-title sr-only">Second Brain</h1>
    <aside className="memory-sidebar" aria-label="그래프 필터">{sidebar()}</aside>
    <section className="memory-stage" aria-label="기억의 연결 지도">
      {view === "graph" && <BrainScene graph={graph} matches={results} selectedId={selected?.id} layout={layout} spread={spread} color={color} labels={labels} paused={paused} revision={revision} apiRef={api} onSelect={select} onUnavailable={() => setUnavailable(true)} />}
      <div className={`memory-topbar ${selected ? "has-reader" : ""}`}>
        <button type="button" className="memory-mobile-filter memory-circle" aria-label="필터 열기" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={17} /></button>
        <div className="memory-search-wrap"><div className="memory-search"><Search size={17} aria-hidden="true" /><input ref={searchRef} type="search" aria-label="기록 검색" placeholder="Second Brain에서 생각 찾기" value={query} onChange={event => update({q:event.target.value,note:null},true)} onKeyDown={event => {if (event.key === "Enter" && results.nodes[0]) select(results.nodes[0].id); if (event.key === "Escape") update({q:null},true);}} />{query ? <button type="button" aria-label="검색 지우기" onClick={() => {update({q:null},true);searchRef.current?.focus();}}><X size={17} /></button> : <ArrowUpRight size={17} aria-hidden="true" />}</div>
          {query && !selected && <div className="memory-search-results" aria-label="검색 결과"><p>{results.nodes.length}개 기록</p>{results.nodes.slice(0,6).map(node => <button key={node.id} type="button" onClick={() => select(node.id)}><i style={{background:brainKindColors[node.kind]}} /><span>{node.title}<small>{brainTopics[node.topic].label}</small></span><ArrowUpRight size={14} /></button>)}{!results.nodes.length && <p>다른 단어나 필터로 찾아보세요.</p>}{results.nodes.length > 6 && <button type="button" onClick={() => update({view:"list"})}>검색 결과 모두 보기</button>}</div>}
        </div>
        <button type="button" className="memory-circle memory-view-toggle" aria-label={view === "graph" ? "목록 보기" : "그래프 보기"} onClick={() => {if (unavailable) setUnavailable(false);update({view:view === "graph" ? "list" : "graph"});}}>{view === "graph" ? <List size={17} /> : <Network size={17} />}</button>
      </div>
      {view === "list" && <div className="memory-list" aria-label="기록 목록">{unavailable && <p className="memory-fallback" role="status">이 환경에서는 3D 그래프를 열 수 없어 기록을 목록으로 보여드립니다.</p>}<header><h2>기록 모아보기</h2><p>{results.nodes.length}개 기록 · {results.edges.length}개 연결</p></header><ul>{results.nodes.map(node => <li key={node.id}><button type="button" aria-pressed={selected?.id === node.id} aria-label={`${node.title} 읽기`} onClick={() => select(node.id)}><div><i style={{background:brainKindColors[node.kind]}} /><span>{brainKindLabels[node.kind]} · {brainTopics[node.topic].label}</span><small>{brainBasisLabels[node.basis].label}</small></div><h3>{node.title}</h3><p>{node.summary}</p></button></li>)}</ul></div>}
      {results.nodes.length === 0 && !query && <div className="memory-empty"><p>이 조건에 맞는 기록이 없습니다.</p><button type="button" onClick={clearFilters}>필터 초기화</button></div>}
      <div className="memory-bottom"><p role="status" aria-live="polite">{filtered ? `${results.nodes.length} / ${graph.nodes.length}개 기록 · ${results.edges.length}개 연결` : `${graph.nodes.length}개의 기억, ${graph.edges.length}개의 연결`}{layout === "timeline" && <span>정리일 기준 · {[...new Set(graph.nodes.map(node=>node.recordedAt))].sort().join(" · ")}</span>}{layout === "hierarchy" && <span>연결이 많은 기록으로부터의 거리</span>}</p>{view === "graph" && <div className="memory-camera-tools" aria-label="그래프 조작">{layout === "brain" && !reducedMotion && <button type="button" aria-label={paused ? "자동 회전 시작" : "자동 회전 정지"} aria-pressed={paused} onClick={() => setPaused(value=>!value)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}<button type="button" aria-label="그래프 축소" onClick={() => api.current?.zoom(1.2)}><Minus size={16} /></button><button type="button" aria-label="그래프 전체 보기" onClick={() => api.current?.reset()}><Maximize size={15} /></button><button type="button" aria-label="그래프 확대" onClick={() => api.current?.zoom(1/1.2)}><Plus size={16} /></button></div>}</div>
    </section>
    {filtersOpen && <MemoryDialog label="그래프 필터" type="filters" onClose={() => setFiltersOpen(false)}>{sidebar(true)}</MemoryDialog>}
    {selected && <MemoryDialog label="기록 읽기" type="reader" onClose={() => select(null)}><div className="memory-reader-toolbar"><Link href={`/brain/${selected.id}`}>개별 페이지 <ArrowUpRight size={14} /></Link><button type="button" className="memory-circle" aria-label="기록 닫기" onClick={() => select(null)}><X size={17} /></button></div><div className="memory-reader-body" ref={readerRef} tabIndex={-1} key={selected.id}><BrainNote node={selected} graph={graph} onSelect={select} /></div></MemoryDialog>}
  </div>;
}
