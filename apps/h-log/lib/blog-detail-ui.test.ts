import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("blog detail UI", () => {
  it("keeps the article readable and long code keyboard-scrollable", async () => {
    const source = await readFile(
      new URL("../app/blog/[slug]/page.tsx", import.meta.url),
      "utf8",
    );

    assert.match(source, /max-w-\[72ch\]/);
    assert.match(source, /<pre[\s\S]*?tabIndex=\{0\}[\s\S]*?>/);
    assert.match(source, /\[&_pre\]:focus-visible:outline/);
  });

  it("allows long blog titles to wrap on narrow screens", async () => {
    const source = await readFile(
      new URL("../app/blog/[slug]/page.tsx", import.meta.url),
      "utf8",
    );

    assert.match(source, /<h1 className="[^"]*break-words/);
  });

  it("explains sources and Markdown in Korean and marks external navigation", async () => {
    const source = await readFile(
      new URL("../app/blog/[slug]/page.tsx", import.meta.url),
      "utf8",
    );

    assert.match(source, /블로그 목록/);
    assert.match(source, /참고 출처/);
    assert.match(source, /외부 링크는 새 창에서 열립니다/);
    assert.match(source, /새 창에서 열림/);
    assert.match(source, /Markdown 원문 보기/);
    assert.doesNotMatch(source, />Source links</);
  });
});
