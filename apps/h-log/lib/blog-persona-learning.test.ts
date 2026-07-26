import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activatePersonaVersion,
  createPersonaExampleRecord,
  createPersonaVersionRecord,
  rollbackActivePersonaVersion,
} from "./blog-persona-learning.ts";
import {
  createContentPerformanceAggregate,
  selectPersonaLearningCandidates,
} from "./blog-performance-signals.ts";

const createdAt = "2026-07-27T00:00:00.000Z";
const publishedBody =
  "# 정상처럼 보였던 배포가 깨진 지점\n\n실제 명령과 로그가 들어간 전체 본문.";

function createQualifiedCandidate() {
  const candidates = selectPersonaLearningCandidates(
    [
      createContentPerformanceAggregate({
        id: "signal-view",
        postId: "post-1",
        signalType: "post_view",
        value: 120,
        windowEnd: createdAt,
        windowStart: "2026-07-26T00:00:00.000Z",
      }),
      createContentPerformanceAggregate({
        id: "signal-search-click",
        postId: "post-1",
        signalType: "search_result_click",
        value: 8,
        windowEnd: createdAt,
        windowStart: "2026-07-26T00:00:00.000Z",
      }),
    ],
    {
      minimumValues: {
        post_view: 100,
        search_result_click: 5,
      },
    },
  );

  assert.equal(candidates.length, 1);
  return candidates[0]!;
}

function createExampleInput() {
  return {
    candidate: createQualifiedCandidate(),
    closingPattern: "검증 결과를 다음 운영 규칙으로 닫는다",
    createdAt,
    evidenceDensity: "high",
    id: "persona-example-post-1",
    sectionStructure: [
      "정상처럼 보였던 신호",
      "실제 실패 지점",
      "최소 수정과 검증",
      "다음 운영 규칙",
    ],
    sourceContentHash: "a".repeat(64),
    titlePattern: "정상 신호와 실제 실패를 대비한다",
  } as const;
}

describe("blog persona example learning", () => {
  it("rejects a published article body instead of storing it as an example", () => {
    assert.throws(
      () =>
        createPersonaExampleRecord({
          ...createExampleInput(),
          contentMarkdown: publishedBody,
        }),
      /must not include published content field contentMarkdown/,
    );
  });

  it("stores only summarized style fields from a qualified performance candidate", () => {
    const example = createPersonaExampleRecord(createExampleInput());

    assert.deepEqual(example, {
      closingPattern: "검증 결과를 다음 운영 규칙으로 닫는다",
      createdAt,
      evidenceDensity: "high",
      id: "persona-example-post-1",
      performanceWindowEnd: createdAt,
      performanceWindowStart: "2026-07-26T00:00:00.000Z",
      postId: "post-1",
      qualifyingSignals: ["post_view", "search_result_click"],
      sectionStructure: [
        "정상처럼 보였던 신호",
        "실제 실패 지점",
        "최소 수정과 검증",
        "다음 운영 규칙",
      ],
      sourceContentHash: "a".repeat(64),
      titlePattern: "정상 신호와 실제 실패를 대비한다",
    });
    assert.equal(JSON.stringify(example).includes(publishedBody), false);
  });

  it("hashes persona versions and requires an explicit active transition", () => {
    const version1 = createPersonaVersionRecord({
      basedOnExampleIds: ["persona-example-baseline"],
      createdAt,
      id: "persona-v1",
      personaContent: "# Persona v1\n\n운영 판단 기록.",
      previousVersionId: null,
      version: 1,
    });
    const version2 = createPersonaVersionRecord({
      basedOnExampleIds: ["persona-example-post-1"],
      createdAt: "2026-07-28T00:00:00.000Z",
      id: "persona-v2",
      personaContent: "# Persona v2\n\n사건과 검증 결과를 더 선명하게 기록.",
      previousVersionId: "persona-v1",
      version: 2,
    });

    assert.equal(version1.active, false);
    assert.equal(version2.active, false);
    assert.match(version1.contentHash, /^[a-f0-9]{64}$/);
    assert.match(version2.contentHash, /^[a-f0-9]{64}$/);
    assert.notEqual(version1.contentHash, version2.contentHash);

    const activated = activatePersonaVersion([version1, version2], "persona-v2");

    assert.deepEqual(
      activated.map(({ active, id }) => ({ active, id })),
      [
        { active: false, id: "persona-v1" },
        { active: true, id: "persona-v2" },
      ],
    );
  });

  it("records a rollback to the previous persona after performance regresses", () => {
    const version1 = createPersonaVersionRecord({
      basedOnExampleIds: ["persona-example-baseline"],
      createdAt,
      id: "persona-v1",
      personaContent: "# Persona v1\n\n운영 판단 기록.",
      previousVersionId: null,
      version: 1,
    });
    const version2 = createPersonaVersionRecord({
      basedOnExampleIds: ["persona-example-post-1"],
      createdAt: "2026-07-28T00:00:00.000Z",
      id: "persona-v2",
      personaContent: "# Persona v2\n\n사건과 검증 결과를 더 선명하게 기록.",
      previousVersionId: "persona-v1",
      version: 2,
    });
    const activeVersions = activatePersonaVersion(
      [version1, version2],
      "persona-v2",
    );

    const result = rollbackActivePersonaVersion({
      recordedAt: "2026-07-29T00:00:00.000Z",
      rollbackToVersionId: "persona-v1",
      versions: activeVersions,
    });

    assert.deepEqual(
      result.versions.map(({ active, id }) => ({ active, id })),
      [
        { active: true, id: "persona-v1" },
        { active: false, id: "persona-v2" },
      ],
    );
    assert.deepEqual(result.rollback, {
      createdAt: "2026-07-29T00:00:00.000Z",
      fromVersionId: "persona-v2",
      id: "persona-rollback:persona-v2:persona-v1",
      reason: "performance_regression",
      toVersionId: "persona-v1",
    });
  });
});
