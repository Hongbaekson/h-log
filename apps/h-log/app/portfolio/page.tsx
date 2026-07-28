import Link from "next/link";
import {
  Activity,
  ArrowRight,
  FolderKanban,
  Terminal,
} from "lucide-react";

import { Badge, Container } from "@/components/ui";
import { createPortfolioCardModel } from "@/lib/portfolio-card";
import { projects, projectToneClasses } from "@/lib/projects";

const featuredProjects = projects.slice(0, 2);
const remainingProjects = projects.slice(2);
const activeProjectCount = projects.filter((project) => project.period.includes("현재")).length;

function ProjectCard({
  featured = false,
  project,
}: {
  featured?: boolean;
  project: (typeof projects)[number];
}) {
  const card = createPortfolioCardModel(project);
  const Icon = project.icon;

  return (
    <Link
      aria-label={`${card.title} 프로젝트 상세 보기`}
      className={`group flex h-full min-w-0 flex-col rounded-lg border border-slate-700/80 bg-slate-950/72 shadow-[0_22px_56px_rgb(2_6_23/0.18)] transition-colors duration-200 hover:border-cyan-300/55 hover:bg-slate-900/78 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 ${
        featured ? "p-6 md:p-7" : "p-5 md:p-6"
      }`}
      href={`/portfolio/${project.slug}`}
    >
      <div className="flex items-start justify-between gap-4">
        <Badge tone={card.isCurrent ? "cyan" : "slate"}>{card.statusLabel}</Badge>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${projectToneClasses[project.tone]}`}
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>

      <h2
        className={`card-heading mt-5 break-words tracking-tight text-white ${
          featured ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
        }`}
      >
        {card.title}
      </h2>

      <dl className="mt-6 grid gap-5 border-t border-slate-800 pt-5">
        <div className="grid min-w-0 gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
          <dt className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
            기간
          </dt>
          <dd className="break-words text-sm font-semibold leading-6 text-slate-300">
            {card.periodLabel}
          </dd>
        </div>
        <div className="grid min-w-0 gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
          <dt className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
            역할
          </dt>
          <dd className="break-words text-sm leading-6 text-slate-300">{card.role}</dd>
        </div>
        <div className="grid min-w-0 gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
          <dt className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
            핵심 판단
          </dt>
          <dd className="break-words text-sm leading-6 text-slate-300">
            {card.decision}
          </dd>
        </div>
        <div className="grid min-w-0 gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
          <dt className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
            검증된 결과
          </dt>
          <dd className="break-words text-sm leading-6 text-slate-300">
            {card.result}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {card.stack.map((item) => (
          <Badge key={item} tone="slate">
            {item}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-7 text-sm font-semibold text-cyan-100 transition-colors group-hover:text-white">
        상세 보기
        <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
      </div>
    </Link>
  );
}

export default function PortfolioPage() {
  return (
    <>
      <section className="pt-12 pb-10 md:pt-16 md:pb-12">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="hero-reveal hero-reveal-1" tone="cyan">
              <Terminal aria-hidden="true" size={14} strokeWidth={2} />
              <span className="font-mono uppercase tracking-[0.18em]">portfolio.online</span>
              <span className="hero-signal-cursor" aria-hidden="true" />
            </Badge>

            <h1 className="hero-heading hero-reveal hero-reveal-2 mt-7 text-4xl leading-[1.08] tracking-normal text-white md:text-6xl">
              Building
              <br />
              <span className="hero-name-gradient">Reliable Systems</span>
            </h1>

            <div
              className="hero-reveal hero-reveal-3 mx-auto mt-7 max-w-2xl overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/78 text-left shadow-[0_24px_70px_rgb(8_47_73/0.22)]"
              aria-label="포트폴리오 상태 요약"
            >
              <div className="h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
              <div className="grid bg-slate-800/70 sm:grid-cols-2 sm:gap-px">
                <div className="flex min-h-16 items-center gap-3 bg-slate-950/88 px-4 py-3">
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 text-emerald-100">
                    <span
                      className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgb(110_231_183/0.9)]"
                      aria-hidden="true"
                    />
                    <Activity aria-hidden="true" size={17} strokeWidth={2.2} />
                  </span>
                  <div>
                    <div className="font-mono text-[0.64rem] font-bold uppercase tracking-[0.16em] text-emerald-200/85">
                      now
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-white">
                      {activeProjectCount}건 진행 중
                    </div>
                  </div>
                </div>

                <div className="flex min-h-16 items-center gap-3 border-t border-slate-800/90 bg-slate-950/88 px-4 py-3 sm:border-t-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                    <FolderKanban aria-hidden="true" size={17} strokeWidth={2.2} />
                  </span>
                  <div>
                    <div className="font-mono text-[0.64rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                      projects
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-white">
                      {projects.length}개 프로젝트
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="featured-projects" className="pb-12">
        <Container>
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
              Featured
            </p>
            <h2 id="featured-projects" className="mt-2 text-2xl font-extrabold text-white md:text-3xl">
              대표 프로젝트
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              현재의 문제 해결 방식과 시스템 설계 역량을 가장 잘 보여주는 작업입니다.
            </p>
          </div>

          <ol className="mt-6 grid gap-5 lg:grid-cols-2">
            {featuredProjects.map((project) => (
              <li className="min-w-0" key={project.slug}>
                <ProjectCard featured project={project} />
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="career-projects" className="pb-24">
        <Container>
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
              Career Archive
            </p>
            <h2 id="career-projects" className="mt-2 text-2xl font-extrabold text-white md:text-3xl">
              경력 프로젝트
            </h2>
          </div>

          <ol className="mt-6 grid gap-4 lg:grid-cols-2">
            {remainingProjects.map((project) => (
              <li className="min-w-0" key={project.slug}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
