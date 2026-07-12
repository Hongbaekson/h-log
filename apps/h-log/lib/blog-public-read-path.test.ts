import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const productionBlogSurfaces = [
  "../app/blog/page.tsx",
  "../app/blog/[slug]/page.tsx",
  "../app/blog-markdown/[slug]/route.ts",
  "../app/api/search/route.ts",
  "../app/sitemap.xml/route.ts",
  "../app/feed.xml/route.ts",
  "../app/llms.txt/route.ts",
  "../app/llms-full.txt/route.ts",
];
const crawlerSurfaces = productionBlogSurfaces.slice(4);

describe("DB-backed public blog read path", () => {
  it("keeps every production blog surface off the static fixture store", async () => {
    for (const path of productionBlogSurfaces) {
      const source = await readFile(new URL(path, import.meta.url), "utf8");

      assert.doesNotMatch(source, /blog-public-data/);
      assert.match(source, /loadPublicBlogContentStore/);
    }
  });

  it("builds crawler URLs from the configured public origin", async () => {
    for (const path of crawlerSurfaces) {
      const source = await readFile(new URL(path, import.meta.url), "utf8");

      assert.match(source, /resolvePublicSiteOrigin/);
    }
  });
});
