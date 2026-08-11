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
const portfolioDetailSource = readFileSync(
  new URL("../app/portfolio/[slug]/page.tsx", import.meta.url),
  "utf8",
);
const workflowDiagramSource = readFileSync(
  new URL("../components/portfolio/GithubWebhookArchitectureDiagram.tsx", import.meta.url),
  "utf8",
);
const projectSource = readFileSync(new URL("./projects.ts", import.meta.url), "utf8");
const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const expectedPortfolioSlugs = [
  "ai-backend-workflow-standardization",
  "redisson-async-processing-recovery",
  "opentelemetry-observability",
  "github-issues-workflow-automation",
  "pos-kiosk-modernization",
  "sales-system-modernization",
  "crm-customer-notification",
  "database-platform-migration",
  "backoffice-reliability-improvement",
];

describe("portfolio project content", () => {
  it("derives the Home project count from the public project collection", () => {
    assert.match(homeSource, /projects\.length/);
    assert.doesNotMatch(homeSource, /value:\s*"8\+"/);
  });

  it("keeps Home evidence-based while showing the technical skills radar", () => {
    assert.match(homeSource, /featuredProject\.(context|summary)/);
    assert.match(homeSource, /github\.com\/Hongbaekson/);
    assert.match(homeSource, /href="\/blog"/);
    assert.doesNotMatch(homeSource, /mailto:/);
    assert.match(
      homeSource,
      /<span className="sr-only">:\s*\{featuredProject\.context\} 상세 보기<\/span>/,
    );
    assert.match(homeSource, /function TechnicalSkillsRadar/);
    assert.match(homeSource, /Technical skills radar chart/);
    assert.match(homeSource, /<TechnicalSkillsRadar \/>/);
    assert.match(homeSource, /radar-label fill-slate-400 text-xl font-semibold/);
    assert.doesNotMatch(homeSource, /RotatingFocusMetric|rotatingFocusItems/);
  });

  it("restores only the radar styles without unused Home-only statistics", () => {
    assert.doesNotMatch(projectSource, /portfolioStats/);
    assert.match(globalStylesSource, /\.radar-grid/);
    assert.match(globalStylesSource, /\.radar-skill-layer/);
    assert.doesNotMatch(globalStylesSource, /\.metric-rotator/);
  });

  it("keeps public project data free of organization identifiers and limits metrics to approved evidence", () => {
    assert.doesNotMatch(
      projectSource,
      /오프너드|아스템즈|CGV|나라셀라|토니모리|갈라 인터내셔널/i,
    );

    const approvedMetricFragments = [
      "1일에서 2시간",
      "약 80%",
      "2배",
      "30초 이내",
      "약 87%",
      "3,000ms에서 900ms",
      "2,000ms에서 500ms",
      "10만 건을 40분에서 15분",
      "2주에서 5일",
      "약 70%",
      "2,000ms에서 600ms",
      "3,000ms에서 500ms",
      "5분에서 즉시 처리",
      "2,000ms에서 800ms",
      "400개 규모",
      "월 8건에서 2건",
      "4,000ms에서 1,000ms",
      "1시간에서 5분",
    ];

    for (const project of projects) {
      assert.ok(!("company" in project));
      assert.ok(!("metrics" in project));
      assert.ok(!("title" in project));
      for (const item of [...project.impact, project.summary].filter((copy) => /\d/.test(copy))) {
        assert.ok(
          approvedMetricFragments.some((fragment) => item.includes(fragment)),
          `Unapproved metric in ${project.slug}: ${item}`,
        );
      }
    }
  });

  it("separates three featured career cases, five career projects, and one side project", () => {
    const slugs = projects.map((project) => project.slug);

    assert.deepEqual(slugs, expectedPortfolioSlugs);
    assert.equal(new Set(slugs).size, projects.length);
    assert.deepEqual(
      projects.filter((project) => project.section === "featured").map((project) => project.slug),
      expectedPortfolioSlugs.slice(0, 3),
    );
    assert.equal(projects.filter((project) => project.section === "career").length, 5);
    assert.deepEqual(
      projects.filter((project) => project.section === "side").map((project) => project.slug),
      ["github-issues-workflow-automation"],
    );
  });

  it("builds public-safe portfolio card facts in one consistent order", () => {
    const project = getProjectBySlug("ai-backend-workflow-standardization");

    assert.ok(project);

    const card = createPortfolioCardModel(project);

    assert.equal(card.title, "AI 기반 백엔드 개발 워크플로우 표준화");
    assert.equal(card.periodLabel, "2025.03 ~");
    assert.equal(card.role, "AI 개발 워크플로우 설계와 팀 적용 기준 정리");
    assert.equal(card.decision, "OpenAPI Spec-First 반복 구현을 Claude Code·Codex 워크플로우로 표준화");
    assert.equal(
      card.result,
      "OpenAPI Spec-First와 AI 도구 활용 기준을 문서화해 단순 기능 평균 구현 시간을 1일에서 2시간으로 줄이고 컨벤션 리뷰 지적을 약 80% 낮췄습니다.",
    );
    assert.deepEqual(card.stack, [
      "Java",
      "Spring Boot",
      "OpenAPI",
      "Claude Code",
    ]);
    assert.ok(!("metrics" in card));
  });

  it("renders featured, career, and side projects from the same collection", () => {
    assert.match(portfolioSource, /section === "featured"/);
    assert.match(portfolioSource, /section === "career"/);
    assert.match(portfolioSource, /section === "side"/);
    assert.match(portfolioSource, /featuredProjects\.map/);
    assert.match(portfolioSource, /careerProjects\.map/);
    assert.match(portfolioSource, /sideProjects\.map/);
    assert.match(portfolioSource, /href=\{`\/portfolio\/\$\{project\.slug\}`\}/);
    assert.doesNotMatch(portfolioSource, /project\.company|card\.metrics/);
  });

  it("removes the alternating timeline and its client-side reveal code", () => {
    assert.doesNotMatch(portfolioSource, /ScrollRevealItem|portfolio-reveal|alignLeft/);
    assert.doesNotMatch(globalStylesSource, /\.portfolio-reveal-/);
  });

  it("renders independent problem, decision, and result groups without index fallbacks", () => {
    const problemIndex = portfolioDetailSource.indexOf('eyebrow="Problem"');
    const decisionIndex = portfolioDetailSource.indexOf('eyebrow="Decision"');
    const resultIndex = portfolioDetailSource.indexOf('eyebrow="Result"');

    assert.ok(problemIndex >= 0);
    assert.ok(problemIndex < decisionIndex);
    assert.ok(decisionIndex < resultIndex);
    assert.match(portfolioDetailSource, /project\.approach\.map/);
    assert.match(portfolioDetailSource, /project\.impact\.map/);
    assert.doesNotMatch(portfolioDetailSource, /detail\.decisions|,\s*index\)/);

    for (const project of projects) {
      assert.ok(project.problem.trim());
      assert.ok(project.approach.length > 0);
      assert.ok(project.impact.length > 0);
      assert.ok(!("decisions" in project.detail));
    }
  });

  it("shows each architecture description once and keeps the diagram scroll boundary accessible", () => {
    assert.equal(
      portfolioDetailSource.match(/project\.detail\.architecture\.map/g)?.length,
      1,
    );
    assert.doesNotMatch(portfolioDetailSource, /\.\.\.project\.detail\.architecture/);
    assert.match(
      portfolioDetailSource,
      /project\.slug === "github-issues-workflow-automation"[\s\S]*GithubWebhookArchitectureDiagram[\s\S]*SystemMap/,
    );
    assert.match(workflowDiagramSource, /aria-describedby=/);
    assert.match(workflowDiagramSource, /tabIndex=\{0\}/);
    assert.match(workflowDiagramSource, /overflow-x-auto/);
    assert.doesNotMatch(
      workflowDiagramSource,
      /Company Edge|Bot Backend Boundary|D-01|회사 Edge/,
    );
  });

  it("includes the CI/CD deployment automation story in the workflow detail", () => {
    const project = getProjectBySlug("github-issues-workflow-automation");

    assert.ok(project);
    assert.ok(project.approach.some((item) => item.includes("CI/CD")));
    assert.ok(project.impact.some((item) => item.includes("배포")));
  });

});
