import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostTagRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";
import { buildBlogCrawlerOutputs } from "./blog-crawler-output.ts";

const baseTimestamp = "2026-06-30T00:00:00.000Z";
const diagramAlt = "Crawler output must not repeat this diagram description";

function createPost(slug: string, overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    articleMode: "document_analysis",
    createdAt: baseTimestamp,
    currentVersionId: `version-${slug}`,
    description: `${slug} description`,
    id: `post-${slug}`,
    publishedAt: "2026-06-30T09:00:00.000Z",
    retractedAt: null,
    slug,
    status: "published",
    title: slug,
    unpublishedAt: null,
    updatedAt: baseTimestamp,
    ...overrides,
  };
}

function createVersion(
  slug: string,
  overrides: Partial<PostVersionRecord> & {
    contentMarkdown?: string;
  } = {},
): PostVersionRecord {
  const { contentMarkdown = `# ${slug}\n\n${slug} body.\n`, ...recordOverrides } =
    overrides;
  const content = createPostVersionContentFromMarkdown(contentMarkdown);

  return {
    ...content,
    createdAt: baseTimestamp,
    createdBy: "admin",
    description: `${slug} description`,
    id: `version-${slug}`,
    personaVersionId: null,
    postId: `post-${slug}`,
    researchPackId: null,
    title: slug,
    versionNo: 1,
    ...recordOverrides,
  };
}

function createTag(slug: string, tag: string): PostTagRecord {
  return {
    createdAt: baseTimestamp,
    id: `tag-${slug}-${tag}`,
    postId: `post-${slug}`,
    tag,
  };
}

function createStore(): BlogContentStore {
  return {
    assets: [
      {
        alt: diagramAlt,
        assetHash: "a".repeat(64),
        createdAt: baseTimestamp,
        generatedBy: "handdrawn-diagram",
        id: "asset-crawler-public",
        path: "/blog-assets/diagrams/crawler-public.svg",
        postId: "post-crawler-public",
        postVersionId: "version-crawler-public",
        status: "ready",
        type: "diagram",
        verifiedAt: baseTimestamp,
      },
    ],
    posts: [
      createPost("crawler-public"),
      createPost("newer-public", {
        publishedAt: "2026-06-30T10:00:00.000Z",
      }),
      createPost("preview-hidden", {
        publishedAt: null,
        status: "ready_to_publish",
      }),
      createPost("failed-hidden", {
        publishedAt: null,
        status: "failed_verification",
      }),
    ],
    sources: [],
    tags: [
      createTag("crawler-public", "SEO"),
      createTag("newer-public", "LLM"),
      createTag("preview-hidden", "비공개"),
      createTag("failed-hidden", "실패"),
    ],
    versions: [
      createVersion("crawler-public", {
        contentMarkdown: "# Crawler Public\n\nCrawler-safe body.\n",
        title: "Crawler Public",
      }),
      createVersion("newer-public", {
        contentMarkdown: "# Newer Public\n\nNewer public body.\n",
        title: "Newer Public",
      }),
      createVersion("preview-hidden", {
        contentMarkdown:
          "# Preview Hidden\n\nPrivate draft body with evidence_path=/tmp/internal.log.\n",
        title: "Preview Hidden",
      }),
      createVersion("failed-hidden", {
        contentMarkdown: "# Failed Hidden\n\nFailed verification body.\n",
        title: "Failed Hidden",
      }),
    ],
  };
}

describe("blog crawler outputs", () => {
  it("renders sitemap, feed, and llms outputs from published current versions only", () => {
    const outputs = buildBlogCrawlerOutputs(createStore(), {
      origin: "https://h-log.example",
    });

    assert.match(outputs.sitemapXml, /https:\/\/h-log\.example\/blog\/newer-public/);
    assert.match(outputs.sitemapXml, /https:\/\/h-log\.example\/blog\/crawler-public/);
    assert.doesNotMatch(outputs.sitemapXml, /preview-hidden|failed-hidden/);

    assert.match(outputs.feedXml, /<link>https:\/\/h-log\.example\/blog\/newer-public<\/link>/);
    assert.match(outputs.feedXml, /<guid isPermaLink="false">newer-public:[a-f0-9]+<\/guid>/);
    assert.doesNotMatch(outputs.feedXml, /preview-hidden|failed-hidden/);

    assert.match(outputs.llmsTxt, /- \[Newer Public\]\(https:\/\/h-log\.example\/blog\/newer-public\)/);
    assert.match(outputs.llmsTxt, /markdown: https:\/\/h-log\.example\/blog\/newer-public\.md/);
    assert.match(outputs.llmsTxt, /content_hash:/);
    assert.doesNotMatch(outputs.llmsTxt, /preview-hidden|failed-hidden|evidence_path/);

    assert.match(outputs.llmsFullTxt, /# Newer Public/);
    assert.match(outputs.llmsFullTxt, /# Crawler Public/);
    assert.doesNotMatch(
      outputs.llmsFullTxt,
      /Private draft body|Failed verification body|evidence_path/,
    );
    assert.doesNotMatch(
      `${outputs.feedXml}\n${outputs.llmsTxt}\n${outputs.llmsFullTxt}`,
      new RegExp(diagramAlt),
    );
  });
});
