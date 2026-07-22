import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertHermesOpenAiCodexAuthenticated } from "./blog-hermes-auth-preflight.ts";

describe("Hermes OpenAI Codex auth preflight", () => {
  it("accepts an authenticated provider status", () => {
    assert.doesNotThrow(() =>
      assertHermesOpenAiCodexAuthenticated(
        "openai-codex: logged in (OAuth credentials available)",
      ),
    );
  });

  it("fails closed when Hermes reports logged out with exit code zero", () => {
    assert.throws(
      () =>
        assertHermesOpenAiCodexAuthenticated(
          "openai-codex: logged out (No Codex credentials stored.)",
        ),
      /OpenAI Codex OAuth is not authenticated/,
    );
  });
});
