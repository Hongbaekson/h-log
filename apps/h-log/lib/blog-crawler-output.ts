import { buildCrawlerEntries, buildPostPublishCrawlerOutputManifest, type PostPublishCrawlerOutputName, type PostPublishCrawlerOutputEntry } from "./blog-post-publish-verification.ts";
import type { BlogContentStore } from "./blog-public.ts";
import { siteConfig } from "./site.ts";

export type BuildBlogCrawlerOutputsOptions = { origin: string };
export type BuildPublicSitemapOptions = BuildBlogCrawlerOutputsOptions & { paths: readonly string[] };
export type BlogCrawlerOutputs = { feedXml: string; llmsFullTxt: string; llmsTxt: string; sitemapXml: string };

export function sitemapUrl(href: string, origin: string, updatedAt?: string) {
  return `  <url>
    <loc>${escapeXml(toAbsoluteUrl(origin, href))}</loc>
${updatedAt ? `    <lastmod>${escapeXml(updatedAt)}</lastmod>\n` : ""}  </url>`;
}

type CrawlerFormat = {
  prefix: string;
  separator: string;
  suffix: string;
  entry: (entry: PostPublishCrawlerOutputEntry) => string;
};

export function crawlerFormat(name: PostPublishCrawlerOutputName, origin: string): CrawlerFormat {
  switch (name) {
    case "sitemap.xml":
      return {
        prefix: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
        separator: "\n", suffix: "\n</urlset>\n",
        entry: row => sitemapUrl(row.href, origin, row.updatedAt),
      };
    case "feed.xml":
      return {
        prefix: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <link>${escapeXml(origin)}</link>
    <description>${escapeXml(siteConfig.description)}</description>
`,
        separator: "\n", suffix: "\n  </channel>\n</rss>\n",
        entry: row => `    <item>
      <title>${escapeXml(row.title)}</title>
      <link>${escapeXml(toAbsoluteUrl(origin, row.href))}</link>
      <guid isPermaLink="false">${escapeXml(`${row.slug}:${row.contentHash}`)}</guid>
      <description>${escapeXml(row.description)}</description>
      <pubDate>${escapeXml(new Date(row.publishedAt).toUTCString())}</pubDate>
    </item>`,
      };
    case "llms.txt":
      return {
        prefix: `# ${siteConfig.name}\n\n> ${siteConfig.description}\n\n## Posts\n\n`,
        separator: "\n", suffix: "\n",
        entry: row => `- [${escapeMarkdownText(row.title)}](${toAbsoluteUrl(origin, row.href)}): ${row.description}
  - markdown: ${toAbsoluteUrl(origin, row.markdownHref)}
  - published_at: ${row.publishedAt}
  - content_hash: ${row.contentHash}`,
      };
    case "llms-full.txt":
      return {
        prefix: `# ${siteConfig.name} Full Text\n\n${siteConfig.description}\n\n`,
        separator: "\n\n---\n\n", suffix: "\n",
        entry: row => `## ${row.title}

- url: ${toAbsoluteUrl(origin, row.href)}
- markdown: ${toAbsoluteUrl(origin, row.markdownHref)}
- published_at: ${row.publishedAt}
- content_hash: ${row.contentHash}

${row.contentMarkdown ?? ""}`,
      };
  }
}

// In-memory helpers for callers that explicitly need all four outputs.
export function buildBlogCrawlerOutputs(store: BlogContentStore, { origin }: BuildBlogCrawlerOutputsOptions): BlogCrawlerOutputs {
  const manifest = buildPostPublishCrawlerOutputManifest(store);
  function render(name: PostPublishCrawlerOutputName) {
    const format = crawlerFormat(name, origin);
    return format.prefix + manifest[name].map(format.entry).join(format.separator) + format.suffix;
  }
  return { feedXml: render("feed.xml"), llmsFullTxt: render("llms-full.txt"), llmsTxt: render("llms.txt"), sitemapXml: render("sitemap.xml") };
}

export function buildPublicSitemapXml(store: BlogContentStore, { origin, paths }: BuildPublicSitemapOptions) {
  const format = crawlerFormat("sitemap.xml", origin);
  const urls = [...paths.map(path => sitemapUrl(path, origin)), ...buildCrawlerEntries(store, false).map(format.entry)];
  return format.prefix + urls.join(format.separator) + format.suffix;
}

function toAbsoluteUrl(origin: string, href: string): string {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  const normalizedHref = href.startsWith("/") ? href : `/${href}`;

  return `${normalizedOrigin}${normalizedHref}`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return character;
    }
  });
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\[\]])/g, "\\$1");
}
