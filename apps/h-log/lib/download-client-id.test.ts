import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getResumePdfClientId } from "./download-client-id.ts";

function createRequest(headers: Record<string, string>) {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  };
}

describe("getResumePdfClientId", () => {
  it("uses the trusted proxy IP instead of spoofable forwarded-for values", () => {
    const request = createRequest({
      "x-forwarded-for": "198.51.100.7",
      "x-real-ip": "203.0.113.10",
    });

    assert.equal(getResumePdfClientId(request), "203.0.113.10");
  });
});
