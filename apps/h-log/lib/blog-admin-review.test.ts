import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminPostReviewQuery } from "./blog-admin-review.ts";
import { buildPublicBlogContentBlocks } from "./blog-public.ts";

test("admin review query accepts bounded pages and exact stored statuses", () => {
  assert.deepEqual(parseAdminPostReviewQuery({}), { page: 1, status: null, post: null, version: null });
  assert.deepEqual(parseAdminPostReviewQuery({ page: "2", status: "failed_verification", post: "post-example", version: "1" }), { page: 2, status: "failed_verification", post: "post-example", version: 1 });
  for (const input of [{ page: "0" }, { page: "1e3" }, { page: "10001" }, { status: "not-a-status" }, { post: ["a", "b"] }, { post: "x".repeat(201) }, { version: "-1" }, { version: "1" }]) {
    assert.throws(() => parseAdminPostReviewQuery(input), /invalid_review_query/);
  }
});

test("private preview reuses the public Markdown allowlist without executing stored HTML or loading images", () => {
  const markdown = '## 기록\n\n<script>window.__reviewExecuted=1</script>\n\n[위험](javascript:alert(1)) ![원격](https://example.com/tracker.png)\n\n```html\n<img onerror="alert(1)">\n```\n';
  const blocks = buildPublicBlogContentBlocks(markdown);
  const json = JSON.stringify(blocks);
  assert.match(json, /window.__reviewExecuted/);
  assert.doesNotMatch(json, /"href":"javascript:|"type":"diagram"/);
  assert(blocks.some(block => block.type === "code" && block.code.includes("onerror")));
});
