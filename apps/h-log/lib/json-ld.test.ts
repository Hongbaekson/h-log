import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { serializeJsonLd } from "./json-ld.ts";

describe("JSON-LD serialization", () => {
  it("keeps React script data parseable without allowing a closing script tag", () => {
    const data = {
      "@context": "https://schema.org",
      description: "</script><script>alert('xss')</script>",
    };
    const serialized = serializeJsonLd(data);

    assert.doesNotMatch(serialized, /</);
    assert.deepEqual(JSON.parse(serialized), data);
  });
});
