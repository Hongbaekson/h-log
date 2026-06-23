import {
  Code2,
  Database,
  GitBranch,
  GraduationCap,
  Layers3,
  Server,
  Terminal,
} from "lucide-react";

import { PdfDownloadButton } from "@/components/resume/PdfDownloadButton";
import { ResumeProfilePhoto } from "@/components/resume/ResumeProfilePhoto";
import { Badge, Card, Container } from "@/components/ui";

const skillGroups = [
  {
    icon: Code2,
    items: ["Java", "JavaScript", "Go"],
    title: "언어",
    tone: "blue",
  },
  {
    icon: Layers3,
    items: ["Spring Boot", "React", "Node.js (Express)"],
    title: "프레임워크",
    tone: "violet",
  },
  {
    icon: Database,
    items: ["PostgreSQL", "Oracle", "MySQL", "MS-SQL", "DB2", "Redis / Redisson", "Elasticsearch"],
    title: "데이터베이스",
    tone: "mint",
  },
  {
    icon: Server,
    items: ["Docker", "Kubernetes", "AWS", "OCI"],
    title: "인프라",
    tone: "cyan",
  },
  {
    icon: GitBranch,
    items: ["GitHub Actions", "Jenkins", "OpenTelemetry"],
    title: "DevOps",
    tone: "blue",
  },
  {
    icon: Terminal,
    items: ["Claude Code", "Codex", "Hermes Agent"],
    title: "AI",
    tone: "cyan",
  },
  {
    icon: Code2,
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
    tone: "slate",
  },
] as const;

const skillToneClasses = {
  blue: "border-blue-300/25 bg-blue-400/10 text-blue-100",
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  mint: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  slate: "border-slate-500/35 bg-slate-800/80 text-slate-200",
  violet: "border-violet-300/25 bg-violet-400/10 text-violet-100",
} as const;

const timelineItems = [
  {
    highlights: [
      "OpenAPI Spec-First 기반 REST API 개발 워크플로우 구축",
      "Claude Code/Codex 기반 사내 표준 개발 프로세스 도입 및 팀 컨벤션 문서화",
      "GitHub Actions 기반 CI/CD 파이프라인을 구축하여 빌드, 테스트, 배포 아티팩트 생성, GPG 서명, 체크섬 생성, S3 업로드 과정을 자동화했습니다. 기존 수동 배포는 약 20분이 소요되고 휴먼 에러 및 배포 산출물 무결성 검증 부재 문제가 있었으나, 자동화 이후 배포 시간을 평균 3분으로 줄여 약 85% 단축했습니다. 또한 배포 압축 파일과 함께 GPG 서명 파일 및 체크섬을 관리하여 배포 아티팩트 위변조 여부를 검증할 수 있는 보안 흐름을 마련했습니다.",
      "GitHub Issues Webhook과 Discord 연동 기반 이슈 알림·조회 자동화 시스템 설계",
      "Spring Event + AFTER_COMMIT + REQUIRES_NEW 기반 트랜잭션 분리 설계",
      "Redisson RBlockingQueue + DLQ 패턴으로 비동기 처리 및 장애 복구 자동화",
      "JWT Access/Refresh, RBAC, Permission 단위 인증·인가 모델 설계",
      "OpenTelemetry + Micrometer 기반 분산 트레이싱 및 장애 분석 체계 구축",
    ],
    period: "2025.03 - 현재",
    role: "오프너드 / Backend Developer",
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
    role: "아스템즈 / Backend Developer",
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

              <div className="hero-reveal hero-reveal-3 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <PdfDownloadButton />
              </div>
            </div>

            <ResumeProfilePhoto />
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="min-w-0 space-y-14">
            <section>
              <SectionHeading eyebrow="About" title="소개 영역" />
              <Card className="space-y-5 p-5 md:p-6">
                <p className="text-base leading-8 text-slate-300">
                  현실적인 최선의 답을 찾아가는 개발자 손홍백입니다.
                </p>
                <p className="text-base leading-8 text-slate-300">
                  글로벌 환경에서의 협업 경험을 바탕으로, 다양한 시각을 수용하며 비즈니스
                  로직을 견고한 서버 기술로 구현해내는 과정을 즐깁니다. 저는 개발 과정에서
                  발생한 시행착오를 체계적으로 기록하고 자산화하는 습관을 지니고 있습니다. 이는
                  팀 전체의 리소스를 줄이고 더 나은 의사결정을 내리는 밑바탕이 됩니다.
                </p>
                <p className="text-base leading-8 text-slate-300">
                  단순히 &apos;돌아가는 코드&apos;에 만족하지 않고, 데이터에 기반해 근거 있는
                  개선안을 제시합니다. 때로는 시도한 개선이 실패하더라도 이를 투명하게 공유하고
                  다시 실용적인 방향으로 선회할 수 있는 유연함을 갖췄습니다. 자동화 도구를
                  활용해 팀의 코드 품질을 상향 평준화하는 시스템을 구축하고, 함께 일하고 싶은
                  개발 문화 형성에 기여하고 싶습니다.
                </p>
              </Card>
            </section>

            <section>
              <SectionHeading eyebrow="Skills" title="기술 스택" />
              <div className="grid gap-4 lg:grid-cols-2">
                {skillGroups.map((group) => {
                  const Icon = group.icon;

                  return (
                    <Card className="p-5 transition-colors hover:border-slate-600/90" key={group.title}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="card-heading text-xl text-white">{group.title}</h3>
                        </div>
                        <div className={`grid h-11 w-11 place-items-center rounded-xl border ${skillToneClasses[group.tone]}`}>
                          <Icon aria-hidden="true" size={18} strokeWidth={2} />
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {group.items.map((item) => (
                          <span
                            className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-sm font-semibold ${skillToneClasses[group.tone]}`}
                            key={item}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
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
