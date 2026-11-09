import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPublicSitemapXml } from "./blog-crawler-output.ts";
import { createPostVersionContentFromMarkdown, type PostRecord } from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import { resolveBrainBlogSources, getPublicPostBrainLinks } from "./brain-blog-sources.ts";

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

describe("current public Blog and Brain connections", () => {
  const origin = "https://hlog.example.org";
  function store(): BlogContentStore {
    const date = "2026-11-10T00:00:00Z";
    return {
      posts: ["current", "hidden"].map(slug => ({
        id: slug, slug, title: "Old title", description: "공개 설명", articleMode: "document_analysis",
        currentVersionId: `v-${slug}`, status: slug === "current" ? "published" : "drafted",
        createdAt: date, updatedAt: date, publishedAt: date, unpublishedAt: null, retractedAt: null,
      })),
      versions: ["current", "hidden"].map(slug => ({
        ...createPostVersionContentFromMarkdown("# 공개 글\n\n검토한 내용입니다."),
        id: `v-${slug}`, postId: slug, title: slug === "current" ? "현재 공개 제목" : "PRIVATE_TITLE",
        description: "공개 설명", versionNo: 1, createdBy: "admin", createdAt: date, personaVersionId: null, researchPackId: null,
      })), sources: [], tags: [],
    };
  }
  const references = () => selectPublicBrain({ nodes: [record("connected", { sources: [
    { label: "OLD_TITLE", href: "/blog/current" },
    { label: "ABSOLUTE_OLD", href: `${origin}/blog/current?old=1#section` },
    { label: "PRIVATE_TITLE", href: `${origin}/blog/hidden` },
    { label: "MISSING_TITLE", href: "/blog/missing" },
    { label: "공식 문서", href: "https://external.example.org/blog/hidden" },
  ] }), record("private-note", { visibility: "private", title: "PRIVATE_NOTE_TITLE" })], edges: [] });

  it("resolves relative and canonical absolute references using current public versions without mutating either source", async () => {
    const graph = references(), content = store();
    const before = JSON.stringify({ graph, content });
    let reads = 0;
    const result = await resolveBrainBlogSources(graph, async () => { reads++; return content; }, origin);
    assert.equal(reads, 1);
    assert.deepEqual(result.nodes[0].sources, [
      { label: "현재 공개 제목", href: "/blog/current" },
      { label: "현재 공개 제목", href: "/blog/current" },
      { label: "블로그 기록" }, { label: "블로그 기록" },
      { label: "공식 문서", href: "https://external.example.org/blog/hidden" },
    ]);
    assert.deepEqual(getPublicPostBrainLinks("current", content, result), [{ href: "/brain/connected", title: graph.nodes[0].title }]);
    assert.deepEqual(getPublicPostBrainLinks("hidden", content, result), []);
    assert.deepEqual(getPublicPostBrainLinks("current", content, { nodes: [], edges: [] }), []);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|MISSING_TITLE|OLD_TITLE|ABSOLUTE_OLD/);
    assert.equal(JSON.stringify({ graph, content }), before);
  });

  it("removes managed titles and URLs for all non-public, missing, foreign and privacy-blocked current versions on each read", async () => {
    const content = store(), graph = references();
    for (const status of ["drafted", "unpublished", "retracted", "correction_pending", "verifying"] satisfies PostRecord["status"][]) {
      const changed = { ...content, posts: content.posts.map(post => ({ ...post, status })) };
      const result = await resolveBrainBlogSources(graph, async () => changed, origin);
      assert.equal(result.nodes[0].sources[0].href, undefined, status);
      assert.doesNotMatch(JSON.stringify(result), /current|OLD_TITLE|PRIVATE_/);
      assert.deepEqual(getPublicPostBrainLinks("current", changed, result), []);
    }
    for (const changed of [
      { ...content, posts: [] }, { ...content, versions: [] },
      { ...content, versions: content.versions.map(version => ({ ...version, postId: "foreign" })) },
      { ...content, versions: content.versions.map(version => ({ ...version, contentMarkdown: "secret@example.com" })) },
    ]) {
      const result = await resolveBrainBlogSources(graph, async () => changed, origin);
      assert.deepEqual(result.nodes[0].sources[0], { label: "블로그 기록" });
      assert.deepEqual(getPublicPostBrainLinks("current", changed, result), []);
    }
    assert.equal((await resolveBrainBlogSources(graph, async () => content, origin)).nodes[0].sources[0].href, "/blog/current");
  });

  it("contains lookup failures to managed sources and distinguishes an error from an empty result", async () => {
    const graph = references();
    const failed = await resolveBrainBlogSources(graph, async () => { throw Error("PRIVATE_DATABASE_ERROR"); }, origin);
    assert.equal(failed.nodes[0].sourcesUnavailable, true);
    assert.equal(failed.nodes[0].title, graph.nodes[0].title);
    assert.deepEqual(failed.nodes[0].sources[0], { label: "블로그 기록" });
    assert.doesNotMatch(JSON.stringify(failed), /PRIVATE_|MISSING_TITLE|\/blog\/current/);
    const empty = await resolveBrainBlogSources(graph, async () => ({ posts: [], versions: [], sources: [], tags: [] }), origin);
    assert.equal(empty.nodes[0].sourcesUnavailable, undefined);
    const unconnected = selectPublicBrain({ nodes: [record("external")], edges: [] });
    assert.strictEqual(await resolveBrainBlogSources(unconnected, async () => { throw Error("must not read Blog"); }, origin), unconnected);
  });

  it("canonicalizes same-origin encoded, slash, query and fragment variants before checking publication", async () => {
    const hrefs = ["/blog/current", `${origin}/blog/current/`, `${origin}/%62log/%63urrent?x=1#s`,
      `${origin}/blog/hidden/`, `${origin}/blog/hidden.md`, `${origin}/blog/hidden%2Fextra`, `${origin}/blog/%zz`];
    const graph = selectPublicBrain({ nodes: [record("variants", { sources: hrefs.map((href, i) => ({ label: `PRIVATE_LABEL_${i}`, href })) })], edges: [] });
    const result = await resolveBrainBlogSources(graph, async () => store(), origin);
    assert.deepEqual(result.nodes[0].sources.flatMap(source => source.href ?? []), Array(3).fill("/blog/current"));
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|hidden|%zz/);
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
