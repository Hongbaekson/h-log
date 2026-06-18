import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Terminal } from "lucide-react";

import { Badge, Container } from "@/components/ui";
import { getProjectBySlug, projects, projectToneClasses } from "@/lib/projects";

type Project = NonNullable<ReturnType<typeof getProjectBySlug>>;

type PortfolioDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({
  params,
}: PortfolioDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Portfolio",
    };
  }

  return {
    description: project.summary,
    title: `${project.title} | Portfolio`,
  };
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
        {eyebrow}
      </p>
      <h2 className="card-heading mt-3 text-2xl tracking-tight text-white md:text-3xl">{title}</h2>
    </div>
  );
}

function MetricRibbon({ project }: { project: Project }) {
  const metrics = [
    ...project.metrics,
    {
      label: "Scope",
      value: project.type,
    },
  ];

  return (
    <dl className="grid border-y border-slate-700/80 md:grid-cols-4">
      {metrics.map((metric) => (
        <div
          className="border-b border-slate-800 py-5 md:border-b-0 md:border-r md:px-5 md:last:border-r-0"
          key={metric.label}
        >
          <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-slate-500">
            {metric.label}
          </dt>
          <dd className="metric-value metric-value-cyan mt-3 text-2xl font-bold tracking-tight">
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SystemMap({ project }: { project: Project }) {
  const Icon = project.icon;

  return (
    <section className="border-t border-slate-700/80 pt-10">
      <SectionHeading eyebrow="System Architecture" title="시스템 흐름" />

      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <aside className="border-l border-cyan-300/40 pl-5">
          <div
            className={`grid h-12 w-12 place-items-center rounded-xl border ${projectToneClasses[project.tone]}`}
          >
            <Icon aria-hidden="true" size={21} strokeWidth={2} />
          </div>
          <h3 className="card-heading mt-5 text-xl text-white">{project.context}</h3>
          <p className="mt-4 text-sm leading-7 text-slate-400">{project.problem}</p>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#080d18]/55">
          <div className="grid gap-0 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
            {project.detail.architecture.map((item, index) => (
              <div className="contents" key={item}>
                <div className="min-h-44 p-5">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-slate-500">
                    Layer 0{index + 1}
                  </p>
                  <h4 className="card-heading mt-4 text-lg text-white">
                    {["Input", "Process", "Operate"][index] ?? "Layer"}
                  </h4>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{item}</p>
                </div>
                {index < project.detail.architecture.length - 1 ? (
                  <div className="hidden w-px bg-slate-700/80 md:block">
                    <ArrowRight
                      aria-hidden="true"
                      className="-ml-2 mt-20 bg-[#080d18] text-cyan-200"
                      size={17}
                      strokeWidth={2}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Details({ project }: { project: Project }) {
  const detailItems = [
    ...project.detail.architecture,
    ...project.detail.role,
  ];

  return (
    <section className="border-t border-slate-700/80 pt-10">
      <SectionHeading eyebrow="Details" title="상세 내용" />
      <ul className="grid gap-x-8 gap-y-4 text-sm leading-7 text-slate-300 md:grid-cols-2">
        {detailItems.map((item) => (
          <li className="flex gap-3 border-t border-slate-800 pt-4" key={item}>
            <span className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Highlights({ project }: { project: Project }) {
  return (
    <section className="border-t border-slate-700/80 pt-10">
      <SectionHeading eyebrow="Highlights" title="문제 해결 흐름" />
      <div className="grid gap-10">
        {project.approach.map((solution, index) => {
          const problem =
            index === 0
              ? project.problem
              : (project.detail.decisions[index - 1] ?? project.detail.decisions[0]);
          const result = project.impact[index] ?? project.impact[0];

          return (
            <article
              className="grid gap-5 border-t border-slate-800 pt-6 lg:grid-cols-[6rem_1fr]"
              key={solution}
            >
              <div className="font-mono text-3xl font-bold text-slate-600">
                0{index + 1}
              </div>
              <div>
                <h3 className="card-heading text-xl text-white">{solution}</h3>
                <div className="mt-5 grid gap-5 lg:grid-cols-3">
                  {[
                    { label: "Problem", value: problem },
                    { label: "Solution", value: solution },
                    { label: "Result", value: result },
                  ].map((item) => (
                    <div className="border-l border-slate-700 pl-4" key={item.label}>
                      <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-cyan-200">
                        {item.label}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TechStack({ project }: { project: Project }) {
  return (
    <section className="border-t border-slate-700/80 pt-10">
      <SectionHeading eyebrow="Tech Stack" title="사용 기술" />
      <div className="flex flex-wrap gap-2">
        {project.stack.map((item) => (
          <Badge key={item} tone="slate">
            {item}
          </Badge>
        ))}
      </div>
    </section>
  );
}

export default async function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <>
      <section className="pt-12 pb-10 md:pt-16 md:pb-12">
        <Container>
          <Link
            className="hero-reveal hero-reveal-1 inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            href="/portfolio"
          >
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={2} />
            Portfolio
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-end">
            <div>
              <Badge className="hero-reveal hero-reveal-2" tone={project.tone}>
                <Terminal aria-hidden="true" size={14} strokeWidth={2} />
                <span className="font-mono uppercase tracking-[0.18em]">{project.type}</span>
              </Badge>
              <h1 className="hero-heading hero-reveal hero-reveal-3 mt-6 max-w-4xl text-4xl leading-[1.08] tracking-normal text-white md:text-6xl">
                {project.title}
              </h1>
              <p className="hero-reveal hero-reveal-4 mt-5 text-sm font-semibold text-cyan-200 md:text-base">
                {project.company} | {project.period}
              </p>
              <p className="hero-reveal hero-reveal-5 mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                {project.summary}
              </p>
            </div>

            <div className="hero-status-card border-y border-slate-700/80 py-4">
              {[
                "Overview",
                "Architecture",
                "Details",
                "Highlights",
                "Stack",
              ].map((item) => (
                <div
                  className="flex items-center justify-between border-b border-slate-800 py-3 text-sm font-semibold text-slate-300 last:border-b-0"
                  key={item}
                >
                  {item}
                  <CheckCircle2 aria-hidden="true" className="text-cyan-200" size={15} />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="grid gap-10">
            <MetricRibbon project={project} />
            <SystemMap project={project} />
            <Details project={project} />
            <Highlights project={project} />
            <TechStack project={project} />
          </div>
        </Container>
      </section>
    </>
  );
}
