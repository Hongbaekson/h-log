import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui";
import { createPortfolioCardModel } from "@/lib/portfolio-card";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  alternates: {
    canonical: "/portfolio",
  },
  description:
    "백엔드 시스템, 운영 자동화, 데이터베이스 성능 개선 경험을 문제와 판단, 검증된 결과 중심으로 정리한 포트폴리오입니다.",
  title: "포트폴리오",
};

const featuredProjects = projects.filter((project) => project.section === "featured");
const careerProjects = projects.filter((project) => project.section === "career");
const sideProjects = projects.filter((project) => project.section === "side");

function ProjectCard({
  featured = false,
  project,
}: {
  featured?: boolean;
  project: (typeof projects)[number];
}) {
  const card = createPortfolioCardModel(project);
  const Icon = project.icon;
  const isCareer = project.section === "career";

  return (
    <Link
      aria-label={`${card.title} 프로젝트 상세 보기`}
      className={`group h-full min-w-0 transition-colors hover:border-[#a3aaff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff] ${
        isCareer
          ? "grid gap-4 border-b border-[var(--border)] py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-10"
          : `flex flex-col rounded-3xl border p-6 ${featured ? "border-[#5865f2]/60 bg-[var(--surface-elevated)] md:p-9" : "border-[var(--border)] bg-[var(--surface)]"}`
      }`}
      href={`/portfolio/${project.slug}`}
    >
      <div className="min-w-0">
        {featured && (
          <p className="mb-6 text-sm font-semibold text-[#b6bdff]">대표 사례</p>
        )}
        <div className="flex items-start gap-3">
          {!isCareer && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#5865f2]/15 text-[#b6bdff]">
              <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
            </span>
          )}
          <h3 className={`card-heading min-w-0 leading-snug break-keep text-white wrap-anywhere ${featured ? "text-2xl md:text-4xl" : "text-xl"}`}>
            {card.title}
          </h3>
          {isCareer && <ArrowRight aria-hidden="true" className="mt-1 ml-auto shrink-0 text-[#b6bdff]" size={17} />}
        </div>
      </div>

      <dl className={`grid gap-4 ${isCareer ? "" : "mt-6"}`}>
        <div className="min-w-0">
          <dt className="text-xs text-[var(--text-muted)]">역할</dt>
          <dd className="mt-1 text-sm leading-6 break-keep text-[var(--text-secondary)] wrap-anywhere">{card.role}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-[var(--text-muted)]">핵심 결과</dt>
          <dd className={`mt-1 break-keep wrap-anywhere ${featured ? "text-2xl leading-relaxed font-semibold text-[#dce0ff] md:text-3xl" : "text-sm leading-6 text-[var(--text-secondary)]"}`}>
            {card.result}
          </dd>
        </div>
      </dl>

      {!isCareer && (
        <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-[#b6bdff] group-hover:text-white">
          상세 보기
          <ArrowRight aria-hidden="true" size={17} />
        </span>
      )}
    </Link>
  );
}

export default function PortfolioPage() {
  return (
    <>
      <section className="pt-10 pb-10 md:pt-16 md:pb-12">
        <Container>
          <p className="text-sm text-[#b6bdff]">공개 프로젝트 {projects.length}개</p>
          <h1 className="hero-heading mt-3 text-4xl leading-tight text-white md:text-5xl">
            포트폴리오
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            백엔드 개발과 운영에서 맡은 역할과 결과를 정리했습니다.
          </p>
        </Container>
      </section>

      <section aria-labelledby="featured-projects" className="pb-14 md:pb-20">
        <Container>
          <h2 id="featured-projects" className="text-2xl font-bold text-white">
            대표 프로젝트
          </h2>
          <ol className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            {featuredProjects.map((project, index) => (
              <li className={`min-w-0 ${index === 0 ? "lg:row-span-2" : ""}`} key={project.slug}>
                <ProjectCard featured={index === 0} project={project} />
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="career-projects" className="pb-14 md:pb-20">
        <Container>
          <h2 id="career-projects" className="text-2xl font-bold text-white">
            경력 프로젝트
          </h2>
          <ol className="mt-6 border-t border-[var(--border)]">
            {careerProjects.map((project) => (
              <li className="min-w-0" key={project.slug}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="side-projects" className="pb-24">
        <Container>
          <h2 id="side-projects" className="text-2xl font-bold text-white">
            개인 프로젝트
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            실무 경력과 구분해 직접 설계하고 운영하는 자동화 프로젝트입니다.
          </p>
          <ol className="mt-6 grid gap-5">
            {sideProjects.map((project) => (
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
