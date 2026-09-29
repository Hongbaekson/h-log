import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Cpu,
  FileCode2,
  ShieldCheck,
  Workflow,
  Code2,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  Sparkles,
} from "lucide-react";

import { ButtonLink, Container } from "@/components/ui";
import { projects } from "@/lib/projects";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  description: siteConfig.description,
  title: {
    absolute: siteConfig.title,
  },
};

const careerStart = {
  year: 2021,
  month: 7,
} as const;

function getCareerYear(now = new Date()) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const hasReachedAnniversaryMonth = currentMonth >= careerStart.month;
  const completedYears = currentYear - careerStart.year - (hasReachedAnniversaryMonth ? 0 : 1);

  return Math.max(completedYears + 1, 1);
}

const featuredProject = projects[0];

const strengthItems = [
  {
    description: "도메인 규칙과 운영 흐름을 분리해 변경에 견디는 백엔드를 만듭니다.",
    icon: Code2,
    title: "변화에 유연한 설계",
    label: "BACKEND ARCHITECTURE",
    tone: "blurple",
  },
  {
    description: "반복 작업을 자동화하고 알림, 요약, 검증 흐름으로 연결합니다.",
    icon: Workflow,
    title: "반복을 줄이는 AI",
    label: "AI WORKFLOW",
    tone: "pink",
  },
  {
    description: "배포, 관측성, 장애 대응까지 고려해 운영 가능한 구조를 선호합니다.",
    icon: Database,
    title: "운영까지 이어지는 책임",
    label: "RELIABLE SYSTEMS",
    tone: "blue",
  },
];

const radarCenter = { x: 180, y: 160 };

const radarAxes = [
  { anchor: "middle", label: "Backend", labelX: 180, labelY: 26, value: 0.9, x: 180, y: 44 },
  { anchor: "start", label: "Database", labelX: 314, labelY: 96, value: 0.82, x: 280, y: 102 },
  { anchor: "start", label: "DevOps", labelX: 314, labelY: 232, value: 0.78, x: 280, y: 218 },
  { anchor: "middle", label: "Frontend", labelX: 180, labelY: 306, value: 0.56, x: 180, y: 276 },
  { anchor: "end", label: "Infra", labelX: 46, labelY: 232, value: 0.76, x: 80, y: 218 },
  { anchor: "end", label: "Monitoring", labelX: 46, labelY: 96, value: 0.64, x: 80, y: 102 },
] as const;

const radarLevels = [1, 0.75, 0.5, 0.25] as const;

function radarPoint(axis: (typeof radarAxes)[number], scale: number) {
  const x = radarCenter.x + (axis.x - radarCenter.x) * scale;
  const y = radarCenter.y + (axis.y - radarCenter.y) * scale;

  return `${x},${y}`;
}

function TechnicalSkillsRadar() {
  const skillPolygon = radarAxes.map((axis) => radarPoint(axis, axis.value)).join(" ");

  return (
    <svg
      aria-labelledby="technical-skills-title"
      className="skills-radar mx-auto w-full"
      role="img"
      viewBox="-68 0 496 320"
    >
      <title id="technical-skills-title">Technical skills radar chart</title>
      {radarLevels.map((level) => (
        <polygon
          className="radar-grid fill-transparent stroke-slate-700/80"
          key={level}
          points={radarAxes.map((axis) => radarPoint(axis, level)).join(" ")}
          strokeWidth="1"
        />
      ))}
      <polygon
        className="radar-skill-pulse fill-cyan-300/10 stroke-cyan-300/30"
        points={skillPolygon}
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <g className="radar-skill-layer">
        <polygon
          className="radar-skill-shape fill-blue-500/20 stroke-blue-400"
          points={skillPolygon}
          strokeLinejoin="round"
          strokeWidth="2"
        />
        {radarAxes.map((axis) => {
          const [x, y] = radarPoint(axis, axis.value).split(",");

          return (
            <circle
              className="radar-skill-point fill-blue-300"
              cx={x}
              cy={y}
              key={`${axis.label}-point`}
              r="3"
            />
          );
        })}
      </g>
      {radarAxes.map((axis) => (
        <text
          className="radar-label fill-slate-400 text-xl font-semibold"
          key={`${axis.label}-label`}
          textAnchor={axis.anchor}
          x={axis.labelX}
          y={axis.labelY}
        >
          {axis.label}
        </text>
      ))}
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="home-design">
      <section className="home-hero">
        <Container className="home-hero-grid">
          <div className="home-intro">
            <p className="home-eyebrow">
              <Sparkles aria-hidden="true" size={15} strokeWidth={1.8} />
              BACKEND ENGINEER · AI WORKFLOW
            </p>
            <h1 className="hero-heading home-title">
              백엔드 개발자{" "}
              <br />
              <span className="home-name">손홍백</span>입니다
            </h1>
            <p className="home-description">
              Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고,
              운영하기 쉬운 구조를 고민합니다.
            </p>
            <div className="home-actions">
              <ButtonLink className="home-primary" href="/portfolio">
                Portfolio 보기
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
              </ButtonLink>
              <ButtonLink href="/resume" variant="secondary">
                <FileText aria-hidden="true" size={17} strokeWidth={1.8} />
                이력서 보기
              </ButtonLink>
            </div>
            <div className="home-text-links">
              <a href="https://github.com/Hongbaekson" rel="noreferrer" target="_blank">
                GitHub <ExternalLink aria-hidden="true" size={13} />
              </a>
              <Link href="/blog">
                개발 기록 읽기 <BookOpen aria-hidden="true" size={14} />
              </Link>
            </div>
            <dl className="home-metrics">
              <div>
                <dt>실무 경력</dt>
                <dd>{getCareerYear()}<span>년차</span></dd>
              </div>
              <div>
                <dt>공개 프로젝트</dt>
                <dd>{projects.length}<span>개</span></dd>
              </div>
              <div>
                <dt>주요 기술</dt>
                <dd className="home-stack">Java<span>/</span>Spring</dd>
              </div>
            </dl>
          </div>

          <aside aria-labelledby="engineering-profile-title" className="engineering-profile">
            <div className="profile-topline">
              <span className="profile-chip"><Cpu aria-hidden="true" size={18} strokeWidth={1.6} /></span>
              <span className="font-mono">ENGINEERING PROFILE</span>
              <span className="profile-corner" aria-hidden="true"><Sparkles size={18} strokeWidth={1.5} /></span>
            </div>
            <h2 id="engineering-profile-title">코드 너머의 구조를 봅니다.</h2>
            <p className="profile-subtitle">백엔드, 자동화, 그리고 안정적인 운영.</p>
            <TechnicalSkillsRadar />
            <p className="skills-caption">기술 관심 영역 · 자기 평가</p>
            <div className="profile-domains">
              <span><Code2 aria-hidden="true" size={16} strokeWidth={1.7} />Backend</span>
              <span><Bot aria-hidden="true" size={16} strokeWidth={1.7} />AI Workflow</span>
              <span><Database aria-hidden="true" size={16} strokeWidth={1.7} />Systems</span>
            </div>
          </aside>
        </Container>
      </section>

      <section aria-labelledby="selected-project-title" className="home-selected">
        <Container>
          <div className="featured-case">
            <div className="featured-case-copy">
              <p className="section-kicker"><FolderOpen aria-hidden="true" size={14} /> SELECTED WORK <span>01</span></p>
              <h2 id="selected-project-title">{featuredProject.context}</h2>
              <p className="featured-case-summary">{featuredProject.summary}</p>
              <ButtonLink className="featured-case-link" href={`/portfolio/${featuredProject.slug}`} variant="ghost">
                프로젝트 살펴보기
                <span className="sr-only">: {featuredProject.context} 상세 보기</span>
                <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
              </ButtonLink>
            </div>
            <div aria-label="명세, AI 구현, 검증으로 이어지는 개발 흐름" className="workflow-visual">
              <p className="font-mono">AI-ASSISTED DEVELOPMENT</p>
              <div className="workflow-nodes">
                <div className="workflow-node">
                  <span className="workflow-icon"><FileCode2 aria-hidden="true" size={28} strokeWidth={1.5} /></span>
                  <span>명세</span>
                </div>
                <ArrowRight aria-hidden="true" className="workflow-arrow" size={18} />
                <div className="workflow-node">
                  <span className="workflow-icon workflow-icon-ai"><Bot aria-hidden="true" size={32} strokeWidth={1.5} /></span>
                  <span>AI 구현</span>
                </div>
                <ArrowRight aria-hidden="true" className="workflow-arrow" size={18} />
                <div className="workflow-node">
                  <span className="workflow-icon"><ShieldCheck aria-hidden="true" size={28} strokeWidth={1.5} /></span>
                  <span>검증</span>
                </div>
              </div>
              <div className="workflow-tools"><span>OpenAPI</span><span>Claude Code</span><span>Codex</span></div>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="working-style-title" className="home-working-style">
        <Container>
          <div className="home-section-heading">
            <div>
              <p className="section-kicker">HOW I WORK</p>
              <h2 id="working-style-title">문제를 푸는 방식</h2>
            </div>
            <p>설계에서 운영까지, 오래 쓰이는 코드를 위해.</p>
          </div>
          <div className="strength-grid">
            {strengthItems.map((item) => {
              const Icon = item.icon;
              return (
                <article className={`strength-item strength-${item.tone}`} key={item.title}>
                  <span className="strength-icon"><Icon aria-hidden="true" size={23} strokeWidth={1.6} /></span>
                  <p className="strength-label font-mono">{item.label}</p>
                  <h3>{item.title}</h3>
                  <p className="strength-description">{item.description}</p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>
    </div>
  );
}
