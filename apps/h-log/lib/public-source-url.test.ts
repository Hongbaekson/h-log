import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizePublicSourceUrl, tryNormalizePublicSourceUrl } from "./public-source-url.ts";

describe("public source URL validation", () => {
  it("normalizes absolute public HTTPS URLs", () => {
    assert.equal(
      normalizePublicSourceUrl(" https://nextjs.org/docs/app "),
      "https://nextjs.org/docs/app",
    );
  });

  it("rejects non-HTTPS and internal URLs", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "http://example.com",
      "https://localhost/admin",
      "https://127.0.0.1/admin",
      "https://10.0.0.7/admin",
      "https://internal.local/admin",
    ]) {
      assert.equal(tryNormalizePublicSourceUrl(value), undefined);
    }
  });
});
