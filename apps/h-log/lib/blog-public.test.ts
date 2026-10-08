import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPostVersionContentHash,
  createPostVersionContentFromMarkdown,
  type PostAssetRecord,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import {
  getPublicBlogIndex,
  getPublicBlogPostBySlug,
  getPublicBlogPostMarkdown,
  type BlogContentStore,
} from "./blog-public.ts";

const baseTimestamp = "2026-06-25T00:00:00.000Z";
const diagramAssetHash = "a".repeat(64);

function createPost(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    articleMode: "document_analysis",
    createdAt: baseTimestamp,
    currentVersionId: "version-public-one",
    description: "Public blog route contract",
    id: "post-public-one",
    publishedAt: "2026-06-25T09:00:00.000Z",
    retractedAt: null,
    slug: "public-one",
    status: "published",
    title: "Public One",
    unpublishedAt: null,
    updatedAt: baseTimestamp,
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<PostVersionRecord> & {
    contentMarkdown?: string;
  } = {},
): PostVersionRecord {
  const { contentMarkdown = "# Public One\n\nPublished body.\n", ...recordOverrides } =
    overrides;
  const content = createPostVersionContentFromMarkdown(contentMarkdown);

  return {
    ...content,
    createdAt: baseTimestamp,
    createdBy: "admin",
    description: "Public blog route contract",
    id: "version-public-one",
    personaVersionId: null,
    postId: "post-public-one",
    researchPackId: null,
    title: "Public One",
    versionNo: 1,
    ...recordOverrides,
  };
}

function createSource(overrides: Partial<PostSourceRecord> = {}): PostSourceRecord {
  return {
    fetchedAt: baseTimestamp,
    id: "source-public-one",
    postId: "post-public-one",
    publisher: "Next.js",
    researchPackId: null,
    snapshotHash: "source-hash",
    sourceRole: "official",
    summary: "App Router reference",
    title: "Next.js App Router",
    url: "https://nextjs.org/docs/app",
    ...overrides,
  };
}

function createTag(postId: string, tag: string): PostTagRecord {
  return {
    createdAt: baseTimestamp,
    id: `${postId}-${tag}`,
    postId,
    tag,
  };
}

function createAsset(overrides: Partial<PostAssetRecord> = {}): PostAssetRecord {
  return {
    alt: "Source collection to publish workflow",
    assetHash: diagramAssetHash,
    createdAt: baseTimestamp,
    generatedBy: "handdrawn-diagram",
    id: "asset-public-one",
    path: "/blog-assets/diagrams/public-one.svg",
    postId: "post-public-one",
    postVersionId: "version-public-one",
    status: "ready",
    type: "diagram",
    verifiedAt: baseTimestamp,
    ...overrides,
  };
}

function createStore(): BlogContentStore {
  return {
    assets: [],
    posts: [
      createPost(),
      createPost({
        currentVersionId: "version-public-two",
        description: "Newer public post",
        id: "post-public-two",
        publishedAt: "2026-06-26T09:00:00.000Z",
        slug: "public-two",
        title: "Public Two",
      }),
      createPost({
        currentVersionId: "version-preview",
        id: "post-preview",
        publishedAt: null,
        slug: "preview-one",
        status: "ready_to_publish",
        title: "Preview One",
      }),
    ],
    sources: [
      createSource(),
      createSource({
        id: "source-public-two",
        postId: "post-public-two",
        title: "PostgreSQL documentation",
        url: "https://www.postgresql.org/docs/",
      }),
    ],
    tags: [
      createTag("post-public-one", "DB"),
      createTag("post-public-one", "운영"),
      createTag("post-public-two", "DB"),
      createTag("post-preview", "비공개"),
    ],
    versions: [
      createVersion(),
      createVersion({
        contentMarkdown: "# Public Two\n\nNewer body.\n",
        id: "version-public-two",
        postId: "post-public-two",
        title: "Public Two",
      }),
      createVersion({
        contentMarkdown: "# Preview One\n\nHidden body.\n",
        id: "version-preview",
        postId: "post-preview",
        title: "Preview One",
      }),
    ],
  };
}

function textParagraph(text: string) {
  return { type: "paragraph", children: [{ type: "text", text }] };
}

describe("DB-backed public blog routes", () => {
  it("builds public detail and markdown output without exposing preview posts", () => {
    const store = createStore();
    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.equal(detail.href, "/blog/public-one");
    assert.equal(detail.markdownHref, "/blog/public-one.md");
    assert.deepEqual(detail.tags, ["DB", "운영"]);
    assert.equal(detail.sourceLinks[0]?.url, "https://nextjs.org/docs/app");
    assert.match(detail.contentHtml, /<h1>Public One<\/h1>/);
    assert.equal(getPublicBlogPostBySlug("preview-one", store), undefined);
    assert.equal(getPublicBlogPostMarkdown("public-one", store), "# Public One\n\nPublished body.\n");
    assert.equal(getPublicBlogPostMarkdown("preview-one", store), undefined);
  });

  it("does not expose unsafe public source URLs from stored content", () => {
    const store = {
      ...createStore(),
      sources: [
        createSource({
          id: "source-unsafe",
          url: "javascript:alert(1)",
        }),
      ],
    };

    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.deepEqual(detail.sourceLinks, []);
  });

  it("builds safe render blocks from Markdown instead of stored HTML", () => {
    const safeContent = createPostVersionContentFromMarkdown(
      "# Public One\n\n본문 **강조**와 <script>alert(\"x\")</script>\n\n```\nconsole.log(\"ok\")\n```\n",
    );
    const unsafeStoredHtml = "<script>alert(1)</script>";
    const store = {
      ...createStore(),
      versions: [
        createVersion({
          contentHtml: unsafeStoredHtml,
          contentHash: createPostVersionContentHash({
            contentHtml: unsafeStoredHtml,
            contentMarkdown: safeContent.contentMarkdown,
          }),
          contentMarkdown: safeContent.contentMarkdown,
        }),
      ],
    };

    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.equal(detail.contentHtml, unsafeStoredHtml);
    assert.deepEqual(detail.contentBlocks, [
      {
        children: [{ text: "Public One", type: "text" }],
        level: 1,
        type: "heading",
      },
      {
        children: [
          { text: "본문 ", type: "text" },
          { children: [{ text: "강조", type: "text" }], type: "strong" },
          { text: "와 <script>alert(\"x\")</script>", type: "text" },
        ],
        type: "paragraph",
      },
      {
        code: 'console.log("ok")',
        type: "code",
      },
    ]);
  });

  it("preserves fenced code with blank lines and adjacent paragraphs", () => {
    const code = 'const first = 1;\n\n## A literal heading\n<span>literal markup</span>';
    const version = createVersion({
      contentMarkdown: `# Public One\n\nBefore.\n\`\`\`typescript\n${code}\n\`\`\`\nAfter.\n`,
    });
    const store = { ...createStore(), versions: [version] };
    const originalVersion = { ...version };

    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.deepEqual(detail.contentBlocks, [
      { type: "heading", level: 1, children: [{ type: "text", text: "Public One" }] },
      { type: "paragraph", children: [{ type: "text", text: "Before." }] },
      { type: "code", code },
      { type: "paragraph", children: [{ type: "text", text: "After." }] },
    ]);
    assert.equal(getPublicBlogPostMarkdown("public-one", store), version.contentMarkdown);
    assert.deepEqual(version, originalVersion);
  });

  it("closes code only with a matching fence of sufficient length", () => {
    for (const marker of ["`", "~"]) {
      const code = `first\n\n${marker.repeat(3)}\n${marker === "`" ? "~~~~" : "````"}\n${marker.repeat(4)} trailing text\nlast  `;
      const indented = code.split("\n").map((line) => `  ${line}`).join("\n");
      const store = {
        ...createStore(),
        versions: [createVersion({
          contentMarkdown: `Before.\n\n  ${marker.repeat(4)}text\n${indented}\n ${marker.repeat(5)} \t\nAfter.\n`,
        })],
      };

      assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [
        { type: "paragraph", children: [{ type: "text", text: "Before." }] },
        { type: "code", code },
        { type: "paragraph", children: [{ type: "text", text: "After." }] },
      ]);
    }
  });

  it("keeps unclosed code fences literal through the end of the document", () => {
    const store = {
      ...createStore(),
      versions: [createVersion({
        contentMarkdown: "Before.\n\n~~~text\nfirst\n\n## Literal heading\n**literal emphasis**\n",
      })],
    };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [
      { type: "paragraph", children: [{ type: "text", text: "Before." }] },
      { type: "code", code: "first\n\n## Literal heading\n**literal emphasis**" },
    ]);
  });

  it("preserves list order, starting numbers and surrounding prose without rewriting saved content", () => {
    const version = createVersion({
      contentMarkdown: "Before.\n\n- first\n- second\n\n3. third\n4. fourth\n\n0) zero\n1) one\n\nAfter.\n",
    });
    const originalVersion = { ...version };
    const store = { ...createStore(), versions: [version] };
    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.deepEqual(detail.contentBlocks, [
      textParagraph("Before."),
      { type: "list", start: null, items: [[textParagraph("first")], [textParagraph("second")]] },
      { type: "list", start: 3, items: [[textParagraph("third")], [textParagraph("fourth")]] },
      { type: "list", start: 0, items: [[textParagraph("zero")], [textParagraph("one")]] },
      textParagraph("After."),
    ]);
    assert.equal(detail.contentHtml, version.contentHtml);
    assert.equal(getPublicBlogPostMarkdown("public-one", store), version.contentMarkdown);
    assert.deepEqual(version, originalVersion);
  });

  it("keeps multiple paragraphs, mixed nested lists and quotes inside their list item", () => {
    const store = {
      ...createStore(),
      versions: [createVersion({
        contentMarkdown: "- first\n  continuation\n\n  second paragraph\n  1. nested\n     > quoted\n\n- last\n",
      })],
    };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [{
      type: "list", start: null, items: [
        [
          textParagraph("first continuation"),
          textParagraph("second paragraph"),
          { type: "list", start: 1, items: [[
            textParagraph("nested"),
            { type: "blockquote", children: [textParagraph("quoted")] },
          ]] },
        ],
        [textParagraph("last")],
      ],
    }]);
  });

  it("preserves quote paragraphs, lazy continuation and nested safe inline content", () => {
    const store = {
      ...createStore(),
      versions: [createVersion({
        contentMarkdown: '> first\ncontinuation\n>\n> second\n>\n> > [문서](/blog)\n>\n> [위험](javascript:alert(1)) <script>alert("x")</script>\n\nAfter.\n',
      })],
    };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [
      { type: "blockquote", children: [
        textParagraph("first continuation"),
        textParagraph("second"),
        { type: "blockquote", children: [{ type: "paragraph", children: [
          { type: "link", href: "/blog", children: [{ type: "text", text: "문서" }] },
        ] }] },
        textParagraph('위험 <script>alert("x")</script>'),
      ] },
      textParagraph("After."),
    ]);
  });

  it("preserves fenced and indented code inside lists and quotes without parsing literal markers", () => {
    const code = '- literal\n\n> [literal](/blog)\n\n';
    const markdown = [
      "- item", "", "  ```text", ...code.split("\n").map((line) => `  ${line}`),
      "  ``` \t", "", "      indented code", "      - literal", "", "- last", "",
      "> quoted", ">", "> ~~~text", "> first", ">", "> ## literal heading", "> ~~~ \t", "", "After.",
    ].join("\n");
    const store = { ...createStore(), versions: [createVersion({ contentMarkdown: markdown })] };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [
      { type: "list", start: null, items: [
        [textParagraph("item"), { type: "code", code }, { type: "code", code: "indented code\n- literal\n" }],
        [textParagraph("last")],
      ] },
      { type: "blockquote", children: [textParagraph("quoted"), { type: "code", code: "first\n\n## literal heading" }] },
      textParagraph("After."),
    ]);
  });

  it("anchors the verified diagram to a top-level heading instead of a quoted heading", () => {
    const store = {
      ...createStore(),
      assets: [createAsset()],
      versions: [createVersion({ contentMarkdown: "> ## Quoted\n> quote body\n\n## Actual\nActual body.\n" })],
    };
    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.deepEqual(detail.contentBlocks.map((block) => block.type), ["blockquote", "heading", "diagram", "paragraph"]);
    assert.deepEqual(detail.contentBlocks[0], { type: "blockquote", children: [
      { type: "heading", level: 2, children: [{ type: "text", text: "Quoted" }] },
      textParagraph("quote body"),
    ] });
    assert.deepEqual(detail.contentBlocks[1], { type: "heading", level: 2, children: [{ type: "text", text: "Actual" }] });
  });

  it("keeps unsupported blocks and reference-style links literal", () => {
    const paragraphs = ["<div>literal HTML</div>", "#### Fourth heading", "---", "[label][ref]", "[ref]: javascript:alert(1)"];
    const store = { ...createStore(), versions: [createVersion({ contentMarkdown: paragraphs.join("\n\n") })] };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, paragraphs.map(textParagraph));
  });

  it("reads aligned tables, empty cells and escaped pipes without changing saved content", () => {
    const version = createVersion({ contentMarkdown: [
      "Before.", "",
      "| 기술 | **설명** | 수량 | 비고 |",
      "| :--- | :---: | ---: | --- |",
      "| Redis | `a\\|b` | 2 | |",
      "| 왼쪽\\|오른쪽 | | 3 | 마지막 | 초과 셀 |",
      "| 짧은 행 |", "", "After.",
    ].join("\n") });
    const originalVersion = { ...version };
    const store = { ...createStore(), versions: [version] };
    const cell = (text: string) => text ? [{ type: "text", text }] : [];

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [
      textParagraph("Before."),
      {
        type: "table", align: ["left", "center", "right", null],
        header: [cell("기술"), [{ type: "strong", children: cell("설명") }], cell("수량"), cell("비고")],
        rows: [
          [cell("Redis"), [{ type: "code", text: "a|b" }], cell("2"), []],
          [cell("왼쪽|오른쪽"), [], cell("3"), cell("마지막")],
          [cell("짧은 행"), [], [], []],
        ],
      },
      textParagraph("After."),
    ]);
    assert.equal(getPublicBlogPostMarkdown("public-one", store), version.contentMarkdown);
    assert.equal(getPublicBlogPostBySlug("public-one", store)?.contentHtml, version.contentHtml);
    assert.deepEqual(version, originalVersion);
  });

  it("uses the same safe inline allowlist in table headers and cells", () => {
    const store = { ...createStore(), versions: [createVersion({ contentMarkdown: [
      "[문서](/blog) | 코드", "--- | ---",
      "[공식](https://example.com/docs) | `[literal](/blog)`",
      '[위험](javascript:alert(1)) | <img src=x onerror="alert(1)">',
      "https://example.com | ~~literal~~",
    ].join("\n") })] };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [{
      type: "table", align: [null, null],
      header: [[{ type: "link", href: "/blog", children: [{ type: "text", text: "문서" }] }], [{ type: "text", text: "코드" }]],
      rows: [
        [[{ type: "link", href: "https://example.com/docs", children: [{ type: "text", text: "공식" }] }], [{ type: "code", text: "[literal](/blog)" }]],
        [[{ type: "text", text: "위험" }], [{ type: "text", text: '<img src=x onerror="alert(1)">' }]],
        [[{ type: "text", text: "https://example.com" }], [{ type: "text", text: "~~literal~~" }]],
      ],
    }]);
  });

  it("recognizes header-only and nested tables while preserving unsupported task markers", () => {
    const table = {
      type: "table", align: [null, null],
      header: [[{ type: "text", text: "A" }], [{ type: "text", text: "B" }]], rows: [],
    };
    const store = { ...createStore(), versions: [createVersion({ contentMarkdown: [
      "Before.\nA | B\n--- | ---", "",
      "> A | B\n> --- | ---", "",
      "- item\n\n  A | B\n  --- | ---", "",
      "Between.", "",
      "- [x] done\n- [ ] todo\n\n  continuation",
    ].join("\n") })] };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [
      textParagraph("Before."), table,
      { type: "blockquote", children: [table] },
      { type: "list", start: null, items: [[textParagraph("item"), table]] },
      textParagraph("Between."),
      { type: "list", start: null, items: [[textParagraph("[x] done")], [textParagraph("[ ] todo"), textParagraph("continuation")]] },
    ]);
  });

  it("keeps malformed tables and fenced table syntax literal", () => {
    const invalid = "| A | B |\n| --- |\n| body |";
    const valid = "| A | B |\n| --- | --- |\n| body | |";
    const store = { ...createStore(), versions: [createVersion({
      contentMarkdown: `${invalid}\n\n\`\`\`text\n${valid}\n\`\`\``,
    })] };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [
      textParagraph(invalid.replaceAll("\n", " ")), { type: "code", code: valid },
    ]);
  });

  it("renders inline code from published Markdown", () => {
    const store = createStore();
    store.versions = [
      createVersion({
        contentMarkdown: "# Public One\n\nPublished `posts` content.\n",
      }),
      ...store.versions.slice(1),
    ];
    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.equal(
      detail.contentBlocks.some(
        (block) =>
          block.type === "paragraph" &&
          block.children.some(
            (child) => child.type === "code" && child.text === "posts",
          ),
      ),
      true,
    );
  });

  it("builds safe HTTPS, root-relative and fragment links without changing saved content", () => {
    const version = createVersion({
      contentMarkdown: "[공식 문서](https://nextjs.org/docs/app) · [글 목록](/blog?tag=DB) · [본문으로](#main-content)\n",
    });
    const originalVersion = { ...version };
    const store = { ...createStore(), versions: [version] };
    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.deepEqual(detail.contentBlocks, [{
      type: "paragraph",
      children: [
        { type: "link", href: "https://nextjs.org/docs/app", children: [{ type: "text", text: "공식 문서" }] },
        { type: "text", text: " · " },
        { type: "link", href: "/blog?tag=DB", children: [{ type: "text", text: "글 목록" }] },
        { type: "text", text: " · " },
        { type: "link", href: "#main-content", children: [{ type: "text", text: "본문으로" }] },
      ],
    }]);
    assert.equal(detail.contentHtml, version.contentHtml);
    assert.equal(getPublicBlogPostMarkdown("public-one", store), version.contentMarkdown);
    assert.deepEqual(version, originalVersion);
  });

  it("parses balanced parentheses, escapes and nested formatting in inline links", () => {
    const store = {
      ...createStore(),
      versions: [createVersion({
        contentMarkdown: [
          "[공식 **문서** `API`](https://example.com/guide_(v2))",
          String.raw`[괄호 \[예시\]](https://example.com/a\(b\))`,
          "**[강조 링크](/blog)**",
        ].join("\n\n"),
      })],
    };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [
      { type: "paragraph", children: [{
        type: "link", href: "https://example.com/guide_(v2)", children: [
          { type: "text", text: "공식 " },
          { type: "strong", children: [{ type: "text", text: "문서" }] },
          { type: "text", text: " " },
          { type: "code", text: "API" },
        ],
      }] },
      { type: "paragraph", children: [{
        type: "link", href: "https://example.com/a(b)", children: [{ type: "text", text: "괄호 [예시]" }],
      }] },
      { type: "paragraph", children: [{
        type: "strong", children: [{ type: "link", href: "/blog", children: [{ type: "text", text: "강조 링크" }] }],
      }] },
    ]);
  });

  it("keeps code, escaped links, raw HTML and unsupported inline syntax literal", () => {
    const paragraphs = [
      "`[코드](https://example.com)`",
      "`` `[중첩 코드](/blog)` ``",
      String.raw`\[이스케이프](/blog)`,
      '<a href="https://example.com">HTML 링크</a>',
      "![그림](https://example.com/image.png)",
      "[미완성](https://example.com",
      "https://example.com",
    ];
    const store = {
      ...createStore(),
      versions: [createVersion({ contentMarkdown: paragraphs.join("\n\n") })],
    };

    assert.deepEqual(getPublicBlogPostBySlug("public-one", store)?.contentBlocks, [
      { type: "paragraph", children: [{ type: "code", text: "[코드](https://example.com)" }] },
      { type: "paragraph", children: [{ type: "code", text: "`[중첩 코드](/blog)`" }] },
      ...paragraphs.slice(2).map((text, index) => ({
        type: "paragraph", children: [{ type: "text", text: index === 0 ? text.slice(1) : text }],
      })),
    ]);
  });

  it("keeps rejected link destinations out of anchor nodes", () => {
    for (const href of [
      "javascript:alert(1)",
      "jav&#x61;script:alert(1)",
      "data:text/html,hello",
      "vbscript:msgbox(1)",
      "file:///example",
      "http://example.com",
      "//example.com",
      String.raw`/\example.com`,
      "../blog",
      "blog",
      "?tag=DB",
      "<https://exa\tmple.com>",
      "<https://example.com/a b>",
      "</\u0000/example.com>",
      "https://127.1/admin",
      "https://0x7f000001/admin",
      "https://[::1]/admin",
      "https://%6cocalhost/admin",
      "https://docs%2einternal/admin",
      "https://docs%2ecorp/admin",
      "https://docs%2elan/admin",
    ]) {
      const store = {
        ...createStore(),
        versions: [createVersion({ contentMarkdown: `[이동](${href})` })],
      };
      const detail = getPublicBlogPostBySlug("public-one", store);

      assert.ok(detail, `fixture should reach the link renderer: ${href}`);
      assert.deepEqual(detail.contentBlocks, [{
        type: "paragraph", children: [{ type: "text", text: "이동" }],
      }], href);
    }
  });

  it("still withholds private content and non-current or unpublished versions containing links", () => {
    for (const contentMarkdown of [
      "[내부](https://localhost/admin)",
      "[내부](https://10.0.0.7/admin)",
      "[내부](https://docs.internal/admin)",
    ]) {
      const store = { ...createStore(), versions: [createVersion({ contentMarkdown })] };
      assert.equal(getPublicBlogPostBySlug("public-one", store), undefined);
      assert.equal(getPublicBlogPostMarkdown("public-one", store), undefined);
    }
    const store = {
      ...createStore(),
      versions: [createVersion({ id: "version-previous", contentMarkdown: "[이전 버전](/blog)" })],
    };
    assert.equal(getPublicBlogPostBySlug("public-one", store), undefined);
    const previewStore = {
      ...createStore(),
      versions: [createVersion({
        id: "version-preview", postId: "post-preview", contentMarkdown: "[비공개 글](/blog)",
      })],
    };
    assert.equal(getPublicBlogPostBySlug("preview-one", previewStore), undefined);
    assert.equal(getPublicBlogPostMarkdown("preview-one", previewStore), undefined);
  });

  it("inserts at most one verified current-version diagram after the first H2", () => {
    const store = createStore();
    store.versions = [
      createVersion({
        contentMarkdown:
          "# Public One\n\nIntro paragraph.\n\n## Flow\n\nFlow details.\n",
      }),
      ...store.versions.slice(1),
    ];
    store.assets = [
      createAsset({
        id: "asset-previous-version",
        postVersionId: "version-public-previous",
      }),
      createAsset({
        id: "asset-failed",
        status: "failed",
      }),
      createAsset(),
    ];

    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.deepEqual(
      detail.contentBlocks.map((block) => block.type),
      ["heading", "paragraph", "heading", "diagram", "paragraph"],
    );
    assert.deepEqual(detail.contentBlocks[3], {
      alt: "Source collection to publish workflow",
      assetHash: diagramAssetHash,
      path: "/blog-assets/diagrams/public-one.svg",
      type: "diagram",
    });
  });

  it("falls back to the first paragraph and omits unverified assets", () => {
    const store = createStore();
    const version = createVersion({
      contentMarkdown: "# Public One\n\nFirst paragraph.\n\nSecond paragraph.\n",
    });
    store.versions = [version, ...store.versions.slice(1)];
    store.assets = [
      createAsset({
        assetHash: "mismatch",
      }),
      createAsset({
        id: "asset-not-verified",
        verifiedAt: null,
      }),
    ];

    const originalContentHash = version.contentHash;
    const detail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(detail);
    assert.deepEqual(
      detail.contentBlocks.map((block) => block.type),
      ["heading", "paragraph", "paragraph"],
    );
    assert.equal(detail.markdown, version.contentMarkdown);
    assert.equal(version.contentHash, originalContentHash);

    store.assets = [createAsset()];
    const verifiedDetail = getPublicBlogPostBySlug("public-one", store);

    assert.ok(verifiedDetail);
    assert.deepEqual(
      verifiedDetail.contentBlocks.map((block) => block.type),
      ["heading", "paragraph", "diagram", "paragraph"],
    );
    assert.equal(verifiedDetail.markdown, version.contentMarkdown);
    assert.equal(version.contentHash, originalContentHash);
  });

  it("builds tag counts and pagination from published posts only", () => {
    const store = createStore();
    const index = getPublicBlogIndex(store, { page: 1, pageSize: 1 });

    assert.deepEqual(
      index.posts.map((post) => post.slug),
      ["public-two"],
    );
    assert.deepEqual(index.tagCounts, [
      { count: 2, tag: "DB" },
      { count: 1, tag: "운영" },
    ]);
    assert.deepEqual(index.pagination, {
      currentPage: 1,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
    });

    const secondDbPage = getPublicBlogIndex(store, {
      page: 2,
      pageSize: 1,
      tag: "DB",
    });

    assert.deepEqual(
      secondDbPage.posts.map((post) => post.slug),
      ["public-one"],
    );
    assert.equal(
      secondDbPage.tagCounts.some((tagCount) => tagCount.tag === "비공개"),
      false,
    );
  });
});
