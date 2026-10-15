import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("blog discovery UI", () => {
  it("keeps the raw publication date in list time markup", async () => {
    const [row, page, search] = await Promise.all([
      readFile(new URL("../components/blog/BlogPostRow.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/blog/(index)/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/blog/BlogSearchPanel.tsx", import.meta.url), "utf8"),
    ]);

    assert.match(row, /<time dateTime=\{publishedAt\}>/);
    assert.match(page, /publishedAt=\{post\.publishedAt\}/);
    assert.match(search, /publishedAt=\{item\.publishedAt\}/);
  });

  it("keeps the search input guidance aligned with the two-character API minimum", async () => {
    const source = await readFile(
      new URL("../components/blog/BlogSearchPanel.tsx", import.meta.url),
      "utf8",
    );
    const input = source.match(/<input[\s\S]*?\/>/g)?.find((markup) => markup.includes('type="search"'));

    assert.ok(input);
    assert.match(input, /aria-describedby="blog-search-help"/);
    assert.match(input, /minLength=\{2\}/);
    assert.match(input, /focus-visible:outline/);
    assert.match(source, /id="blog-search-help"/);
    assert.match(source, /2자 이상 입력해 주세요/);
  });

  it("labels search results with the submitted query", async () => {
    const source = await readFile(
      new URL("../components/blog/BlogSearchPanel.tsx", import.meta.url),
      "utf8",
    );

    assert.match(source, /검색어:\s*<span[\s\S]*?\{snapshot\.query\}/);
  });

  it("exposes the selected tag links as current navigation", async () => {
    const source = await readFile(
      new URL("../components/blog/BlogTopicFilters.tsx", import.meta.url),
      "utf8",
    );

    assert.match(
      source,
      /aria-current=\{selected \? "page" : undefined\}/,
    );
    assert.doesNotMatch(source, /aria-pressed/);
    assert.match(source, /const selected = tag === state\.tag/);
  });

  it("keeps the empty blog index distinct from an empty search result", async () => {
    const [pageSource, searchUiSource] = await Promise.all([
      readFile(new URL("../app/blog/(index)/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("./blog-search-ui.ts", import.meta.url), "utf8"),
    ]);

    assert.match(pageSource, /아직 공개된 글이 없습니다/);
    assert.match(pageSource, /태그의 공개 글이 없습니다/);
    assert.match(searchUiSource, /일치하는 공개 글이 없습니다/);
  });

  it("provides explicit loading and retryable error boundaries for the DB-backed route", async () => {
    const [loadingSource, errorSource] = await Promise.all([
      readFile(new URL("../app/blog/(index)/loading.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/blog/error.tsx", import.meta.url), "utf8"),
    ]);

    assert.match(loadingSource, /role="status"/);
    assert.match(loadingSource, /블로그 글을 불러오는 중입니다/);
    assert.match(errorSource, /"use client"/);
    assert.match(errorSource, /블로그를 불러오지 못했습니다/);
    assert.match(errorSource, /onClick=\{reset\}/);
    assert.doesNotMatch(errorSource, /error\.message/);
  });
});
