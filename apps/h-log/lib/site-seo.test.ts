import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readAppSource(path: string): string {
  return readFileSync(new URL(`../app/${path}`, import.meta.url), "utf8");
}

describe("site SEO metadata", () => {
  it("defines root defaults and a canonical for every public page family", () => {
    const layoutSource = readAppSource("layout.tsx");

    assert.match(layoutSource, /metadataBase/);
    assert.match(layoutSource, /template:\s*"%s \| 손홍백"/);
    assert.match(layoutSource, /openGraph:/);
    assert.match(layoutSource, /twitter:/);

    const canonicalSources = [
      ["page.tsx", /canonical:\s*"\/"/],
      ["resume/page.tsx", /canonical:\s*"\/resume"/],
      ["portfolio/page.tsx", /canonical:\s*"\/portfolio"/],
      ["portfolio/[slug]/page.tsx", /canonical:\s*`\/portfolio\/\$\{slug\}`/],
      ["blog/page.tsx", /canonical:\s*"\/blog"/],
      ["blog/[slug]/page.tsx", /canonical:\s*post\.href/],
    ] as const;

    for (const [path, canonicalPattern] of canonicalSources) {
      const source = readAppSource(path);

      assert.match(source, /description:/, `${path} should define a description`);
      assert.match(source, /title:/, `${path} should define a title`);
      assert.match(source, canonicalPattern, `${path} should define its canonical`);
    }

    for (const path of [
      "portfolio/[slug]/page.tsx",
      "blog/[slug]/page.tsx",
    ]) {
      assert.match(
        readAppSource(path),
        /images:\s*\["\/opengraph-image"\]/,
        `${path} should preserve the default social image`,
      );
    }
  });

  it("renders the required structured data through safe React data", () => {
    const layoutSource = readAppSource("layout.tsx");
    const blogDetailSource = readAppSource("blog/[slug]/page.tsx");
    const jsonLdComponentSource = readFileSync(
      new URL("../components/seo/JsonLd.tsx", import.meta.url),
      "utf8",
    );

    assert.match(layoutSource, /"@type": "Person"/);
    assert.match(layoutSource, /"@type": "WebSite"/);
    assert.match(layoutSource, /<JsonLd data=\{personJsonLd\}/);
    assert.match(layoutSource, /<JsonLd data=\{websiteJsonLd\}/);
    assert.match(blogDetailSource, /"@type": "BlogPosting"/);
    assert.match(blogDetailSource, /<JsonLd data=\{blogPostingJsonLd\}/);
    assert.doesNotMatch(
      `${layoutSource}\n${blogDetailSource}\n${jsonLdComponentSource}`,
      /dangerouslySetInnerHTML/,
    );
  });

  it("publishes crawler assets and keeps legacy project routes as permanent redirects", () => {
    const iconPath = new URL("../app/icon.svg", import.meta.url);
    const openGraphImagePath = new URL(
      "../app/opengraph-image.tsx",
      import.meta.url,
    );
    const robotsPath = new URL("../app/robots.txt/route.ts", import.meta.url);
    const projectsRedirectSource = readAppSource("projects/page.tsx");
    const projectRedirectSource = readAppSource("projects/[slug]/page.tsx");
    const sitemapSource = readAppSource("sitemap.xml/route.ts");

    assert.equal(existsSync(iconPath), true);
    assert.equal(existsSync(openGraphImagePath), true);
    assert.equal(existsSync(robotsPath), true);
    assert.match(projectsRedirectSource, /permanentRedirect\("\/portfolio"\)/);
    assert.match(
      projectRedirectSource,
      /permanentRedirect\(`\/portfolio\/\$\{slug\}`\)/,
    );
    assert.match(sitemapSource, /buildPublicSitemapXml/);
    assert.match(sitemapSource, /projects\.map/);
    assert.doesNotMatch(sitemapSource, /["'`]\/projects(?:\/|["'`])/);
  });
});
