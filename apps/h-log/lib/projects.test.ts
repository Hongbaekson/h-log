import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { createPortfolioCardModel } from "./portfolio-card.ts";
import { getProjectBySlug, projects } from "./projects.ts";

const homeSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const portfolioSource = readFileSync(
  new URL("../app/portfolio/page.tsx", import.meta.url),
  "utf8",
);
const projectSource = readFileSync(new URL("./projects.ts", import.meta.url), "utf8");
const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const expectedPortfolioSlugs = [
  "opnerd-workflow-automation",
  "cgv-pos-kiosk-nextgen",
  "naracellar-sales-system",
  "tonymoly-crm-dormant-customer",
  "gala-data-migration",
  "tonymoly-backoffice-operation",
];

describe("portfolio project content", () => {
  it("derives the Home project count from the public project collection", () => {
    assert.match(homeSource, /projects\.length/);
    assert.doesNotMatch(homeSource, /value:\s*"8\+"/);
  });

  it("keeps Home evidence-based without decorative skill scores or rotating roles", () => {
    assert.match(homeSource, /featuredProject\.(title|summary)/);
    assert.match(homeSource, /github\.com\/Hongbaekson/);
    assert.match(homeSource, /href="\/blog"/);
    assert.doesNotMatch(homeSource, /mailto:/);
    assert.doesNotMatch(
      homeSource,
      /TechnicalSkillsRadar|RotatingFocusMetric|radarAxes|rotatingFocusItems/,
    );
  });

  it("removes unused Home-only statistics and decorative styles", () => {
    assert.doesNotMatch(projectSource, /portfolioStats/);
    assert.doesNotMatch(globalStylesSource, /\.radar-|\.metric-rotator/);
  });

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

  it("keeps the six public projects in their approved order without duplicates", () => {
    const slugs = projects.map((project) => project.slug);

    assert.deepEqual(slugs, expectedPortfolioSlugs);
    assert.equal(new Set(slugs).size, projects.length);
  });

  it("builds public-safe portfolio card facts in one consistent order", () => {
    const project = getProjectBySlug("opnerd-workflow-automation");

    assert.ok(project);

    const card = createPortfolioCardModel(project);

    assert.equal(card.title, "Go 기반 Discord와 GitHub Issues 운영 자동화 설계");
    assert.equal(card.periodLabel, "2025.03 ~");
    assert.equal(card.role, "Webhook MVP 범위와 단계별 확장 로드맵 정리");
    assert.equal(card.decision, "GitHub Webhook 수신·서명 검증·중복 방지 흐름 설계");
    assert.equal(
      card.result,
      "Go 기반 GitHub Issues Webhook을 서명 검증·중복 방지·저장 흐름으로 안전하게 수신하고, Discord 알림과 LLM 요약을 PGMQ Queue/Worker 뒤로 분리해 운영 자동화를 확장할 수 있게 설계했습니다.",
    );
    assert.deepEqual(card.stack, [
      "Go 1.26.x",
      "net/http",
      "PostgreSQL",
      "PGMQ",
    ]);
    assert.ok(!("metrics" in card));
  });

  it("renders two featured projects and the remaining grid from the same collection", () => {
    assert.match(portfolioSource, /const featuredProjects = projects\.slice\(0,\s*2\)/);
    assert.match(portfolioSource, /const remainingProjects = projects\.slice\(2\)/);
    assert.match(portfolioSource, /featuredProjects\.map/);
    assert.match(portfolioSource, /remainingProjects\.map/);
    assert.match(portfolioSource, /href=\{`\/portfolio\/\$\{project\.slug\}`\}/);
    assert.doesNotMatch(portfolioSource, /project\.company|card\.metrics/);
  });

  it("removes the alternating timeline and its client-side reveal code", () => {
    assert.doesNotMatch(portfolioSource, /ScrollRevealItem|portfolio-reveal|alignLeft/);
    assert.doesNotMatch(globalStylesSource, /\.portfolio-reveal-/);
  });

  it("includes the CI/CD deployment automation story in the workflow detail", () => {
    const project = getProjectBySlug("opnerd-workflow-automation");

    assert.ok(project);
    assert.ok(project.approach.some((item) => item.includes("CI/CD")));
    assert.ok(project.detail.decisions.some((item) => item.includes("수동 배포")));
    assert.ok(project.impact.some((item) => item.includes("평균 3분")));
  });

});
