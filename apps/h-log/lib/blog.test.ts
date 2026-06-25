import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { getBlogPostBySlug, getBlogPosts } from "./blog.ts";

function createContentDir(files: Record<string, string>) {
  const contentDir = mkdtempSync(join(tmpdir(), "h-log-blog-"));

  for (const [fileName, content] of Object.entries(files)) {
    writeFileSync(join(contentDir, fileName), content);
  }

  return {
    contentDir,
    cleanup: () => rmSync(contentDir, { force: true, recursive: true }),
  };
}

describe("blog content loader", () => {
  it("loads only published posts sorted by newest publish date", () => {
    const fixture = createContentDir({
      "draft-note.md": `---
title: Draft note
description: Hidden draft
publishedAt: 2026-01-01
status: draft
tags: [Draft]
---
Not public yet.
`,
      "older-post.md": `---
title: Older post
description: Older public note
publishedAt: 2026-02-01
status: published
tags: [Java, Spring]
---
Older content.
`,
      "recent-post.mdx": `---
title: Recent post
description: Recent public note
publishedAt: 2026-03-01
status: published
tags: [Next.js, 운영]
---
Recent content.
`,
    });

    try {
      const posts = getBlogPosts({ contentDir: fixture.contentDir });

      assert.deepEqual(
        posts.map((post) => post.slug),
        ["recent-post", "older-post"],
      );
      assert.deepEqual(posts[0]?.tags, ["Next.js", "운영"]);
    } finally {
      fixture.cleanup();
    }
  });

  it("returns published post detail by slug without frontmatter", () => {
    const fixture = createContentDir({
      "public-post.md": `---
title: Public post
description: Public detail
publishedAt: 2026-04-01
status: published
tags: [Testing]
---
# Public post

Body content.
`,
    });

    try {
      const post = getBlogPostBySlug("public-post", { contentDir: fixture.contentDir });

      assert.ok(post);
      assert.equal(post.title, "Public post");
      assert.match(post.content, /^# Public post/);
      assert.doesNotMatch(post.content, /status: published/);
    } finally {
      fixture.cleanup();
    }
  });

  it("rejects published files with invalid frontmatter", () => {
    const fixture = createContentDir({
      "broken-post.md": `---
title: Broken post
publishedAt: 2026-05-01
status: published
tags: [Invalid]
---
Missing description.
`,
    });

    try {
      assert.throws(
        () => getBlogPosts({ contentDir: fixture.contentDir }),
        /missing required frontmatter field "description"/,
      );
    } finally {
      fixture.cleanup();
    }
  });
});
