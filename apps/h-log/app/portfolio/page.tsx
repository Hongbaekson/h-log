import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Terminal } from "lucide-react";

import { ScrollRevealItem } from "@/components/ui/ScrollRevealItem";
import { Badge, Container } from "@/components/ui";
import { portfolioStats, projects, projectToneClasses } from "@/lib/projects";

const orderedProjectSlugs = [
  "opnerd-workflow-automation",
  "cgv-pos-kiosk-nextgen",
  "naracellar-sales-system",
  "tonymoly-crm-dormant-customer",
  "gala-data-migration",
  "tonymoly-backoffice-operation",
] as const;

const orderedProjects = orderedProjectSlugs
  .map((slug) => projects.find((project) => project.slug === slug))
  .filter((project): project is (typeof projects)[number] => Boolean(project));

function getTimelineLabel(project: (typeof projects)[number]) {
  return project.period.includes("현재") ? "NOW" : project.year;
}

function ProjectTimelineItem({
  index,
  project,
}: {
  index: number;
  project: (typeof projects)[number];
}) {
  const Icon = project.icon;
  const isCurrent = project.period.includes("현재");
  const alignLeft = index % 2 === 0;

  return (
    <ScrollRevealItem
      className="portfolio-reveal-item relative pl-14 md:grid md:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] md:items-start md:gap-0 md:pl-0"
      delayMs={Math.min(index * 50, 180)}
      side={alignLeft ? "left" : "right"}
    >
      <div
        className={`portfolio-reveal-dot absolute left-5 top-7 z-10 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full border ${
          isCurrent
            ? "border-cyan-200 bg-cyan-300/25 shadow-[0_0_0_6px_rgb(34_211_238/0.12)]"
            : "border-blue-200/70 bg-blue-300/20 shadow-[0_0_0_6px_rgb(96_165_250/0.10)]"
        } md:left-1/2 md:top-9`}
        aria-hidden="true"
      >
        <span
          className={`h-2 w-2 rounded-full ${isCurrent ? "bg-cyan-100" : "bg-blue-200"}`}
        />
      </div>

      <Link
        className={`portfolio-reveal-card group block cursor-pointer rounded-lg border border-slate-700/80 bg-slate-950/72 p-5 shadow-[0_22px_56px_rgb(2_6_23/0.18)] transition-colors duration-200 hover:border-cyan-300/55 hover:bg-slate-900/78 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 md:p-6 ${
          alignLeft ? "md:col-start-1 md:row-start-1" : "md:col-start-3 md:row-start-1"
        }`}
        href={`/portfolio/${project.slug}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex h-8 items-center justify-center rounded-full border px-3 font-mono text-xs font-bold tracking-[0.12em] ${
              isCurrent
                ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100"
                : "border-slate-700 bg-slate-900/70 text-slate-300"
            }`}
          >
            {getTimelineLabel(project)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400">
            <CalendarDays aria-hidden="true" size={13} strokeWidth={2} />
            {project.period}
          </span>
          {isCurrent ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
              <Clock3 aria-hidden="true" size={13} strokeWidth={2} />
              현재 진행 중
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex items-start gap-3">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border ${projectToneClasses[project.tone]}`}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={2} />
          </span>
          <div>
            <h2 className="card-heading text-2xl tracking-tight text-white">
              {project.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{project.company}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70" aria-hidden="true" />
              <span>{project.type}</span>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-7 text-slate-400 md:text-base">{project.summary}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {project.stack.slice(0, 5).map((item) => (
            <Badge key={item} tone="slate">
              {item}
            </Badge>
          ))}
        </div>

        <dl className="mt-5 grid gap-3 border-t border-slate-800 pt-5 sm:grid-cols-3">
          {project.metrics.map((metric) => (
            <div key={metric.label}>
              <dt className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-slate-500">
                {metric.label}
              </dt>
              <dd className="mt-1 text-lg font-bold text-cyan-100">{metric.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex items-start gap-2 border-t border-slate-800 pt-5 text-sm leading-7 text-slate-300">
          <CheckCircle2
            aria-hidden="true"
            className="mt-1 shrink-0 text-cyan-200"
            size={16}
            strokeWidth={2}
          />
          <span>{project.approach[0]}</span>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100 transition-colors group-hover:text-white">
          상세 보기
          <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
        </div>
      </Link>

      <div
        className={`portfolio-reveal-connector hidden h-px w-10 self-start bg-slate-700/80 md:col-start-2 md:row-start-1 md:mt-[2.8rem] md:block ${
          alignLeft ? "md:justify-self-start" : "md:justify-self-end"
        }`}
        aria-hidden="true"
      />
    </ScrollRevealItem>
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
              <span className="font-mono uppercase tracking-[0.18em]">portfolio</span>
              <span className="hero-signal-cursor" aria-hidden="true" />
            </Badge>

            <h1 className="hero-heading hero-reveal hero-reveal-2 mt-7 text-4xl leading-[1.08] tracking-normal text-white md:text-6xl">
              최신 작업부터
              <br />
              <span className="hero-name-gradient">문제 해결 흐름</span>을 봅니다
            </h1>
            <p className="hero-reveal hero-reveal-3 mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              진행 중인 작업을 가장 위에 두고, 각 프로젝트의 문제와 접근 방식을 타임라인으로
              정리했습니다.
            </p>

            <dl className="hero-reveal hero-reveal-3 mx-auto mt-10 grid max-w-2xl grid-cols-3 divide-x divide-slate-700/80 rounded-lg border-y border-slate-700/80 py-5">
              {portfolioStats.map((stat) => (
                <div className="px-4" key={stat.label}>
                  <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-slate-500">
                    {stat.label}
                  </dt>
                  <dd className="metric-value metric-value-cyan mt-2 text-3xl font-bold tracking-tight">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <ol className="relative space-y-12 md:space-y-16">
            <span
              className="absolute bottom-0 left-5 top-0 w-px bg-gradient-to-b from-cyan-300/0 via-cyan-300/45 to-blue-300/0 md:left-1/2"
              aria-hidden="true"
            />
            {orderedProjects.map((project, index) => (
              <ProjectTimelineItem index={index} key={project.slug} project={project} />
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
