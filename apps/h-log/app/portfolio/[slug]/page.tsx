import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Terminal } from "lucide-react";

import { GithubWebhookArchitectureDiagram } from "@/components/portfolio/GithubWebhookArchitectureDiagram";
import { Badge, Container } from "@/components/ui";
import { getProjectBySlug, projects } from "@/lib/projects";

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
    alternates: {
      canonical: `/portfolio/${slug}`,
    },
    description: project.summary,
    openGraph: {
      description: project.summary,
      images: ["/opengraph-image"],
      title: project.context,
      type: "article",
      url: `/portfolio/${slug}`,
    },
    title: `${project.context} | 포트폴리오`,
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

function SystemMap({ project }: { project: Project }) {
  return (
    <section className="border-t border-slate-700/80 pt-10">
      <SectionHeading eyebrow="System Architecture" title="시스템 흐름" />
      <ol className="grid overflow-hidden rounded-2xl border border-slate-700/80 bg-[#080d18]/55 md:grid-cols-3">
        {project.detail.architecture.map((item) => (
          <li
            className="border-b border-slate-700/80 p-5 text-sm leading-7 text-slate-300 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0"
            key={item}
          >
            {item}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProjectStory({ project }: { project: Project }) {
  return (
    <section className="grid gap-10 border-t border-slate-700/80 pt-10">
      <div>
        <SectionHeading eyebrow="Problem" title="해결해야 했던 문제" />
        <p className="max-w-3xl text-base leading-8 text-slate-300">{project.problem}</p>
      </div>

      <div className="border-t border-slate-800 pt-10">
        <SectionHeading eyebrow="Decision" title="선택한 접근" />
        <ul className="grid gap-4 md:grid-cols-2">
          {project.approach.map((item) => (
            <li
              className="border-l border-cyan-300/40 pl-5 text-sm leading-7 text-slate-300"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-800 pt-10">
        <SectionHeading eyebrow="Result" title="확인된 결과" />
        <ul className="grid gap-4 md:grid-cols-2">
          {project.impact.map((item) => (
            <li
              className="border-l border-emerald-300/40 pl-5 text-sm leading-7 text-slate-300"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
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
                {project.context}
              </h1>
              <p className="hero-reveal hero-reveal-4 mt-5 text-sm font-semibold text-cyan-200 md:text-base">
                {project.period}
              </p>
              <p className="hero-reveal hero-reveal-5 mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                {project.summary}
              </p>
            </div>

            <aside
              aria-labelledby="project-role-heading"
              className="border-y border-slate-700/80 py-5"
            >
              <h2
                className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200"
                id="project-role-heading"
              >
                담당 역할
              </h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
                {project.detail.role.map((item) => (
                  <li className="border-l border-slate-700 pl-4" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="grid gap-10">
            <ProjectStory project={project} />
            {project.slug === "github-issues-workflow-automation" ? (
              <GithubWebhookArchitectureDiagram />
            ) : (
              <SystemMap project={project} />
            )}
            <TechStack project={project} />
          </div>
        </Container>
      </section>
    </>
  );
}
