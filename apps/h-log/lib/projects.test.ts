import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPortfolioCardModel } from "./portfolio-card.ts";
import { getProjectBySlug, projects } from "./projects.ts";

describe("portfolio project content", () => {
  it("explains the workflow automation metrics with visitor-facing descriptions", () => {
    const project = getProjectBySlug("opnerd-workflow-automation");

    assert.ok(project);
    assert.match(project.summary, /Webhook/);
    assert.deepEqual(
      project.metrics.map((metric) => ({
        description: metric.description,
        label: metric.label,
        value: metric.value,
      })),
      [
        {
          description: "서명 검증 · 중복 방지",
          label: "Webhook",
          value: "검증·저장",
        },
        {
          description: "Discord 알림 실패 격리",
          label: "Queue/DLQ",
          value: "재시도",
        },
        {
          description: "요약 · intent 분석 분리",
          label: "LLM Worker",
          value: "읽기 전용",
        },
      ],
    );
  });

  it("keeps portfolio list cards concise while preserving metric context", () => {
    const project = getProjectBySlug("opnerd-workflow-automation");

    assert.ok(project);

    const card = createPortfolioCardModel(project);

    assert.equal(card.description, "Go 기반 Discord와 GitHub Issues 운영 자동화 설계");
    assert.doesNotMatch(card.description, /서명 검증|Queue\/Worker/);
    assert.equal(card.periodLabel, "2025.03 ~");
    assert.deepEqual(card.stack, [
      "Go 1.26.x",
      "net/http",
      "PostgreSQL",
      "PGMQ",
    ]);
    assert.deepEqual(
      card.metrics.map((metric) => ({
        caption: metric.caption,
        label: metric.label,
        value: metric.value,
      })),
      [
        {
          caption: "서명 검증 · 중복 방지",
          label: "Webhook",
          value: "검증·저장",
        },
        {
          caption: "Discord 알림 실패 격리",
          label: "Queue/DLQ",
          value: "재시도",
        },
        {
          caption: "요약 · intent 분석 분리",
          label: "LLM Worker",
          value: "읽기 전용",
        },
      ],
    );
  });

  it("includes the CI/CD deployment automation story in the workflow detail", () => {
    const project = getProjectBySlug("opnerd-workflow-automation");

    assert.ok(project);
    assert.ok(project.approach.some((item) => item.includes("CI/CD")));
    assert.ok(project.detail.decisions.some((item) => item.includes("수동 배포")));
    assert.ok(project.impact.some((item) => item.includes("평균 3분")));
  });

  it("uses non-duplicated captions for every portfolio list metric", () => {
    for (const project of projects) {
      const card = createPortfolioCardModel(project);

      for (const metric of card.metrics) {
        assert.notEqual(
          metric.caption,
          metric.label,
          `${project.slug} metric "${metric.label}" needs a reader-facing caption`,
        );
      }
    }
  });
});
