import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGenerationFailureGuidance,
  generationFailurePatternTypes,
  registerGenerationFailurePattern,
  type GenerationFailurePatternRecord,
} from "./blog-failure-pattern-registry.ts";

const dayKey = "2026-07-27";
const candidateId = "candidate-runtime-9";

function registerFailure(
  records: readonly GenerationFailurePatternRecord[],
  overrides: Partial<{
    failureType: (typeof generationFailurePatternTypes)[number];
    occurredAt: string;
    summary: string;
  }> = {},
) {
  return registerGenerationFailurePattern(records, {
    candidateId,
    dayKey,
    failureType: "weak_sources",
    occurredAt: "2026-07-27T00:00:00.000Z",
    summary: "Official or original sources did not meet the minimum threshold",
    ...overrides,
  });
}

describe("blog generation failure pattern registry", () => {
  it("stops the day after the same candidate failure repeats twice", () => {
    const first = registerFailure([]);

    assert.equal(first.allowRetry, true);
    assert.equal(first.pattern.occurrenceCount, 1);
    assert.equal(first.pattern.disposition, "lower_candidate_priority");

    const second = registerFailure(first.records, {
      occurredAt: "2026-07-27T00:10:00.000Z",
    });

    assert.equal(second.allowRetry, false);
    assert.equal(second.pattern.occurrenceCount, 2);
    assert.equal(second.pattern.disposition, "abandon_daily_publish");
    assert.deepEqual(
      buildGenerationFailureGuidance(second.records, dayKey),
      {
        abandonDailyPublish: true,
        blockedCandidateIds: [candidateId],
        promptRules: [
          "weak_sources: Official or original sources did not meet the minimum threshold",
        ],
        qualityGateFailureReasons: ["weak_sources"],
      },
    );
    assert.throws(
      () =>
        registerFailure(second.records, {
          occurredAt: "2026-07-27T00:20:00.000Z",
        }),
      /already blocked for 2026-07-27/,
    );
  });

  it("stores a redacted bounded summary and rejects failed model output fields", () => {
    const rawInternalUrl = "https://writer.internal/runs/41";
    const rawCredential = ["api_key", "abcdefghijk"].join("=");
    const result = registerFailure([], {
      failureType: "privacy_risk",
      summary: `Writer leaked ${rawInternalUrl} with ${rawCredential}`,
    });
    const serialized = JSON.stringify(result.pattern);

    assert.match(result.pattern.summary, /\[REDACTED\]/);
    assert.deepEqual(result.pattern.privacyFindingTypes, [
      "api_credential",
      "internal_network",
    ]);
    assert.equal(serialized.includes(rawInternalUrl), false);
    assert.equal(serialized.includes(rawCredential), false);

    assert.throws(
      () =>
        registerGenerationFailurePattern([], {
          candidateId,
          contentMarkdown: "# Full failed model output",
          dayKey,
          failureType: "style_drift",
          occurredAt: "2026-07-27T00:00:00.000Z",
          summary: "Persona style contract was not met",
        }),
      /must not include failed model output field contentMarkdown/,
    );
  });

  it("classifies prompt and quality-gate guidance without raw failure content", () => {
    assert.deepEqual(generationFailurePatternTypes, [
      "weak_sources",
      "unsafe_claim",
      "privacy_risk",
      "no_evidence",
      "style_drift",
    ]);

    const unsafeClaim = registerFailure([], {
      failureType: "unsafe_claim",
      summary: "A strong claim did not have verified support",
    });
    const styleDrift = registerFailure(unsafeClaim.records, {
      failureType: "style_drift",
      summary: "The draft did not match the active persona contract",
    });

    assert.deepEqual(
      buildGenerationFailureGuidance(styleDrift.records, dayKey),
      {
        abandonDailyPublish: false,
        blockedCandidateIds: [],
        promptRules: [
          "unsafe_claim: A strong claim did not have verified support",
          "style_drift: The draft did not match the active persona contract",
        ],
        qualityGateFailureReasons: ["unsafe_claim", "style_drift"],
      },
    );
  });
});
