import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Terminal } from "lucide-react";

import { GithubWebhookArchitectureDiagram } from "@/components/portfolio/GithubWebhookArchitectureDiagram";
import { ProjectRelatedPosts } from "@/components/portfolio/ProjectRelatedPosts";
import { Badge, Container } from "@/components/ui";
import { getProjectBySlug, projects } from "@/lib/projects";

type Project = NonNullable<ReturnType<typeof getProjectBySlug>>;

export const dynamic = "force-dynamic";

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
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#b6bdff]">
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

function AiWorkflowDiagram({ project }: { project: Project }) {
  return (
    <section className="min-w-0 border-t border-[var(--border)] pt-10">
      <SectionHeading eyebrow="Workflow" title="구현과 검증 흐름" />
      <figure aria-labelledby="ai-workflow-caption">
        <figcaption className="mb-4 text-sm text-[var(--text-muted)]" id="ai-workflow-caption">
          AI 개발 워크플로우
        </figcaption>
        <div className="grid min-w-0 items-center gap-4 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)_auto_minmax(0,1.2fr)]">
          <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="font-semibold text-white">구현 기준</h3>
            <ul className="mt-3 grid gap-3 text-sm leading-7 text-[var(--text-secondary)]">
              {project.detail.architecture.slice(0, 2).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <ArrowRight aria-hidden="true" className="justify-self-center rotate-90 text-[#b6bdff] md:rotate-0" size={20} />
          <div className="min-w-0 rounded-2xl border border-[#5865f2]/60 bg-[var(--surface-elevated)] p-5">
            <h3 className="font-semibold text-white">Controller·DTO 구현</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Claude Code · Codex</p>
          </div>
          <ArrowRight aria-hidden="true" className="justify-self-center rotate-90 text-[#b6bdff] md:rotate-0" size={20} />
          <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="font-semibold text-white">생성 결과 검증</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{project.detail.architecture[2]}</p>
          </div>
        </div>
      </figure>
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
        <ul className="grid max-w-3xl gap-4">
          {project.approach.map((item) => (
            <li
              className="border-l border-[#5865f2]/60 pl-5 text-base leading-8 text-slate-300"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      {project.slug === "ai-backend-workflow-standardization" && (
        <AiWorkflowDiagram project={project} />
      )}

      <div className="border-t border-slate-800 pt-10">
        <SectionHeading eyebrow="Result" title={project.detail.evidence ? "기록된 결과" : "확인된 결과"} />
        <ul className="grid max-w-3xl gap-4">
          {project.impact.map((item) => (
            <li
              className="border-l border-[#a3aaff]/60 pl-5 text-base leading-8 text-slate-300"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      {project.detail.evidence && (
        <section className="border-t border-[var(--border)] pt-10">
          <SectionHeading eyebrow="Evidence" title="성과의 근거와 범위" />
          <dl className="grid max-w-3xl gap-6 text-base leading-8">
            <div>
              <dt className="font-semibold text-white">근거</dt>
              <dd className="mt-2 text-[var(--text-secondary)]">{project.detail.evidence.basis}</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">적용 범위</dt>
              <dd className="mt-2 text-[var(--text-secondary)]">{project.detail.evidence.scope}</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">공개 기록의 한계</dt>
              <dd className="mt-2 text-[var(--text-secondary)]">{project.detail.evidence.limitations}</dd>
            </div>
          </dl>
        </section>
      )}
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
      <section className="pt-12 pb-10 break-keep wrap-anywhere md:pt-16 md:pb-12">
        <Container>
          <Link
            className="hero-reveal hero-reveal-1 inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
            href="/portfolio"
          >
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={2} />
            포트폴리오 목록
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div className="min-w-0">
              <Badge className="hero-reveal hero-reveal-2" tone={project.tone}>
                <Terminal aria-hidden="true" size={14} strokeWidth={2} />
                <span className="font-mono uppercase tracking-[0.18em]">{project.type}</span>
              </Badge>
              <h1 className="hero-heading hero-reveal hero-reveal-3 mt-6 max-w-4xl text-4xl leading-[1.08] tracking-normal text-white md:text-6xl">
                {project.context}
              </h1>
              <p className="hero-reveal hero-reveal-4 mt-5 text-sm font-semibold text-[#b6bdff] md:text-base">
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
                className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#b6bdff]"
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

      <section className="pb-24 break-keep wrap-anywhere">
        <Container>
          <div className="grid gap-10">
            <ProjectStory project={project} />
            {project.slug === "github-issues-workflow-automation" ? (
              <GithubWebhookArchitectureDiagram />
            ) : project.slug !== "ai-backend-workflow-standardization" && (
              <SystemMap project={project} />
            )}
            {project.slug === "redisson-async-processing-recovery" && (
              <section aria-label="Queue 흐름 직접 보기" className="border-t border-slate-700 pt-8">
                <h2 className="text-xl font-semibold text-white">Queue 흐름 직접 보기</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">가상 작업으로 실패·DLQ 보관·재처리 순서를 살펴볼 수 있습니다. 실제 프로젝트를 재현하거나 이 페이지의 성과를 측정하는 실험은 아닙니다.</p>
                <Link className="mt-3 inline-flex min-h-11 items-center rounded-md py-2 font-semibold text-[#b6bdff] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href="/lab/queue">Queue와 DLQ 재생 실험 열기</Link>
              </section>
            )}
            <TechStack project={project} />
            <Suspense fallback={
              <noscript>
                <Link className="rounded-md text-[#b6bdff] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href="/blog">블로그 글 보기</Link>
              </noscript>
            }>
              <ProjectRelatedPosts projectSlug={project.slug} />
            </Suspense>
          </div>
        </Container>
      </section>
    </>
  );
}
