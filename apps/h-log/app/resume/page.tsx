import type { Metadata } from "next";
import { GraduationCap, Layers3, Terminal } from "lucide-react";

import { ResumeProfilePhoto } from "@/components/resume/ResumeProfilePhoto";
import { Badge, Card, Container } from "@/components/ui";

export const metadata: Metadata = {
  alternates: {
    canonical: "/resume",
  },
  description:
    "Java/Spring 백엔드 개발자 손홍백의 경력, 기술 스택, 교육과 활동을 정리한 이력서입니다.",
  title: "이력서",
};

const skillGroups = [
  {
    items: ["Java", "JavaScript", "Go"],
    title: "언어",
  },
  {
    items: ["Spring Boot", "React", "Node.js (Express)"],
    title: "프레임워크",
  },
  {
    items: ["PostgreSQL", "Oracle", "MySQL", "MS-SQL", "DB2", "Redis / Redisson", "Elasticsearch"],
    title: "데이터베이스",
  },
  {
    items: ["Docker", "Kubernetes", "AWS", "OCI"],
    title: "인프라",
  },
  {
    items: ["GitHub Actions", "Jenkins", "OpenTelemetry"],
    title: "DevOps",
  },
  {
    items: ["Claude Code", "Codex", "Hermes Agent"],
    title: "AI",
  },
  {
    items: [
      "Gitea",
      "Git",
      "SVN",
      "JSP",
      "JPA",
      "Kafka",
      "JWT",
    ],
    title: "기타",
  },
] as const;

const timelineItems = [
  {
    highlights: [
      "OpenAPI Spec-First 기반 REST API 개발 워크플로우와 팀 기준 정리",
      "Claude Code/Codex 기반 개발 프로세스와 팀 컨벤션 문서화",
      "GitHub Actions로 빌드, 테스트, 배포 아티팩트 검증과 배포 흐름 자동화",
      "GitHub Issues Webhook과 Discord 기반 이슈 알림·조회 자동화 설계",
      "Spring Event + AFTER_COMMIT + REQUIRES_NEW 기반 트랜잭션 분리 설계",
      "Redisson RBlockingQueue + DLQ 패턴으로 비동기 처리 및 장애 복구 자동화",
      "JWT Access/Refresh, RBAC, Permission 단위 인증·인가 모델 설계",
      "OpenTelemetry + Micrometer 기반 분산 트레이싱 및 장애 분석 체계 구축",
    ],
    period: "2025.03 - 현재",
    role: "B2B 솔루션 기업 / Backend Developer",
    summary: "B2B 솔루션 백엔드 개발과 데이터 파이프라인 구축을 담당했습니다.",
    tags: ["Java 21", "Spring Boot 3.x", "JPA", "QueryDSL", "PostgreSQL", "Redis", "Redisson", "OpenTelemetry"],
  },
  {
    highlights: [
      "POS/KIOSK 차세대 프로젝트에서 Redis 캐시 적용으로 조회 성능 개선",
      "Kafka 기반 비동기 알림 처리로 결제 응답 지연 문제 개선",
      "Spring Batch Chunk 처리로 대량 데이터 배치 안정화",
      "GitHub Actions 기반 CI/CD 파이프라인 구축 및 배포 자동화",
      "MyBatis Lazy Loading, 복합 인덱스 설계로 주요 API 조회 성능 최적화",
      "CRM 휴면 고객 알림 자동화 및 카카오톡 API 연동 개발",
      "DB 마이그레이션 및 백오피스 운영 안정화 수행",
    ],
    period: "2021.07 - 2025.01",
    role: "시스템 통합·솔루션 기업 / Backend Developer",
    summary: "SI, 솔루션, POS/KIOSK 및 백오피스 시스템 개발·운영을 수행했습니다.",
    tags: ["Java", "Spring Boot", "Spring Batch", "MyBatis", "Oracle", "MySQL", "Redis", "Kafka", "GitHub Actions", "CI/CD"],
  },
] as const;

const educationItems = [
  {
    detail: "Computer Programming (CPD) 졸업",
    name: "Seneca College",
    period: "2017.09 ~ 2020.04",
  },
  {
    detail: "정보통신공학 (3학년 중퇴)",
    name: "한라대학교",
    period: "2009.03 ~ 2013.02",
  },
] as const;

const activityItems = [
  {
    detail: "프로젝트 설계 및 코드 리뷰를 통한 실무 능력 강화",
    name: "F-Lab Java Backend Mentoring 과정",
    period: "2025.01 ~ 2025.04",
  },
  {
    detail: "복잡한 쿼리 최적화, DB 모델링 실습 및 성능 최적화",
    name: "Programmers SQL/DB Essentials 과정",
    period: "2022.02 ~ 2022.04",
  },
] as const;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
        {eyebrow}
      </p>
      <h2 className="card-heading mt-3 text-2xl tracking-tight text-white md:text-3xl">{title}</h2>
      {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">{description}</p> : null}
    </div>
  );
}

export default function ResumePage() {
  return (
    <>
      <section className="py-12 md:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-center">
            <div className="max-w-3xl">
              <Badge className="hero-reveal hero-reveal-1" tone="cyan">
                <Terminal aria-hidden="true" size={14} strokeWidth={2} />
                <span className="font-mono uppercase tracking-[0.18em]">resume.online</span>
                <span className="hero-signal-cursor" aria-hidden="true" />
              </Badge>

              <h1 className="hero-heading hero-reveal hero-reveal-2 mt-6 max-w-3xl text-4xl leading-[1.1] tracking-normal text-white md:text-6xl">
                손홍백 <span className="hero-name-gradient">Resume</span>
              </h1>
            </div>

            <ResumeProfilePhoto />
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="min-w-0 space-y-14">
            <section>
              <SectionHeading eyebrow="About" title="프로필 요약" />
              <Card className="max-w-[70ch] space-y-4 p-5 md:p-6">
                <p className="text-base leading-8 text-slate-300">
                  Java와 Spring을 중심으로 운영하기 쉬운 백엔드를 만드는 개발자 손홍백입니다.
                  반복 작업은 자동화하고, 장애와 변경에 대응하기 쉬운 구조를 고민합니다.
                </p>
                <p className="text-base leading-8 text-slate-300">
                  시행착오와 검증 결과를 기록해 팀의 기준으로 남기고, 데이터와 관측 결과를
                  바탕으로 현실적인 개선안을 제시합니다.
                </p>
              </Card>
            </section>

            <section>
              <SectionHeading
                eyebrow="Experience"
                title="경력 타임라인"
              />
              <div className="relative space-y-4 before:absolute before:bottom-3 before:left-5 before:top-3 before:w-px before:bg-slate-700/80">
                {timelineItems.map((item) => (
                  <div className="relative grid gap-4 pl-12" key={item.period}>
                    <span className="absolute left-[0.7rem] top-5 h-5 w-5 rounded-full border border-cyan-300/40 bg-[#080d18] shadow-[0_0_0_6px_rgb(34_211_238_/_0.08)]" />
                    <Card className="p-5">
                      <p className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">
                        {item.period}
                      </p>
                      <h3 className="card-heading mt-3 text-xl text-white">{item.role}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{item.summary}</p>
                      <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-300">
                        {item.highlights.map((highlight) => (
                          <li className="flex gap-2" key={highlight}>
                            <span className="mt-[0.65rem] h-1 w-1 shrink-0 rounded-full bg-cyan-300" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <Badge key={tag} tone="cyan">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading eyebrow="Skills" title="기술 스택" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {skillGroups.map((group) => (
                  <Card className="p-4" key={group.title}>
                    <h3 className="card-heading text-base text-white">{group.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {group.items.join(" · ")}
                    </p>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading eyebrow="Education" title="학력과 활동" />
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-emerald-100">
                      <GraduationCap aria-hidden="true" size={19} strokeWidth={2} />
                    </div>
                    <h3 className="card-heading text-lg text-white">학력</h3>
                  </div>
                  <div className="mt-5 space-y-5">
                    {educationItems.map((item) => (
                      <div
                        className="border-t border-slate-800 pt-5 first:border-t-0 first:pt-0"
                        key={item.name}
                      >
                        <p className="font-mono text-xs text-cyan-200">{item.period}</p>
                        <h4 className="card-heading mt-2 text-base text-white">{item.name}</h4>
                        <p className="mt-2 text-sm leading-7 text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-violet-100">
                      <Layers3 aria-hidden="true" size={19} strokeWidth={2} />
                    </div>
                    <h3 className="card-heading text-lg text-white">활동</h3>
                  </div>
                  <div className="mt-5 space-y-5">
                    {activityItems.map((item) => (
                      <div
                        className="border-t border-slate-800 pt-5 first:border-t-0 first:pt-0"
                        key={item.name}
                      >
                        <p className="font-mono text-xs text-cyan-200">{item.period}</p>
                        <h4 className="card-heading mt-2 text-base text-white">{item.name}</h4>
                        <p className="mt-2 text-sm leading-7 text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </section>
          </div>
        </Container>
      </section>

    </>
  );
}
