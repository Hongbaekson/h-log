import { tryNormalizePublicSourceUrl } from "./public-source-url.ts";

export type BrainKind = "experience" | "solution" | "reflection" | "learning" | "question";
export type BrainBasis = "profile" | "implementation" | "reflection" | "question";
export type BrainTopic = "principles" | "reliability" | "data" | "boundaries" | "tools" | "everyday";
export type BrainRelation = "supports" | "extends" | "applies" | "questions";

export type BrainNode = {
  id: string;
  title: string;
  summary: string;
  kind: BrainKind;
  topic: BrainTopic;
  basis: BrainBasis;
  recordedAt: string;
  sections: { heading: string; paragraphs: string[] }[];
  questions: string[];
  tags: string[];
  sources: { label: string; href?: string }[];
};

export type BrainRecord = BrainNode & { visibility: "public" | "private"; privateEvidence?: string };
export type BrainEdge = { from: string; to: string; relation: BrainRelation; reason: string };
export type BrainGraph = { nodes: BrainNode[]; edges: BrainEdge[] };
export type BrainCatalog = { nodes: BrainRecord[]; edges: (BrainEdge & { visibility: "public" | "private" })[] };
export type BrainSearch = { query?: string; topic?: string; kind?: string };

export const brainTopics: Record<BrainTopic, { label: string; color: string }> = {
  principles: { label: "나의 기준", color: "#b9afff" },
  reliability: { label: "비동기와 복구", color: "#75d5ef" },
  data: { label: "데이터와 성능", color: "#e8c78c" },
  boundaries: { label: "설계와 경계", color: "#95b6ff" },
  tools: { label: "도구와 검증", color: "#e5a7ce" },
  everyday: { label: "일상에서 만든 것", color: "#8cdac4" },
};

export const brainKindLabels: Record<BrainKind, string> = {
  experience: "경험", solution: "해결", reflection: "생각", learning: "배움", question: "질문",
};

export const brainBasisLabels: Record<BrainBasis, { label: string; description: string }> = {
  profile: { label: "기존 기록", description: "소개·경력 자료 또는 직접 밝힌 목적에서 이어진 기록입니다." },
  implementation: { label: "구현 메모", description: "코드에서 확인한 동작을 일반화한 메모입니다. 당시의 동기나 개인 기여를 확정하는 기록은 아닙니다." },
  reflection: { label: "회고 초안", description: "구현을 바탕으로 재구성한 생각입니다. 당시의 판단과 감정은 아직 확인하지 않았습니다." },
  question: { label: "열린 질문", description: "더 확인하고 싶은 문제입니다. 실제 도입하거나 겪은 장애라는 뜻은 아닙니다." },
};

export const brainRelationLabels: Record<BrainRelation, string> = {
  supports: "생각을 뒷받침", extends: "생각을 확장", applies: "방법을 적용", questions: "다시 질문",
};

function publicSourceHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (href === "/resume" || /^\/portfolio\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(href)) return href;
  return tryNormalizePublicSourceUrl(href);
}

export function selectPublicBrain(catalog: BrainCatalog): BrainGraph {
  const nodes = catalog.nodes.filter((node) => node.visibility === "public").map((node) => ({
    id: node.id,
    title: node.title,
    summary: node.summary,
    kind: node.kind,
    topic: node.topic,
    basis: node.basis,
    recordedAt: node.recordedAt,
    sections: node.sections.map(({ heading, paragraphs }) => ({ heading, paragraphs: [...paragraphs] })),
    questions: [...node.questions],
    tags: [...node.tags],
    sources: node.sources.map(({ label, href }) => ({ label, href: publicSourceHref(href) })),
  }));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = catalog.edges.filter((edge) =>
    edge.visibility === "public" && ids.has(edge.from) && ids.has(edge.to)
  ).map(({ from, to, relation, reason }) => ({ from, to, relation, reason }));
  return { nodes, edges };
}

export function searchBrainNodes(graph: BrainGraph, search: BrainSearch): BrainNode[] {
  const terms = (search.query ?? "").normalize("NFKC").toLowerCase().trim().split(/\s+/).filter(Boolean);
  return graph.nodes.filter((node) => {
    if (search.topic && search.topic !== "all" && node.topic !== search.topic) return false;
    if (search.kind && search.kind !== "all" && node.kind !== search.kind) return false;
    const text = [node.title, node.summary, ...node.tags, ...node.questions,
      ...node.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ].join(" ").normalize("NFKC").toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

export function findBrainNode(graph: BrainGraph, id: string): BrainNode | undefined {
  return graph.nodes.find((node) => node.id === id);
}
