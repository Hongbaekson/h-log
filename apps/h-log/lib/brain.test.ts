import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPublicSitemapXml } from "./blog-crawler-output.ts";

import {
  findBrainNode,
  searchBrainNodes,
  selectPublicBrain,
  type BrainCatalog,
  type BrainRecord,
} from "./brain.ts";

function record(id: string, overrides: Partial<BrainRecord> = {}): BrainRecord {
  return {
    id,
    title: "커밋 후 작업의 전달 경계",
    summary: "Redis와 트랜잭션의 역할을 구분한다.",
    kind: "learning",
    topic: "reliability",
    basis: "implementation",
    recordedAt: "2026-10-06",
    sections: [{ heading: "확인한 점", paragraphs: ["커밋 후 실행과 영속 전달은 따로 확인한다."] }],
    questions: ["프로세스가 멈추면 어디에서 다시 시작할까?"],
    tags: ["Redis", "트랜잭션"],
    sources: [{ label: "공식 문서", href: "https://redis.io/docs/latest/develop/pubsub/" }],
    visibility: "public",
    ...overrides,
  };
}

describe("Second Brain public boundary", () => {
  it("projects only public nodes and public edges without private metadata", () => {
    const catalog: BrainCatalog = {
      nodes: [
        { ...record("commit-boundary"), privateEvidence: "PRIVATE_LOCATION" },
        record("recovery"),
        record("secret", { visibility: "private", title: "PRIVATE_TITLE", tags: ["PRIVATE_TAG"] }),
      ],
      edges: [
        { from: "commit-boundary", to: "recovery", relation: "extends", reason: "전달 이후 복구를 검토한다.", visibility: "public" },
        { from: "commit-boundary", to: "secret", relation: "extends", reason: "PRIVATE_REASON", visibility: "public" },
        { from: "commit-boundary", to: "recovery", relation: "supports", reason: "PRIVATE_RELATION", visibility: "private" },
      ],
    };

    const graph = selectPublicBrain(catalog);
    assert.deepEqual(graph.nodes.map((node) => node.id), ["commit-boundary", "recovery"]);
    assert.equal(graph.edges.length, 1);
    assert.doesNotMatch(JSON.stringify(graph), /PRIVATE_|visibility|privateEvidence/);
    assert.equal(findBrainNode(graph, "secret"), undefined);
    assert.deepEqual(searchBrainNodes(graph, { query: "PRIVATE_TAG" }), []);
    const xml = buildPublicSitemapXml({ posts: [], sources: [], tags: [], versions: [] }, {
      origin: "https://example.com", paths: ["/brain", ...graph.nodes.map(node => `/brain/${node.id}`)],
    });
    assert.match(xml, /https:\/\/example\.com\/brain\/commit-boundary/);
    assert.doesNotMatch(xml, /secret|PRIVATE_/);
  });

  it("keeps public references but never sends unsafe source destinations", () => {
    const graph = selectPublicBrain({
      nodes: [record("sources", { sources: [
        { label: "소개", href: "/resume" },
        { label: "사례", href: "/portfolio/redisson-async-processing-recovery" },
        { label: "공식", href: "https://redis.io/docs/latest/develop/pubsub/" },
        { label: "로컬", href: "file:///D:/private/note.md" },
        { label: "내부", href: "https://wiki.corp/note" },
        { label: "실행", href: "javascript:alert(1)" },
        { label: "관리", href: "/admin/private" },
        { label: "자격", href: "https://user:password@example.com/" },
      ] })],
      edges: [],
    });

    assert.deepEqual(graph.nodes[0].sources.flatMap((source) => source.href ? [source.href] : []), [
      "/resume", "/portfolio/redisson-async-processing-recovery", "https://redis.io/docs/latest/develop/pubsub/",
    ]);
    assert.doesNotMatch(JSON.stringify(graph), /file:|wiki\.corp|javascript:|\/admin|password/);
  });
});

describe("Second Brain discovery", () => {
  const catalog: BrainCatalog = {
    nodes: [record("redis-commit"), record("html", {
      title: "문서의 공백도 의미다", summary: "HTML을 텍스트로 정리한다.",
      tags: ["파싱"], topic: "tools", kind: "question", basis: "question",
      sections: [{ heading: "질문", paragraphs: ["단어 사이 공백은 남아 있을까?"] }],
      questions: [],
    })],
    edges: [],
  };

  it("finds notes by all query terms across their content, independent of case and spacing", () => {
    const graph = selectPublicBrain(catalog);
    assert.deepEqual(searchBrainNodes(graph, { query: "  REDIS   커밋  " }).map((node) => node.id), ["redis-commit"]);
    assert.deepEqual(searchBrainNodes(graph, { query: "단어 공백" }).map((node) => node.id), ["html"]);
    assert.deepEqual(searchBrainNodes(graph, { query: "없는기억" }), []);
  });

  it("combines topic and kind filters and resolves only an exact existing id", () => {
    const graph = selectPublicBrain(catalog);
    assert.deepEqual(searchBrainNodes(graph, { topic: "tools", kind: "question" }).map((node) => node.id), ["html"]);
    assert.deepEqual(searchBrainNodes(graph, { topic: "tools", kind: "solution" }), []);
    assert.equal(findBrainNode(graph, "redis-commit")?.title, "커밋 후 작업의 전달 경계");
    assert.equal(findBrainNode(graph, "Redis-commit"), undefined);
  });
});
