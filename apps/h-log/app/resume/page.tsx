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
    items: ["Java", "Spring Boot", "Spring", "JPA", "QueryDSL", "MyBatis", "Spring Batch", "JWT / RBAC"],
    title: "실무 핵심 · Backend",
  },
  {
    items: ["PostgreSQL", "Oracle", "MySQL", "MS-SQL", "DB2", "Redis / Redisson", "Elasticsearch"],
    title: "실무 핵심 · Data",
  },
  {
    items: ["Kafka", "OpenTelemetry", "Micrometer"],
    title: "실무 핵심 · Messaging & Observability",
  },
  {
    items: ["Docker", "Kubernetes", "Gitea", "Gitea Actions", "Jenkins", "Git"],
    title: "실무 핵심 · Delivery",
  },
  {
    items: ["OpenAPI Spec-First", "Claude Code", "Codex"],
    title: "AI 개발 워크플로우",
  },
  {
    items: ["Go", "TypeScript", "Next.js", "React", "Node.js", "GitHub Actions", "AWS", "OCI", "Hermes Agent"],
    title: "개인 프로젝트·운영",
  },
] as const;

const timelineItems = [
  {
    highlights: [
      "OpenAPI Spec-First와 Claude Code/Codex 워크플로우로 단순 기능 평균 구현 시간을 1일에서 2시간으로 단축",
      "AI 개발 규칙과 도메인 문서화로 코드 리뷰의 컨벤션 지적을 약 80% 감소",
      "Gitea Actions 기반 빌드·테스트·배포 흐름 운영",
      "Spring Event + AFTER_COMMIT + REQUIRES_NEW 기반 트랜잭션 분리 설계",
      "Redisson RBlockingQueue + DLQ로 API 응답 시간을 약 80% 단축하고 처리량을 2배로 개선",
      "JWT Access/Refresh, RBAC, Permission 단위 인증·인가 모델 설계",
      "OpenTelemetry + Micrometer 분산 추적으로 장애 원인 식별 시간을 약 87% 단축",
      "Redis 캐시 예열 시간을 35분 36초에서 68초로 단축",
    ],
    period: "2025.03 - 현재",
    role: "B2B 솔루션 기업 / Backend Developer",
    summary: "B2B 솔루션 백엔드 개발과 데이터 파이프라인 구축을 담당했습니다.",
    tags: ["Java 21", "Spring Boot 3.x", "JPA", "QueryDSL", "PostgreSQL", "Redisson", "OpenTelemetry", "Gitea Actions"],
  },
  {
    highlights: [
      "POS/KIOSK 조회 응답을 3,000ms에서 900ms, 결제 응답을 2,000ms에서 500ms로 단축",
      "Spring Batch로 10만 건 처리 시간을 40분에서 15분으로 단축",
      "영업정보 시스템 반복 기능 개발을 2주에서 5일로 줄이고 조회 쿼리 수를 약 70% 절감",
      "복합 인덱스로 검색 응답을 3,000ms에서 500ms로 단축",
      "CRM 휴면 고객 알림을 수동 5분에서 즉시 처리로 자동화",
      "DB2 기반 400개 규모의 테이블·Stored Procedure를 MS-SQL로 전환",
      "백오피스 월 장애를 8건에서 2건, 배치 복구를 1시간에서 5분으로 단축",
      "Jenkins 기반 빌드·배포 흐름 운영",
    ],
    period: "2021.07 - 2025.01",
    role: "시스템 통합·솔루션 기업 / Backend Developer",
    summary: "SI, 솔루션, POS/KIOSK 및 백오피스 시스템 개발·운영을 수행했습니다.",
    tags: ["Java", "Spring Boot", "Spring Batch", "MyBatis", "Oracle", "MySQL", "Redis", "Kafka", "Jenkins"],
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
