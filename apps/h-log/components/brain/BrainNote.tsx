import Link from "next/link";
import { ArrowUpRight, Link2 } from "lucide-react";

import { brainBasisLabels, brainKindLabels, brainRelationLabels, brainTopics, type BrainGraph, type BrainNode } from "@/lib/brain";

export function BrainNote({ node, graph, asPage = false, onSelect }: {
  node: BrainNode;
  graph: BrainGraph;
  asPage?: boolean;
  onSelect?: (id: string) => void;
}) {
  const Heading = asPage ? "h1" : "h2";
  const basis = brainBasisLabels[node.basis];
  const related = graph.edges.filter(edge => edge.from === node.id || edge.to === node.id);

  return (
    <article className="brain-note" aria-label="선택한 기록">
      <div className="brain-note-meta">
        <span style={{ color: brainTopics[node.topic].color }}>{brainTopics[node.topic].label}</span>
        <span>·</span><span>{brainKindLabels[node.kind]}</span>
      </div>
      <Heading className="brain-note-title">{node.title}</Heading>
      <p className="brain-note-summary">{node.summary}</p>
      {node.occurredOn && <p className="brain-recorded-date">사건 날짜 <time dateTime={node.occurredOn}>{node.occurredOn}</time></p>}
      <div className="brain-note-provenance">
        <strong>{basis.label}</strong>
        <p>{basis.description}</p>
      </div>
      {node.sections.map(section => (
        <section className="brain-note-section" key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
      {node.questions.length > 0 && (
        <section className="brain-note-questions">
          <h3>남겨 둔 질문</h3>
          <ul>{node.questions.map(question => <li key={question}>{question}</li>)}</ul>
        </section>
      )}
      <ul className="brain-tags" aria-label="태그">{node.tags.map(tag => <li key={tag}>#{tag}</li>)}</ul>
      {related.length > 0 && (
        <section className="brain-note-related" aria-label="연결된 기록">
          <h3><Link2 size={15} aria-hidden="true" /> 이어지는 생각 <span>{related.length}</span></h3>
          <ul>{related.map(edge => {
            const other = graph.nodes.find(item => item.id === (edge.from === node.id ? edge.to : edge.from))!;
            const content = <><span className="brain-related-title">{other.title}</span><span className="brain-related-reason">{edge.relation === "revises" && edge.to === node.id ? "이후 회고" : brainRelationLabels[edge.relation]} · {edge.reason}</span></>;
            return <li key={`${edge.from}-${edge.to}-${edge.relation}`}>
              {onSelect
                ? <button type="button" onClick={() => onSelect(other.id)}>{content}</button>
                : <Link href={`/brain/${other.id}`}>{content}</Link>}
            </li>;
          })}</ul>
        </section>
      )}
      <section className="brain-note-sources" aria-label="기록의 출처">
        <h3>참고한 기록</h3>
        <ul>{node.sources.map(source => <li key={source.label}>
          {source.href ? <a href={source.href} {...(source.href.startsWith("https:") ? { target: "_blank", rel: "noreferrer", "aria-label": `${source.label} (새 창)` } : {})}>{source.label}<ArrowUpRight size={13} aria-hidden="true" /></a> : <span>{source.label}</span>}
        </li>)}</ul>
        <p className="brain-recorded-date">정리일 <time dateTime={node.recordedAt}>{node.recordedAt.replaceAll("-", ".")}</time></p>
      </section>
    </article>
  );
}
