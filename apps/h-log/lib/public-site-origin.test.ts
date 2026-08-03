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

  it("accepts only an explicit public HTTPS origin in production", () => {
    assert.equal(
      resolvePublicSiteOrigin(
        "http://0.0.0.0:3000/sitemap.xml",
        "https://blog.example.com/base-path",
        "production",
      ),
      "https://blog.example.com",
    );
    assert.equal(
      resolvePublicSiteOrigin(
        "http://0.0.0.0:3000/sitemap.xml",
        "https://fcloud.example",
        "production",
      ),
      "https://fcloud.example",
    );

    for (const configuredOrigin of [
      undefined,
      "http://blog.example.com",
      "https://localhost:3000",
      "https://127.0.0.1",
      "https://10.0.0.8",
      "https://172.16.0.8",
      "https://192.168.1.8",
      "https://h-log.local",
      "https://hlog-web",
      "https://service.corp.internal",
      "https://user:password@blog.example.com",
      "https://[::1]",
      "https://[::ffff:127.0.0.1]",
    ]) {
      assert.throws(
        () =>
          resolvePublicSiteOrigin(
            "http://0.0.0.0:3000/sitemap.xml",
            configuredOrigin,
            "production",
          ),
        /HLOG_PUBLIC_BASE_URL/,
      );
    }
  });
});
