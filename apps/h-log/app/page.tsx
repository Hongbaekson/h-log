import {
  BadgeCheck,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  FileText,
  FolderOpen,
  Server,
  Sparkles,
  Terminal,
} from "lucide-react";

import { Badge, ButtonLink, Card, Container, Metric } from "@/components/ui";

const careerStart = {
  year: 2021,
  month: 7,
} as const;

function getCareerYear(now = new Date()) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const hasReachedAnniversaryMonth = currentMonth >= careerStart.month;
  const completedYears = currentYear - careerStart.year - (hasReachedAnniversaryMonth ? 0 : 1);

  return Math.max(completedYears + 1, 1);
}

const focusItems = [
  { label: "실무 경력", tone: "blue" as const, value: `${getCareerYear()}년차` },
  { label: "문제 해결 중심 Portfolio", tone: "cyan" as const, value: "8+" },
];

const rotatingFocusItems = [
  {
    description: "Java/Spring 기반 API 설계",
    tone: "blue",
    value: "Backend",
  },
  {
    description: "배포 자동화와 운영 개선",
    tone: "cyan",
    value: "DevOps",
  },
  {
    description: "Docker · K8s · CI/CD 연결",
    tone: "mint",
    value: "Infra",
  },
  {
    description: "반복 업무 자동화 워크플로우",
    tone: "violet",
    value: "AI",
  },
] as const;

const statusItems = [
  {
    icon: Cpu,
    label: "Runtime",
    value: "Java · Spring",
  },
  {
    icon: Code2,
    label: "Focus",
    value: "API 설계 · 운영 개선",
  },
  {
    icon: Server,
    label: "Infra",
    value: "Docker · K8s · CI/CD",
  },
  {
    icon: CheckCircle2,
    label: "Status",
    value: "Available",
  },
];

const strengthItems = [
  {
    description: "도메인 규칙과 운영 흐름을 분리해 변경에 견디는 백엔드를 만듭니다.",
    icon: Code2,
    title: "Backend Architecture",
  },
  {
    description: "반복 작업을 자동화하고 알림, 요약, 검증 흐름으로 연결합니다.",
    icon: Sparkles,
    title: "AI Workflow",
  },
  {
    description: "배포, 관측성, 장애 대응까지 고려해 운영 가능한 구조를 선호합니다.",
    icon: Database,
    title: "Reliable Systems",
  },
];

const radarCenter = { x: 180, y: 160 };

const radarAxes = [
  { anchor: "middle", label: "Backend", labelX: 180, labelY: 26, value: 0.9, x: 180, y: 44 },
  { anchor: "start", label: "Database", labelX: 314, labelY: 96, value: 0.82, x: 280, y: 102 },
  { anchor: "start", label: "DevOps", labelX: 314, labelY: 232, value: 0.78, x: 280, y: 218 },
  { anchor: "middle", label: "Frontend", labelX: 180, labelY: 306, value: 0.56, x: 180, y: 276 },
  { anchor: "end", label: "Infra", labelX: 46, labelY: 232, value: 0.76, x: 80, y: 218 },
  { anchor: "end", label: "Monitoring", labelX: 46, labelY: 96, value: 0.64, x: 80, y: 102 },
] as const;

const radarLevels = [1, 0.75, 0.5, 0.25] as const;

function radarPoint(axis: (typeof radarAxes)[number], scale: number) {
  const x = radarCenter.x + (axis.x - radarCenter.x) * scale;
  const y = radarCenter.y + (axis.y - radarCenter.y) * scale;

  return `${x},${y}`;
}

function TechnicalSkillsRadar() {
  const skillPolygon = radarAxes.map((axis) => radarPoint(axis, axis.value)).join(" ");

  return (
    <svg
      aria-labelledby="technical-skills-title"
      className="mx-auto h-44 w-full max-w-sm"
      role="img"
      viewBox="0 0 360 320"
    >
      <title id="technical-skills-title">Technical skills radar chart</title>
      {radarLevels.map((level) => (
        <polygon
          className="radar-grid fill-transparent stroke-slate-700/80"
          key={level}
          points={radarAxes.map((axis) => radarPoint(axis, level)).join(" ")}
          strokeWidth="1"
        />
      ))}
      <polygon
        className="radar-skill-pulse fill-cyan-300/10 stroke-cyan-300/30"
        points={skillPolygon}
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <g className="radar-skill-layer">
        <polygon
          className="radar-skill-shape fill-blue-500/20 stroke-blue-400"
          points={skillPolygon}
          strokeLinejoin="round"
          strokeWidth="2"
        />
        {radarAxes.map((axis) => {
          const [x, y] = radarPoint(axis, axis.value).split(",");

          return (
            <circle
              className="radar-skill-point fill-blue-300"
              cx={x}
              cy={y}
              key={`${axis.label}-point`}
              r="3"
            />
          );
        })}
      </g>
      {radarAxes.map((axis) => (
        <text
          className="radar-label fill-slate-400 text-xs font-semibold"
          key={`${axis.label}-label`}
          textAnchor={axis.anchor}
          x={axis.labelX}
          y={axis.labelY}
        >
          {axis.label}
        </text>
      ))}
    </svg>
  );
}

function RotatingFocusMetric() {
  return (
    <div className="metric-card metric-rotating-card min-h-28 rounded-2xl border border-slate-700/70 bg-slate-950/35 p-5">
      <dt className="sr-only">기술 역할</dt>
      <dd className="sr-only">Backend, DevOps, Infra, AI 역량을 연결합니다.</dd>
      <div aria-hidden="true" className="metric-rotator">
        {rotatingFocusItems.map((item) => (
          <div className="metric-rotator-item" key={item.value}>
            <p
              className={`metric-value text-2xl font-bold tracking-tight metric-value-${item.tone}`}
            >
              {item.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="pt-12 pb-8 md:pt-16 md:pb-10">
        <Container className="grid items-start gap-10 md:grid-cols-[1.08fr_0.92fr]">
          <div>
            <Badge className="hero-reveal hero-reveal-1" tone="cyan">
              <Terminal aria-hidden="true" size={14} strokeWidth={2} />
              <span className="font-mono uppercase tracking-[0.18em]">profile.online</span>
              <span className="hero-signal-cursor" aria-hidden="true" />
            </Badge>

            <h1 className="hero-heading hero-reveal hero-reveal-2 mt-6 max-w-3xl text-4xl leading-[1.1] tracking-normal text-white md:text-6xl">
              백엔드 개발자
              <br />
              <span className="hero-name-gradient">손홍백</span>입니다
            </h1>

            <p className="hero-reveal hero-reveal-3 mt-6 max-w-[34ch] text-base leading-8 text-slate-300 sm:max-w-2xl md:text-lg">
              Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고, 운영하기 쉬운
              구조를 고민합니다.
            </p>

            <div className="hero-reveal hero-reveal-4 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/portfolio">
                <FolderOpen aria-hidden="true" size={18} strokeWidth={2} />
                Portfolio
              </ButtonLink>
              <ButtonLink href="/resume" variant="secondary">
                <FileText aria-hidden="true" size={18} strokeWidth={2} />
                이력서 보기
              </ButtonLink>
            </div>

            <div className="hero-reveal hero-reveal-5 mt-8 flex flex-wrap gap-2">
              {["Java/Spring", "Backend API", "AI Workflow", "Docker/K8s"].map((item) => (
                <Badge key={item} tone="slate">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          <Card className="hero-status-card relative overflow-hidden p-5 md:justify-self-end">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Automation Status
                  </p>
                  <h2 className="card-heading mt-3 text-2xl text-white">
                    Practical Backend System
                  </h2>
                </div>
                <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 sm:grid">
                  <Terminal aria-hidden="true" size={21} strokeWidth={2} />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {statusItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="grid grid-cols-[2.5rem_1fr] items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3"
                      key={item.label}
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-cyan-100">
                        <Icon aria-hidden="true" size={18} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className="truncate text-sm font-semibold text-slate-100">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-700/70 bg-[#080d18]/70 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-cyan-200">
                    Technical Skills
                  </p>
                </div>
                <TechnicalSkillsRadar />
              </div>
            </div>
          </Card>
        </Container>
      </section>

      <section className="pb-14 md:pb-16">
        <Container>
          <dl className="metric-grid grid gap-3 sm:grid-cols-3">
            {focusItems.map((item) => (
              <Metric key={item.label} label={item.label} tone={item.tone} value={item.value} />
            ))}
            <RotatingFocusMetric />
          </dl>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="grid gap-4 md:grid-cols-3">
            {strengthItems.map((item) => {
              const Icon = item.icon;

              return (
                <Card className="p-5" key={item.title}>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-100">
                    <Icon aria-hidden="true" size={20} strokeWidth={2} />
                  </div>
                  <h3 className="card-heading mt-5 text-lg text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
                </Card>
              );
            })}
          </div>

          <Card className="mt-4 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <BadgeCheck aria-hidden="true" size={17} strokeWidth={2} />
                협업과 개선 작업에 열려있습니다
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                백엔드, 자동화, 운영 효율화와 관련된 작업을 함께 논의할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/portfolio" variant="ghost">
                <FolderOpen aria-hidden="true" size={17} strokeWidth={2} />
                Portfolio
              </ButtonLink>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}
