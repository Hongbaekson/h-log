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

  it("keeps public project data free of organization identifiers and unsupported metrics", () => {
    assert.doesNotMatch(
      projectSource,
      /오프너드|아스템즈|CGV|나라셀라|토니모리|갈라 인터내셔널/i,
    );

    for (const project of projects) {
      assert.ok(!("company" in project));
      assert.ok(!("metrics" in project));
      assert.ok(!("title" in project));
      assert.ok(project.impact.every((item) => !/\d/.test(item)));
    }
  });

  it("keeps the six public projects in their approved order without duplicates", () => {
    const slugs = projects.map((project) => project.slug);

    assert.deepEqual(slugs, expectedPortfolioSlugs);
    assert.equal(new Set(slugs).size, projects.length);
  });

  it("builds public-safe portfolio card facts in one consistent order", () => {
    const project = getProjectBySlug("github-issues-workflow-automation");

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
