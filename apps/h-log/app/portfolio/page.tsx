import Link from "next/link";
import {
  Activity,
  ArrowRight,
  FolderKanban,
  Terminal,
} from "lucide-react";

import { ScrollRevealItem } from "@/components/ui/ScrollRevealItem";
import { Badge, Container } from "@/components/ui";
import { createPortfolioCardModel } from "@/lib/portfolio-card";
import { projects, projectToneClasses } from "@/lib/projects";

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

const activeProjectCount = orderedProjects.filter((project) => project.period.includes("현재")).length;

function ProjectTimelineItem({
  index,
  project,
}: {
  index: number;
  project: (typeof projects)[number];
}) {
  const card = createPortfolioCardModel(project);
  const Icon = project.icon;
  const alignLeft = index % 2 === 0;

  return (
    <ScrollRevealItem
      className="portfolio-reveal-item relative pl-14 md:grid md:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] md:items-start md:gap-0 md:pl-0"
      delayMs={Math.min(index * 50, 180)}
      side={alignLeft ? "left" : "right"}
    >
      <div
        className={`portfolio-reveal-dot absolute left-5 top-7 z-10 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full border ${
          card.isCurrent
            ? "border-cyan-200 bg-cyan-300/25 shadow-[0_0_0_6px_rgb(34_211_238/0.12)]"
            : "border-blue-200/70 bg-blue-300/20 shadow-[0_0_0_6px_rgb(96_165_250/0.10)]"
        } md:left-1/2 md:top-9`}
        aria-hidden="true"
      >
        <span
          className={`h-2 w-2 rounded-full ${card.isCurrent ? "bg-cyan-100" : "bg-blue-200"}`}
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
              card.isCurrent
                ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100"
                : "border-slate-700 bg-slate-900/70 text-slate-300"
            }`}
          >
            {card.statusLabel}
          </span>
          <span className="font-mono text-sm font-semibold text-slate-500">
            {card.periodLabel}
          </span>
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="card-heading text-2xl tracking-tight text-white">
              {project.title}
            </h2>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70" aria-hidden="true" />
              <span>{project.company}</span>
            </div>
          </div>
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${projectToneClasses[project.tone]}`}
          >
            <Icon aria-hidden="true" size={18} strokeWidth={2} />
          </span>
        </div>

        <p className="mt-5 text-base leading-7 text-slate-400">{card.description}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {card.stack.map((item) => (
            <Badge key={item} tone="slate">
              {item}
            </Badge>
          ))}
        </div>

        <dl className="mt-6 grid gap-4 border-t border-slate-800 pt-5 sm:grid-cols-3">
          {card.metrics.map((metric) => (
            <div className="min-w-0" key={metric.label}>
              <dt className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-slate-500">
                {metric.label}
              </dt>
              <dd className="mt-2 text-2xl font-extrabold tracking-tight text-cyan-100">
                {metric.value}
              </dd>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                {metric.caption}
              </p>
            </div>
          ))}
        </dl>

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
                      {orderedProjects.length}개 프로젝트
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
