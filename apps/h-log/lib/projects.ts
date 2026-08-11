import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  Clapperboard,
  Database,
  MessageSquare,
  ServerCog,
} from "lucide-react";

export type ProjectTone = "blue" | "cyan" | "mint" | "violet";

export type Project = {
  approach: string[];
  context: string;
  detail: {
    architecture: string[];
    role: string[];
  };
  icon: LucideIcon;
  impact: string[];
  period: string;
  problem: string;
  section: "featured" | "career" | "side";
  slug: string;
  stack: string[];
  summary: string;
  tone: ProjectTone;
  type: string;
  year: string;
};

export const projectToneClasses: Record<ProjectTone, string> = {
  blue: "border-blue-300/25 bg-blue-400/10 text-blue-100",
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  mint: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  violet: "border-violet-300/25 bg-violet-400/10 text-violet-100",
};

export const projects = [
  {
    approach: [
      "OpenAPI Spec-First 반복 구현을 Claude Code·Codex 워크플로우로 표준화",
      "프로젝트 규칙과 도메인 컨텍스트를 문서화해 AI 산출물의 기준 고정",
      "생성 코드를 기존 빌드·테스트·리뷰 절차로 검증",
    ],
    context: "AI 기반 백엔드 개발 워크플로우 표준화",
    detail: {
      architecture: [
        "OpenAPI 명세를 Controller와 DTO 구현의 기준으로 사용",
        "프로젝트 규칙과 도메인 문서를 AI 도구의 작업 컨텍스트로 연결",
        "생성 결과는 기존 빌드·테스트·코드 리뷰 흐름에서 검증",
      ],
      role: [
        "AI 개발 워크플로우 설계와 팀 적용 기준 정리",
        "프로젝트·도메인 문서 구조화",
        "생성 코드 검증 절차와 리뷰 기준 정리",
      ],
    },
    icon: ServerCog,
    impact: [
      "단순 기능 평균 구현 시간을 1일에서 2시간으로 단축",
      "코드 리뷰의 컨벤션 지적을 약 80% 감소",
      "리뷰 초점을 반복 형식보다 비즈니스 로직 검토로 이동",
    ],
    period: "2025.03 - 현재",
    problem: "OpenAPI 기반 Controller와 DTO 반복 구현에 시간이 들고, 팀 컨벤션 확인이 코드 리뷰에 반복적으로 집중됐습니다.",
    section: "featured",
    slug: "ai-backend-workflow-standardization",
    stack: ["Java", "Spring Boot", "OpenAPI", "Claude Code", "Codex", "Gitea Actions"],
    summary: "OpenAPI Spec-First와 AI 도구 활용 기준을 문서화해 단순 기능 평균 구현 시간을 1일에서 2시간으로 줄이고 컨벤션 리뷰 지적을 약 80% 낮췄습니다.",
    tone: "cyan",
    type: "AI Development Workflow",
    year: "2025",
  },
  {
    approach: [
      "Redisson RBlockingQueue로 요청 처리와 후속 작업을 분리",
      "DLQ와 재처리 흐름으로 실패 작업의 복구 경로 확보",
      "별도 트랜잭션과 동시성 제어로 처리 범위를 축소",
    ],
    context: "Redisson 기반 비동기 처리와 DLQ 장애 복구",
    detail: {
      architecture: [
        "API 요청은 필요한 상태만 저장한 뒤 Queue에 후속 작업을 전달",
        "Worker는 Redisson RBlockingQueue에서 작업을 가져와 독립 처리",
        "실패 작업은 DLQ에 격리하고 운영자가 재처리할 수 있게 구성",
      ],
      role: [
        "비동기 처리 구조와 실패 복구 흐름 설계",
        "Redisson Queue와 DLQ 처리 구현",
        "트랜잭션·동시성 경계 정리",
      ],
    },
    icon: BellRing,
    impact: [
      "비동기 분리로 API 응답 시간을 약 80% 단축",
      "처리량을 기존 대비 2배로 개선",
      "DLQ 재처리로 장애 복구 시간을 30초 이내로 단축",
    ],
    period: "2025.03 - 현재",
    problem: "외부 연동과 후속 처리가 요청 트랜잭션에 묶여 응답이 느리고, 처리 실패 시 빠르게 복구할 표준 경로가 부족했습니다.",
    section: "featured",
    slug: "redisson-async-processing-recovery",
    stack: ["Java", "Spring Boot", "Redisson", "Redis", "DLQ", "PostgreSQL"],
    summary: "요청과 후속 처리를 Redisson Queue로 분리해 API 응답 시간을 약 80% 단축하고 처리량을 2배로 높였으며, DLQ 재처리로 장애 복구 시간을 30초 이내로 줄였습니다.",
    tone: "mint",
    type: "Async Processing & Recovery",
    year: "2025",
  },
  {
    approach: [
      "OpenTelemetry로 서비스 간 trace와 핵심 span을 연결",
      "성공 요청은 표본 수집하고 오류 span은 전수 수집",
      "Micrometer 지표와 로그를 trace 기준으로 함께 분석",
    ],
    context: "OpenTelemetry 기반 관측성 체계 구축",
    detail: {
      architecture: [
        "Spring Boot 서비스에 OpenTelemetry trace context를 전파",
        "핵심 처리 구간을 span으로 기록하고 오류는 전수 수집",
        "trace, metric, log를 같은 요청 흐름에서 비교해 원인을 추적",
      ],
      role: [
        "분산 추적 기준과 수집 정책 설계",
        "OpenTelemetry·Micrometer 계측 적용",
        "장애 분석 절차와 운영 확인 항목 정리",
      ],
    },
    icon: BarChart3,
    impact: [
      "분산 추적으로 장애 원인 식별 시간을 약 87% 단축",
      "오류 span을 전수 수집해 간헐적 실패의 추적 가능성 확보",
      "trace·metric·log를 연결해 장애 분석 절차를 표준화",
    ],
    period: "2025.03 - 현재",
    problem: "서비스 간 요청 흐름이 로그에 흩어져 있어 장애가 발생하면 원인 구간을 찾는 데 많은 시간이 들었습니다.",
    section: "featured",
    slug: "opentelemetry-observability",
    stack: ["Java", "Spring Boot", "OpenTelemetry", "Micrometer", "PostgreSQL"],
    summary: "분산 추적과 오류 span 전수 수집으로 장애 원인 식별 시간을 약 87% 줄이고, trace·metric·log를 연결한 분석 기준을 마련했습니다.",
    tone: "violet",
    type: "Observability",
    year: "2025",
  },
  {
    approach: [
      "GitHub Webhook 수신·서명 검증·중복 방지 흐름 설계",
      "GitHub Actions CI/CD와 AWS OIDC 권한 위임으로 배포 파이프라인 자동화",
      "PGMQ Queue와 archive 기반 재처리로 Discord 알림 실패를 수신 흐름에서 분리",
      "LLM Worker는 읽기 전용 요약부터 시작하고 승인 기반 변경 작업으로 확장",
    ],
    context: "개인 프로젝트: Go 기반 Discord와 GitHub Issues 운영 자동화",
    detail: {
      architecture: [
        "GitHub Issues webhook을 raw body 기준으로 검증하고 delivery id로 중복 이벤트를 차단",
        "검증된 이벤트는 비동기 Queue에 저장해 알림과 요약 작업을 수신 흐름에서 분리",
        "외부 변경 작업은 권한 확인과 사용자 승인 뒤에 실행하도록 경계를 설정",
      ],
      role: [
        "Webhook MVP 범위와 단계별 확장 로드맵 정리",
        "GitHub App·Discord Bot 권한 Matrix와 audit log 기준 설계",
        "LLM Worker sandbox, token 격리, prompt injection 대응 원칙 정리",
      ],
    },
    icon: BellRing,
    impact: [
      "GitHub 이슈 변경을 검증·저장·중복 방지 후 Discord 알림으로 연결할 수 있는 운영형 MVP 경계를 정의",
      "빌드·테스트·패키징·무결성 검증을 CI/CD로 연결해 수동 배포 부담과 실수 가능성을 낮춤",
      "알림과 요약 실패가 webhook 수신에 영향을 주지 않도록 retry, archive, audit 흐름을 분리",
      "요약과 자연어 명령은 읽기 전용부터 시작하고 write 작업은 권한 확인과 승인 로그를 거치도록 위험도를 낮춤",
    ],
    period: "2025.03 - 현재",
    problem: "GitHub Issues 변경 확인과 Discord 공유가 수동에 의존하면 이슈 추적이 늦어지고, LLM이나 변경 작업을 바로 붙일 경우 보안·권한·감사 경계가 흐려질 수 있었습니다.",
    section: "side",
    slug: "github-issues-workflow-automation",
    stack: [
      "Go 1.26.x",
      "net/http",
      "PostgreSQL",
      "PGMQ",
      "pgx",
      "sqlc",
      "Atlas",
      "GitHub Webhook",
      "GitHub App",
      "discordgo",
      "go-github",
      "Discord Gateway",
      "Incoming Webhook",
      "LLM Worker",
      "Docker",
    ],
    summary: "Go 기반 GitHub Issues Webhook을 서명 검증·중복 방지·저장 흐름으로 안전하게 수신하고, Discord 알림과 LLM 요약을 PGMQ Queue/Worker 뒤로 분리해 운영 자동화를 확장할 수 있게 설계했습니다.",
    tone: "cyan",
    type: "Personal Workflow Automation",
    year: "2025",
  },
  {
    approach: [
      "Redis Cache-Aside 패턴으로 피크 시간대 조회 응답 경로 단축",
      "Kafka 비동기 메시징으로 결제 완료와 알림 처리 분리",
      "Spring Batch Chunk 처리와 비관적 락으로 대량 처리 안정화",
    ],
    context: "영화관 POS/KIOSK 차세대 시스템 개발",
    detail: {
      architecture: [
        "티켓·차량 조회 요청은 Spring Boot API와 MyBatis 조회 계층에서 처리",
        "조회 빈도가 높은 데이터는 Redis Cache-Aside 방식으로 DB 접근을 축소",
        "결제 후 알림과 대량 차량 데이터 처리는 Kafka와 Batch 흐름으로 분리",
      ],
      role: [
        "POS/KIOSK 백엔드 기능 개발",
        "Redis 캐시와 Kafka 기반 비동기 처리 적용",
        "대량 배치 처리와 동시성 제어 구간 개선",
      ],
    },
    icon: Clapperboard,
    impact: [
      "Redis 캐시로 피크 시간대 조회 응답을 3,000ms에서 900ms로 단축",
      "Kafka 비동기 처리로 결제 응답을 2,000ms에서 500ms로 단축",
      "10만 건을 40분에서 15분으로 줄이고 동시성 제어로 배치 안정성 확보",
    ],
    period: "2024.07 - 2025.01",
    problem: "피크 시간대 조회 폭증, 결제 후 알림 지연, 대량 차량 데이터 처리로 POS/KIOSK 응답성과 안정성이 흔들릴 수 있었습니다.",
    section: "career",
    slug: "pos-kiosk-modernization",
    stack: [
      "Java",
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Redis",
      "Kafka",
      "Spring Batch",
      "JSP",
      "Git",
    ],
    summary: "조회 응답을 3,000ms에서 900ms, 결제 응답을 2,000ms에서 500ms로 줄이고 10만 건 배치를 40분에서 15분으로 단축했습니다.",
    tone: "blue",
    type: "POS/KIOSK Modernization",
    year: "2024",
  },
  {
    approach: [
      "PHP 레거시 기능을 Spring Boot 기반 영업정보 시스템으로 전환",
      "MyBatis Lazy Loading으로 연관 데이터 조회의 N+1 문제 완화",
      "복합 인덱스 설계로 빈번한 조건 검색의 Full Table Scan 제거",
    ],
    context: "영업정보 시스템 신규 구축과 레거시 전환",
    detail: {
      architecture: [
        "기존 PHP 기반 업무 기능을 Spring Boot API와 JSP 화면 흐름으로 재구성",
        "영업 데이터 조회는 MyBatis 매핑과 Lazy Loading을 활용해 쿼리 수를 절감",
        "복합 조건 검색은 Oracle 인덱스 설계와 쿼리 튜닝으로 응답 경로 최적화",
      ],
      role: [
        "Spring Boot 기반 영업정보 기능 개발",
        "MyBatis 조회 구조와 쿼리 성능 개선",
        "Jenkins 기반 배포 흐름과 운영 반영 지원",
      ],
    },
    icon: BarChart3,
    impact: [
      "반복 기능 개발 기간을 2주에서 5일로 단축",
      "연관 데이터 조회 쿼리 수를 약 70% 줄이고 API 응답을 2,000ms에서 600ms로 단축",
      "복합 인덱스로 조건 검색 응답을 3,000ms에서 500ms로 단축",
    ],
    period: "2023.09 - 2024.06",
    problem: "PHP 레거시 시스템의 유지보수 비용이 커지고, 연관 데이터 조회와 복합 조건 검색에서 응답 지연이 발생했습니다.",
    section: "career",
    slug: "sales-system-modernization",
    stack: [
      "Java",
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Jenkins",
      "JSP",
      "Git",
    ],
    summary: "반복 기능 개발 기간을 2주에서 5일로 줄이고, 조회 쿼리 수를 약 70% 절감해 주요 API와 검색 응답을 개선했습니다.",
    tone: "cyan",
    type: "Sales System Migration",
    year: "2023",
  },
  {
    approach: [
      "카카오톡 API 연동으로 휴면 고객 알림 발송 자동화",
      "MyBatis 동적 쿼리와 복합 인덱스로 CRM 조회 응답 개선",
      "운영자가 수동 처리하던 반복 알림 흐름을 인터페이스 기능으로 전환",
    ],
    context: "CRM 휴면 고객 알림 인터페이스 개발",
    detail: {
      architecture: [
        "CRM 화면에서 휴면 고객 대상 데이터를 조회하고 알림 발송 요청을 생성",
        "Spring API에서 카카오톡 API와 연동해 알림 발송 흐름을 자동화",
        "동적 쿼리와 복합 인덱스로 상담 화면 조회 응답을 개선",
      ],
      role: [
        "휴면 고객 알림 인터페이스 개발",
        "외부 알림 API 연동과 예외 처리 구현",
        "CRM 조회 쿼리와 인덱스 최적화",
      ],
    },
    icon: MessageSquare,
    impact: [
      "휴면 고객 알림을 수동 5분에서 즉시 처리되는 자동 흐름으로 전환",
      "조회 쿼리와 인덱스를 정리해 CRM 응답을 2,000ms에서 800ms로 단축",
      "반복 발송 작업을 API 연동으로 표준화",
    ],
    period: "2023.01 - 2023.07",
    problem: "휴면 고객 알림을 사람이 수동으로 발송하고, CRM 화면 조회 속도도 느려 상담 업무 효율이 떨어졌습니다.",
    section: "career",
    slug: "crm-customer-notification",
    stack: [
      "Java",
      "Spring",
      "MyBatis",
      "MySQL",
      "Linux",
      "Nexacro",
      "Kakao API",
      "Git",
    ],
    summary: "휴면 고객 알림을 수동 5분에서 즉시 처리로 전환하고 CRM 조회 응답을 2,000ms에서 800ms로 단축했습니다.",
    tone: "mint",
    type: "CRM Automation",
    year: "2023",
  },
  {
    approach: [
      "DB2 기반 데이터를 MS-SQL 스키마로 전환",
      "테이블과 Stored Procedure 이관 범위를 정리해 단계적으로 변환",
      "이관 후 업무 기능 검증을 통해 운영 전환 리스크 축소",
    ],
    context: "DB2에서 MS-SQL로 데이터베이스 전환",
    detail: {
      architecture: [
        "기존 DB2 테이블과 프로시저 구조를 분석해 MS-SQL 대상 구조로 매핑",
        "테이블 데이터와 Stored Procedure를 전환 단위별로 분리",
        "전환 결과는 주요 업무 기능 기준으로 검증해 운영 반영 가능성을 확인",
      ],
      role: [
        "DB2 구조 분석과 MS-SQL 매핑",
        "테이블과 Stored Procedure 전환 작업",
        "이관 데이터 검증과 운영 반영 지원",
      ],
    },
    icon: Database,
    impact: [
      "400개 규모의 테이블과 Stored Procedure를 검증 가능한 단위로 전환",
      "DB 라이선스 비용 절감과 유지보수 용이성 확보",
      "MS-SQL 기반 운영 환경으로 시스템 현대화",
    ],
    period: "2021.10 - 2022.12",
    problem: "DB2 기반 시스템은 라이선스와 유지보수 부담이 커서 MS-SQL 환경으로 안정적인 데이터 전환이 필요했습니다.",
    section: "career",
    slug: "database-platform-migration",
    stack: [
      "DB2",
      "MS-SQL",
      "Stored Procedure",
      "SQL",
      "Data Migration",
    ],
    summary: "DB2 기반 400개 규모의 테이블·Stored Procedure를 MS-SQL로 전환해 운영 비용과 유지보수 부담을 줄였습니다.",
    tone: "violet",
    type: "Data Migration",
    year: "2022",
  },
  {
    approach: [
      "반복 장애 패턴을 분석해 백오피스 운영 안정화",
      "계층 분리, 인덱스 최적화, 서브쿼리 제거로 조회 성능 개선",
      "Cron 직접 호출 배치를 Spring Batch Chunk 전략으로 전환",
    ],
    context: "영업정보시스템 백오피스 운영과 성능 개선",
    detail: {
      architecture: [
        "Nexacro와 JSP 기반 백오피스 화면에서 Spring API로 업무 데이터를 처리",
        "비즈니스 로직과 데이터 처리 흐름을 분리해 변경 영향 범위를 축소",
        "대량 데이터 처리는 Spring Batch로 전환해 실패 복구와 재시작을 지원",
      ],
      role: [
        "백오피스 운영 기능 유지보수",
        "장애 원인 분석과 조회 API 성능 개선",
        "Spring Batch 기반 배치 안정화",
      ],
    },
    icon: ServerCog,
    impact: [
      "반복 장애를 월 8건에서 2건으로 감소",
      "쿼리와 인덱스를 정리해 주요 조회 API를 4,000ms에서 1,000ms로 단축",
      "Chunk 기반 재시작으로 배치 복구 시간을 1시간에서 5분으로 단축",
    ],
    period: "2022.02 - 2023.07",
    problem: "백오피스 운영 중 반복 장애와 느린 조회 API, 실패 시 재시작이 어려운 배치 구조가 운영 부담을 키웠습니다.",
    section: "career",
    slug: "backoffice-reliability-improvement",
    stack: [
      "Java",
      "Spring",
      "MyBatis",
      "MySQL",
      "Linux",
      "Nexacro",
      "JSP",
      "Spring Batch",
    ],
    summary: "월 장애를 8건에서 2건으로 줄이고 조회 API를 4,000ms에서 1,000ms, 배치 복구를 1시간에서 5분으로 단축했습니다.",
    tone: "blue",
    type: "Backoffice Operation",
    year: "2022",
  },
] satisfies Project[];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
