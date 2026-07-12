import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePublicSiteOrigin } from "./public-site-origin.ts";

describe("public site origin", () => {
  it("prefers the configured public origin over the internal request host", () => {
    assert.equal(
      resolvePublicSiteOrigin(
        "http://0.0.0.0:3000/sitemap.xml",
        "https://blog.example.com/base-path",
      ),
      "https://blog.example.com",
    );
  });
});
