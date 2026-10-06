"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUpRight, BookOpen, List, Minus, Network, Plus, RotateCcw, Search, X } from "lucide-react";

import { BrainNote } from "@/components/brain/BrainNote";
import { brainBasisLabels, brainKindLabels, brainTopics, findBrainNode, searchBrainNodes, type BrainGraph, type BrainKind, type BrainTopic } from "@/lib/brain";

const mobileQuery = "(max-width: 767px)";
function subscribeMobile(callback: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getMobile = () => window.matchMedia(mobileQuery).matches;
const getServerMobile = () => false;

function BrainMap({ graph, visibleIds, selectedId, onSelect }: {
  graph: BrainGraph; visibleIds: Set<string>; selectedId?: string; onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const positions = new Map(graph.nodes.map((node, index) => {
    const angle = ((index - 1) / Math.max(graph.nodes.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
    return [node.id, index === 0 ? { x: 50, y: 48 } : { x: 50 + 36 * Math.cos(angle), y: 48 + 35 * Math.sin(angle) }];
  }));
  const neighbors = new Set(graph.edges.filter(edge => edge.from === selectedId || edge.to === selectedId).flatMap(edge => [edge.from, edge.to]));

  return <div className="brain-map">
    <div className="brain-map-scroll" ref={scrollRef}>
      <div className="brain-map-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
        <svg className="brain-map-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {graph.edges.filter(edge => visibleIds.has(edge.from) && visibleIds.has(edge.to)).map(edge => {
            const from = positions.get(edge.from)!;
            const to = positions.get(edge.to)!;
            return <line key={`${edge.from}-${edge.to}-${edge.relation}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              className={edge.from === selectedId || edge.to === selectedId ? "is-connected" : ""} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        {graph.nodes.filter(node => visibleIds.has(node.id)).map(node => {
          const position = positions.get(node.id)!;
          return <button key={node.id} type="button"
            aria-label={`${node.title} 읽기`} aria-pressed={selectedId === node.id}
            className={`brain-map-node ${selectedId === node.id ? "is-selected" : ""} ${selectedId && !neighbors.has(node.id) && selectedId !== node.id ? "is-distant" : ""}`}
            style={{ left: `${position.x}%`, top: `${position.y}%`, color: brainTopics[node.topic].color }}
            onClick={() => onSelect(node.id)}>
            <span className="brain-node-dot" aria-hidden="true" /><span className="brain-node-title">{node.title}</span>
          </button>;
        })}
      </div>
    </div>
    <div className="brain-map-tools" aria-label="그래프 배율">
      <button type="button" aria-label="그래프 축소" disabled={zoom === 1} onClick={() => setZoom(value => Math.max(1, value - .25))}><Minus size={16} /></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" aria-label="그래프 확대" disabled={zoom === 2} onClick={() => setZoom(value => Math.min(2, value + .25))}><Plus size={16} /></button>
      <button type="button" aria-label="그래프 위치와 배율 초기화" onClick={() => { setZoom(1); scrollRef.current?.scrollTo(0, 0); }}><RotateCcw size={15} /></button>
    </div>
    <p className="brain-map-hint">기록을 선택하면 연결과 내용을 볼 수 있어요.</p>
  </div>;
}

export function BrainExplorer({ graph }: { graph: BrainGraph }) {
  const params = useSearchParams();
  const isMobile = useSyncExternalStore(subscribeMobile, getMobile, getServerMobile);
  const query = params.get("q") ?? "";
  const topic = params.get("topic") ?? "all";
  const kind = params.get("kind") ?? "all";
  const view = params.get("view") === "list" ? "list" : params.get("view") === "graph" ? "graph" : isMobile ? "list" : "graph";
  const selected = findBrainNode(graph, params.get("note") ?? "");
  const results = searchBrainNodes(graph, { query, topic, kind });
  const detailRef = useRef<HTMLElement>(null);

  function update(values: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(values).forEach(([key, value]) => value && value !== "all" ? next.set(key, value) : next.delete(key));
    const url = `${window.location.pathname}${next.size ? `?${next}` : ""}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }

  function select(id: string) {
    update({ note: id });
    if (isMobile) {
      detailRef.current?.scrollIntoView({ block: "start" });
      detailRef.current?.focus({ preventScroll: true });
    }
  }

  return <div className="brain-explorer">
    <div className="brain-toolbar">
      <label className="brain-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="기록 검색" placeholder="어떤 생각을 찾고 있나요?" value={query} onChange={event => update({ q: event.target.value, note: null }, true)} /></label>
      <label className="brain-kind-filter"><span className="sr-only">기록 종류</span><select aria-label="기록 종류" value={kind} onChange={event => update({ kind: event.target.value, note: null })}>
        <option value="all">모든 종류</option>{(Object.keys(brainKindLabels) as BrainKind[]).map(key => <option key={key} value={key}>{brainKindLabels[key]}</option>)}
      </select></label>
      <div className="brain-view-switch" aria-label="보기 방식">
        <button type="button" aria-pressed={view === "graph"} onClick={() => update({ view: "graph" })}><Network size={16} aria-hidden="true" />그래프</button>
        <button type="button" aria-pressed={view === "list"} onClick={() => update({ view: "list" })}><List size={16} aria-hidden="true" />목록</button>
      </div>
    </div>
    <div className="brain-topics" aria-label="주제 필터">
      <button type="button" aria-pressed={topic === "all"} onClick={() => update({ topic: null, note: null })}>전체 <span>{graph.nodes.length}</span></button>
      {(Object.keys(brainTopics) as BrainTopic[]).filter(key => graph.nodes.some(node => node.topic === key)).map(key => <button key={key} type="button" aria-pressed={topic === key} onClick={() => update({ topic: key, note: null })}>
        <i aria-hidden="true" style={{ background: brainTopics[key].color }} />{brainTopics[key].label}<span>{graph.nodes.filter(node => node.topic === key).length}</span>
      </button>)}
    </div>
    <div className="brain-workspace">
      <section className="brain-discovery" aria-label="기록 탐색">
        <div className="brain-discovery-heading"><h2>{view === "graph" ? "생각의 연결" : "기록 모아보기"}</h2><p role="status" aria-live="polite">{results.length}개 기록</p></div>
        {results.length === 0 ? <div className="brain-empty"><Search size={26} aria-hidden="true" /><h3>검색 결과가 없습니다.</h3><p>다른 단어를 찾거나 필터를 풀어 보세요.</p><button type="button" onClick={() => update({ q: null, topic: null, kind: null, note: null })}>필터 초기화</button></div>
          : view === "graph" ? <BrainMap graph={graph} visibleIds={new Set(results.map(node => node.id))} selectedId={selected?.id} onSelect={select} />
            : <ul className="brain-node-list">{results.map(node => <li key={node.id}><button type="button" aria-label={`${node.title} 읽기`} aria-pressed={selected?.id === node.id} onClick={() => select(node.id)}>
              <span className="brain-list-meta"><span style={{ color: brainTopics[node.topic].color }}>{brainTopics[node.topic].label}</span><span>{brainKindLabels[node.kind]} · {brainBasisLabels[node.basis].label}</span></span>
              <span className="brain-list-title">{node.title}</span><span className="brain-list-summary">{node.summary}</span>
            </button></li>)}</ul>}
        <div className="brain-discovery-footer"><span>작은 기록에서 시작해, 연결하며 이해하기</span>{selected && <button type="button" className="brain-read-on-mobile" onClick={() => { detailRef.current?.scrollIntoView({ block: "start" }); detailRef.current?.focus({ preventScroll: true }); }}>선택한 기록 읽기 <ArrowDown size={14} /></button>}</div>
      </section>
      <aside className="brain-reader" ref={detailRef} tabIndex={-1} aria-label="기록 읽기">
        <div className="brain-reader-heading"><span><BookOpen size={15} aria-hidden="true" />기록 읽기</span>{selected && <div><Link href={`/brain/${selected.id}`} aria-label="이 기록만 보기">개별 페이지 <ArrowUpRight size={14} aria-hidden="true" /></Link><button type="button" aria-label="기록 선택 해제" onClick={() => update({ note: null })}><X size={16} /></button></div>}</div>
        {selected ? <BrainNote node={selected} graph={graph} onSelect={select} /> : <div className="brain-reader-welcome">
          <span className="brain-welcome-mark"><Network size={27} aria-hidden="true" /></span><h2>생각을 따라가 보세요.</h2><p>해결한 문제, 아직 남은 질문, 잊고 싶지 않은 생각을 연결해 둡니다.</p>
          <p className="brain-start-label">여기서 시작해 볼까요?</p>
          {graph.nodes.slice(0, 3).map(node => <button type="button" key={node.id} onClick={() => select(node.id)}>{node.title}<ArrowUpRight size={16} aria-hidden="true" /></button>)}
          <p className="brain-welcome-footnote">기록을 고르면 본문과 연결 이유를 함께 읽을 수 있습니다.</p>
        </div>}
      </aside>
    </div>
  </div>;
}
