import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPublishJobIdempotencyKey,
  createPostVersionContentFromMarkdown,
  type PublishJobRecord,
  type RequiredPublishJobType,
} from "./blog-content-model.ts";
import {
  createPostgresRequiredPublishJobAdapter,
  createRequiredPublishJobAdapter,
  type RequiredPublishJobCandidate,
} from "./blog-required-publish-job-adapter.ts";

const runAt = "2026-07-22T00:00:00.000Z";
const content = createPostVersionContentFromMarkdown(
  "# Required adapter\n\nPublic-safe body.\n",
);

function createCandidate(
  overrides: Partial<RequiredPublishJobCandidate> = {},
): RequiredPublishJobCandidate {
  return {
    post: {
      currentVersionId: "version-required-adapter",
      id: "post-required-adapter",
      slug: "required-adapter",
      status: "published",
    },
    privacyText: "Required adapter\nPublic-safe body.",
    version: {
      ...content,
      id: "version-required-adapter",
      postId: "post-required-adapter",
    },
    ...overrides,
  };
}

function createJob(type: RequiredPublishJobType): PublishJobRecord {
  const candidate = createCandidate();

  return {
    error: null,
    finishedAt: null,
    id: `job-${type}`,
    idempotencyKey: createPublishJobIdempotencyKey(type, candidate.version),
    importance: "required",
    postId: candidate.post.id,
    postVersionId: candidate.version.id,
    retryCount: 0,
    startedAt: runAt,
    status: "running",
    type,
  };
}

describe("required publish job adapter", () => {
  it("runs render and privacy checks without touching a public URL", async () => {
    const candidate = createCandidate({
      post: { ...createCandidate().post, status: "publishing" },
    });
    let fetchCalls = 0;
    const adapter = createRequiredPublishJobAdapter({
      fetch: async () => {
        fetchCalls += 1;
        throw new Error("unexpected fetch");
      },
      loadCandidate: async () => candidate,
      publicBaseUrl: "https://example.com",
    });

    assert.deepEqual(await adapter.run(createJob("render")), {
      status: "succeeded",
    });
    assert.deepEqual(await adapter.run(createJob("privacy_scan")), {
      status: "succeeded",
    });
    assert.equal(fetchCalls, 0);
  });

  it("loads a required candidate with its five necessary queries", async () => {
    const queries: string[] = [];
    const candidate = createCandidate({
      post: { ...createCandidate().post, status: "publishing" },
    });
    const postRow = {
      current_version_id: candidate.post.currentVersionId,
      id: candidate.post.id,
      slug: candidate.post.slug,
      status: candidate.post.status,
    };
    const versionRow = {
      content_hash: candidate.version.contentHash,
      content_html: candidate.version.contentHtml,
      content_markdown: candidate.version.contentMarkdown,
      id: candidate.version.id,
      post_id: candidate.version.postId,
    };
    const adapter = createPostgresRequiredPublishJobAdapter({
      pool: {
        query: async (query: string) => {
          queries.push(query);

          if (query.includes("from post_tags")) {
            return { rows: [] };
          }

          if (query.includes("from post_sources")) {
            return { rows: [] };
          }

          if (query.includes("from post_assets")) {
            return { rows: [] };
          }

          if (query.includes("from post_versions")) {
            return { rows: [versionRow] };
          }

          return { rows: [postRow] };
        },
      } as never,
      publicBaseUrl: "https://example.com",
    });

    assert.deepEqual(await adapter.run(createJob("render")), {
      status: "succeeded",
    });
    assert.equal(queries.length, 5);
  });

  it("checks published public, Markdown, sitemap, and content hash surfaces", async () => {
    const requested: string[] = [];
    const adapter = createRequiredPublishJobAdapter({
      fetch: async (input) => {
        const url = String(input);
        requested.push(url);

        if (url.endsWith(".md")) {
          return new Response(content.contentMarkdown, { status: 200 });
        }

        if (url.endsWith("sitemap.xml")) {
          return new Response(
            "<loc>https://example.com/blog/required-adapter</loc>",
            { status: 200 },
          );
        }

        return new Response("ok", { status: 200 });
      },
      loadCandidate: async () => createCandidate(),
      publicBaseUrl: "https://example.com",
    });

    for (const type of [
      "public_url",
      "md_url",
      "sitemap",
      "content_version_match",
    ] as const) {
      assert.deepEqual(await adapter.run(createJob(type)), {
        status: "succeeded",
      });
    }

    assert.deepEqual(requested, [
      "https://example.com/blog/required-adapter",
      "https://example.com/blog/required-adapter.md",
      "https://example.com/sitemap.xml",
      "https://example.com/blog/required-adapter.md",
    ]);
  });

  it("checks the canonical URL while fetching through an internal worker origin", async () => {
    const requested: string[] = [];
    const adapter = createRequiredPublishJobAdapter({
      canonicalPublicBaseUrl: "https://blog.example.com",
      fetch: async (input) => {
        const url = String(input);
        requested.push(url);

        return new Response(
          "<loc>https://blog.example.com/blog/required-adapter</loc>",
          { status: 200 },
        );
      },
      loadCandidate: async () => createCandidate(),
      publicBaseUrl: "http://hlog-nginx",
    });

    assert.deepEqual(await adapter.run(createJob("sitemap")), {
      status: "succeeded",
    });
    assert.deepEqual(requested, ["http://hlog-nginx/sitemap.xml"]);
  });

  it("rejects a non-public production canonical origin before fetching through the internal worker origin", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    Reflect.set(process.env, "NODE_ENV", "production");

    try {
      assert.throws(
        () =>
          createRequiredPublishJobAdapter({
            canonicalPublicBaseUrl: "https://192.0.2.1",
            fetch: async () => {
              throw new Error("unexpected fetch");
            },
            loadCandidate: async () => createCandidate(),
            publicBaseUrl: "http://hlog-nginx",
          }),
        /HLOG_PUBLIC_BASE_URL/,
      );
    } finally {
      if (previousNodeEnv === undefined) {
        Reflect.deleteProperty(process.env, "NODE_ENV");
      } else {
        Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
      }
    }
  });

  it("fails closed before fetching a public surface for a private post", async () => {
    let fetchCalls = 0;
    const adapter = createRequiredPublishJobAdapter({
      fetch: async () => {
        fetchCalls += 1;
        return new Response("ok", { status: 200 });
      },
      loadCandidate: async () =>
        createCandidate({
          post: { ...createCandidate().post, status: "publishing" },
        }),
      publicBaseUrl: "https://example.com",
    });

    assert.deepEqual(await adapter.run(createJob("public_url")), {
      error: "public_url requires a published post",
      status: "failed",
    });
    assert.equal(fetchCalls, 0);
  });

  it("redacts privacy findings and rejects public Markdown drift", async () => {
    const privateAdapter = createRequiredPublishJobAdapter({
      loadCandidate: async () =>
        createCandidate({
          post: { ...createCandidate().post, status: "publishing" },
          privacyText: "api_key=super-secret-value",
        }),
      publicBaseUrl: "https://example.com",
    });
    const privateResult = await privateAdapter.run(createJob("privacy_scan"));

    assert.equal(privateResult.status, "failed");
    assert.match("error" in privateResult ? privateResult.error : "", /\[REDACTED\]/);
    assert.doesNotMatch(
      "error" in privateResult ? privateResult.error : "",
      /super-secret-value/,
    );

    const driftAdapter = createRequiredPublishJobAdapter({
      fetch: async () => new Response("# Changed\n", { status: 200 }),
      loadCandidate: async () => createCandidate(),
      publicBaseUrl: "https://example.com",
    });

    assert.deepEqual(
      await driftAdapter.run(createJob("content_version_match")),
      {
        error: "content_version_match failed: published Markdown content_hash mismatch",
        status: "failed",
      },
    );
  });
});
