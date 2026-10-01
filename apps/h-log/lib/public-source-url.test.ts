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
      "https://docs.internal/admin",
      "https://docs.corp/admin",
      "https://docs.lan/admin",
      "https://docs%2einternal/admin",
      "https://docs.internal./admin",
      "https://user:secret@example.com/admin",
      "https://127.1/admin",
      "https://0x7f000001/admin",
      "https://[::1]/admin",
    ]) {
      assert.equal(tryNormalizePublicSourceUrl(value), undefined, value);
    }
  });
});
