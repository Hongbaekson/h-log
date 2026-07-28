import {
  ArrowRight,
  BookOpen,
  Code2,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  Sparkles,
  Terminal,
} from "lucide-react";

import { Badge, ButtonLink, Card, Container } from "@/components/ui";
import { projects } from "@/lib/projects";

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
    title: "Backend Architecture",
  },
  {
    description: "반복 작업을 자동화하고 알림, 요약, 검증 흐름으로 연결합니다.",
    icon: Sparkles,
    title: "AI Workflow",
  },
  {
    description: "배포, 관측성, 장애 대응까지 고려해 운영 가능한 구조를 선호합니다.",
    icon: Database,
    title: "Reliable Systems",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="pt-12 pb-14 md:pt-16 md:pb-20">
        <Container className="grid items-start gap-8 md:grid-cols-[1.04fr_0.96fr] md:gap-10">
          <div>
            <Badge className="hero-reveal hero-reveal-1" tone="cyan">
              <Terminal aria-hidden="true" size={14} strokeWidth={2} />
              <span className="font-mono uppercase tracking-[0.18em]">profile.online</span>
              <span className="hero-signal-cursor" aria-hidden="true" />
            </Badge>

            <h1 className="hero-heading hero-reveal hero-reveal-2 mt-6 max-w-3xl text-4xl leading-[1.1] tracking-normal text-white md:text-6xl">
              백엔드 개발자{" "}
              <br />
              <span className="hero-name-gradient">손홍백</span>입니다
            </h1>

            <p className="hero-reveal hero-reveal-3 mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고, 운영하기 쉬운
              구조를 고민합니다.
            </p>

            <div className="hero-reveal hero-reveal-4 mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <ButtonLink href="/portfolio">
                <FolderOpen aria-hidden="true" size={18} strokeWidth={2} />
                Portfolio
              </ButtonLink>
              <ButtonLink href="/resume" variant="secondary">
                <FileText aria-hidden="true" size={18} strokeWidth={2} />
                이력서 보기
              </ButtonLink>
              <ButtonLink
                href="https://github.com/Hongbaekson"
                rel="noreferrer"
                target="_blank"
                variant="secondary"
              >
                <ExternalLink aria-hidden="true" size={18} strokeWidth={2} />
                GitHub
              </ButtonLink>
              <ButtonLink href="/blog" variant="ghost">
                <BookOpen aria-hidden="true" size={18} strokeWidth={2} />
                Blog
              </ButtonLink>
            </div>
          </div>

          <Card className="hero-status-card overflow-hidden p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">
                  Verified profile
                </p>
                <h2 className="card-heading mt-2 text-xl text-white">검증된 경력과 결과</h2>
              </div>
              <Terminal
                aria-hidden="true"
                className="shrink-0 text-cyan-200"
                size={22}
                strokeWidth={2}
              />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-4">
                <dt className="text-xs text-slate-500">실무 경력</dt>
                <dd className="mt-1 text-xl font-bold text-white">{getCareerYear()}년차</dd>
              </div>
              <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-4">
                <dt className="text-xs text-slate-500">공개 프로젝트</dt>
                <dd className="mt-1 text-xl font-bold text-white">{projects.length}개</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-4">
              <p className="text-xs font-semibold text-cyan-200">대표 프로젝트</p>
              <h3 className="card-heading mt-2 text-lg text-white">{featuredProject.context}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{featuredProject.summary}</p>
              <ButtonLink
                className="mt-2 justify-start px-0"
                href={`/portfolio/${featuredProject.slug}`}
                variant="ghost"
              >
                자세히 보기
                <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
              </ButtonLink>
            </div>

            <div className="mt-4 border-t border-slate-700/70 pt-4">
              <p className="text-xs text-slate-500">현재 관심사</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-100">
                운영 가능한 백엔드와 안전한 AI 워크플로우
              </p>
            </div>
          </Card>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">
              Working style
            </p>
            <h2 className="card-heading mt-2 text-2xl text-white">문제를 푸는 방식</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {strengthItems.map((item) => {
              const Icon = item.icon;

              return (
                <Card className="p-5" key={item.title}>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-100">
                    <Icon aria-hidden="true" size={20} strokeWidth={2} />
                  </div>
                  <h3 className="card-heading mt-5 text-lg text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
