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
  company: string;
  context: string;
  detail: {
    architecture: string[];
    decisions: string[];
    role: string[];
  };
  icon: LucideIcon;
  impact: string[];
  metrics: {
    label: string;
    value: string;
  }[];
  period: string;
  problem: string;
  slug: string;
  stack: string[];
  summary: string;
  title: string;
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
      "OpenAPI Spec-First 기반 API 개발 흐름 정리",
      "GitHub Issues Webhook과 Discord 연동으로 이슈 알림·조회 자동화",
      "Spring Event, Redisson Queue, DLQ로 비동기 처리와 복구 흐름 분리",
    ],
    company: "오프너드",
    context: "B2B 솔루션 백엔드 개발과 운영 자동화 기반 구축",
    detail: {
      architecture: [
        "Client와 운영 도구에서 발생하는 이벤트를 API 계층에서 수신",
        "도메인 트랜잭션과 후속 처리를 분리해 장애 영향 범위를 축소",
        "Webhook 수신, 서명 검증, Discord 알림을 독립 흐름으로 구성",
      ],
      decisions: [
        "외부 이벤트는 신뢰 경계를 분명히 두고 서명 검증 후 내부 처리로 연결",
        "알림 실패가 핵심 트랜잭션에 영향을 주지 않도록 후속 작업을 비동기화",
        "운영자가 필요한 이슈 상태를 Discord에서 빠르게 확인하도록 조회 흐름 구성",
      ],
      role: [
        "API 계약 정의와 서버 구현",
        "비동기 이벤트 처리 구조 설계",
        "운영 알림 자동화와 장애 분석 흐름 정리",
      ],
    },
    icon: BellRing,
    impact: [
      "반복 확인 작업을 알림과 조회 흐름으로 전환",
      "트랜잭션 이후 처리 실패를 격리",
      "운영 이슈 대응 시작 시간을 단축",
    ],
    metrics: [
      { label: "Automation", value: "Issue Bot" },
      { label: "Reliability", value: "DLQ" },
      { label: "Observability", value: "Trace" },
    ],
    period: "2025.03 - 현재",
    problem: "이슈 확인, 후속 알림, 비동기 처리 흐름이 사람의 수동 확인에 의존해 운영 대응이 느려질 수 있었습니다.",
    slug: "opnerd-workflow-automation",
    stack: [
      "Java 21",
      "Spring Boot 3.x",
      "PostgreSQL",
      "Redis",
      "Redisson",
      "OpenTelemetry",
      "GitHub Webhook",
      "Discord",
    ],
    summary: "Webhook, 이슈 알림, 비동기 처리, 관측성을 연결해 운영자가 바로 확인할 수 있는 백엔드 흐름을 설계했습니다.",
    title: "운영 자동화와 백엔드 이벤트 처리",
    tone: "cyan",
    type: "Backend Automation",
    year: "2025",
  },
  {
    approach: [
      "Redis Cache-Aside 패턴으로 피크 시간대 조회 응답 경로 단축",
      "Kafka 비동기 메시징으로 결제 완료와 알림 처리 분리",
      "Spring Batch Chunk 처리와 비관적 락으로 대량 처리 안정화",
    ],
    company: "아스템즈",
    context: "영화관 POS/KIOSK 차세대 시스템 개발",
    detail: {
      architecture: [
        "티켓·차량 조회 요청은 Spring Boot API와 MyBatis 조회 계층에서 처리",
        "조회 빈도가 높은 데이터는 Redis Cache-Aside 방식으로 DB 접근을 축소",
        "결제 후 알림과 대량 차량 데이터 처리는 Kafka와 Batch 흐름으로 분리",
      ],
      decisions: [
        "피크 시간대 병목은 캐시 적용으로 먼저 줄이고 DB 직접 조회를 최소화",
        "결제 응답 지연을 줄이기 위해 알림 처리를 동기 흐름에서 분리",
        "Race Condition 가능 구간은 Pessimistic Lock과 READ_COMMITTED로 정합성 보장",
      ],
      role: [
        "POS/KIOSK 백엔드 기능 개발",
        "Redis 캐시와 Kafka 기반 비동기 처리 적용",
        "대량 배치 처리와 동시성 제어 구간 개선",
      ],
    },
    icon: Clapperboard,
    impact: [
      "티켓·차량 조회 응답시간 3,000ms에서 900ms로 단축",
      "결제 API 응답시간 2,000ms에서 500ms로 개선",
      "10만 건 배치 처리 시간을 40분에서 15분으로 단축",
    ],
    metrics: [
      { label: "Query", value: "70%" },
      { label: "Payment", value: "500ms" },
      { label: "Batch", value: "15분" },
    ],
    period: "2024.07 - 2025.01",
    problem: "피크 시간대 조회 폭증, 결제 후 알림 지연, 대량 차량 데이터 처리로 POS/KIOSK 응답성과 안정성이 흔들릴 수 있었습니다.",
    slug: "cgv-pos-kiosk-nextgen",
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
    summary: "조회 캐시, 결제 알림 비동기화, 배치 처리 안정화를 통해 피크 시간대 POS/KIOSK 응답성을 개선했습니다.",
    title: "CGV POS/KIOSK 차세대 프로젝트",
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
    company: "아스템즈",
    context: "영업정보 시스템 신규 구축과 레거시 전환",
    detail: {
      architecture: [
        "기존 PHP 기반 업무 기능을 Spring Boot API와 JSP 화면 흐름으로 재구성",
        "영업 데이터 조회는 MyBatis 매핑과 Lazy Loading을 활용해 쿼리 수를 절감",
        "복합 조건 검색은 Oracle 인덱스 설계와 쿼리 튜닝으로 응답 경로 최적화",
      ],
      decisions: [
        "기능 이관 범위를 나눠 운영 리스크를 줄이면서 Spring Boot 구조로 전환",
        "연관 데이터 조회는 필요한 시점에 가져오도록 조정해 불필요한 쿼리 제거",
        "영업팀이 자주 사용하는 조건을 기준으로 복합 인덱스를 설계",
      ],
      role: [
        "Spring Boot 기반 영업정보 기능 개발",
        "MyBatis 조회 구조와 쿼리 성능 개선",
        "Jenkins 기반 배포 흐름과 운영 반영 지원",
      ],
    },
    icon: BarChart3,
    impact: [
      "동일 기능 개발 소요 시간을 평균 2주에서 5일로 단축",
      "DB 쿼리 수 70% 감소와 API 응답시간 2,000ms에서 600ms로 개선",
      "주요 검색 쿼리 실행시간 3,000ms에서 500ms로 단축",
    ],
    metrics: [
      { label: "Delivery", value: "5일" },
      { label: "Query", value: "70%" },
      { label: "Search", value: "500ms" },
    ],
    period: "2023.09 - 2024.06",
    problem: "PHP 레거시 시스템의 유지보수 비용이 커지고, 연관 데이터 조회와 복합 조건 검색에서 응답 지연이 발생했습니다.",
    slug: "naracellar-sales-system",
    stack: [
      "Java",
      "Spring Boot",
      "MyBatis",
      "Oracle",
      "Jenkins",
      "JSP",
      "Git",
    ],
    summary: "PHP 레거시 업무 기능을 Spring Boot 기반으로 전환하고 조회 병목을 줄여 영업 데이터 활용 속도를 개선했습니다.",
    title: "나라셀라 영업정보 시스템",
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
    company: "아스템즈",
    context: "CRM 휴면 고객 알림 인터페이스 개발",
    detail: {
      architecture: [
        "CRM 화면에서 휴면 고객 대상 데이터를 조회하고 알림 발송 요청을 생성",
        "Spring API에서 카카오톡 API와 연동해 알림 발송 흐름을 자동화",
        "동적 쿼리와 복합 인덱스로 상담 화면 조회 응답을 개선",
      ],
      decisions: [
        "수동 발송 작업을 API 연동으로 전환해 운영자의 반복 작업을 제거",
        "조건이 자주 바뀌는 CRM 조회는 MyBatis 동적 쿼리로 대응",
        "상담원이 체감하는 화면 로딩 속도를 우선 개선 대상으로 설정",
      ],
      role: [
        "휴면 고객 알림 인터페이스 개발",
        "외부 알림 API 연동과 예외 처리 구현",
        "CRM 조회 쿼리와 인덱스 최적화",
      ],
    },
    icon: MessageSquare,
    impact: [
      "건당 5분 걸리던 수동 발송을 즉시 처리 흐름으로 전환",
      "CRM 조회 응답시간 2,000ms에서 800ms로 개선",
      "알림 적시성 향상과 운영 인력 부담 감소",
    ],
    metrics: [
      { label: "Alert", value: "즉시" },
      { label: "Query", value: "800ms" },
      { label: "Ops", value: "자동화" },
    ],
    period: "2023.01 - 2023.07",
    problem: "휴면 고객 알림을 사람이 수동으로 발송하고, CRM 화면 조회 속도도 느려 상담 업무 효율이 떨어졌습니다.",
    slug: "tonymoly-crm-dormant-customer",
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
    summary: "휴면 고객 알림을 자동화하고 CRM 조회 성능을 개선해 반복 운영 작업과 상담 화면 대기 시간을 줄였습니다.",
    title: "토니모리 CRM 휴면 고객 인터페이스",
    tone: "mint",
    type: "CRM Automation",
    year: "2023",
  },
  {
    approach: [
      "DB2 기반 데이터를 MS-SQL 스키마로 전환",
      "400개 테이블과 Stored Procedure 이관 범위를 정리해 단계적으로 변환",
      "이관 후 업무 기능 검증을 통해 운영 전환 리스크 축소",
    ],
    company: "아스템즈",
    context: "DB2에서 MS-SQL로 데이터베이스 전환",
    detail: {
      architecture: [
        "기존 DB2 테이블과 프로시저 구조를 분석해 MS-SQL 대상 구조로 매핑",
        "테이블 데이터와 Stored Procedure를 전환 단위별로 분리",
        "전환 결과는 주요 업무 기능 기준으로 검증해 운영 반영 가능성을 확인",
      ],
      decisions: [
        "스키마와 프로시저를 한 번에 처리하지 않고 검증 가능한 단위로 분리",
        "업무 영향이 큰 테이블부터 이관 정확도를 우선 확인",
        "운영 전환 후 유지보수 인력 확보가 쉬운 MS-SQL 생태계로 정리",
      ],
      role: [
        "DB2 구조 분석과 MS-SQL 매핑",
        "테이블과 Stored Procedure 전환 작업",
        "이관 데이터 검증과 운영 반영 지원",
      ],
    },
    icon: Database,
    impact: [
      "400개 테이블과 Stored Procedure 전환 완료",
      "DB 라이선스 비용 절감과 유지보수 용이성 확보",
      "MS-SQL 기반 운영 환경으로 시스템 현대화",
    ],
    metrics: [
      { label: "Tables", value: "400개" },
      { label: "Target", value: "MS-SQL" },
      { label: "Scope", value: "SP" },
    ],
    period: "2021.10 - 2022.12",
    problem: "DB2 기반 시스템은 라이선스와 유지보수 부담이 커서 MS-SQL 환경으로 안정적인 데이터 전환이 필요했습니다.",
    slug: "gala-data-migration",
    stack: [
      "DB2",
      "MS-SQL",
      "Stored Procedure",
      "SQL",
      "Data Migration",
    ],
    summary: "DB2 기반 테이블과 프로시저를 MS-SQL 환경으로 전환해 운영 비용과 유지보수 부담을 줄였습니다.",
    title: "갈라 인터내셔널 데이터 마이그레이션",
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
    company: "아스템즈",
    context: "영업정보시스템 백오피스 운영과 성능 개선",
    detail: {
      architecture: [
        "Nexacro와 JSP 기반 백오피스 화면에서 Spring API로 업무 데이터를 처리",
        "비즈니스 로직과 데이터 처리 흐름을 분리해 변경 영향 범위를 축소",
        "대량 데이터 처리는 Spring Batch로 전환해 실패 복구와 재시작을 지원",
      ],
      decisions: [
        "장애 빈도가 높은 패턴부터 원인을 분류하고 재발 방지 작업을 적용",
        "혼재된 로직은 계층을 나누고 쿼리는 인덱스와 서브쿼리 제거로 단순화",
        "직접 호출 배치는 실패 지점 재처리가 가능한 Chunk 기반으로 전환",
      ],
      role: [
        "백오피스 운영 기능 유지보수",
        "장애 원인 분석과 조회 API 성능 개선",
        "Spring Batch 기반 배치 안정화",
      ],
    },
    icon: ServerCog,
    impact: [
      "월평균 장애 건수를 8건에서 2건으로 감소",
      "주요 조회 API 응답시간 4,000ms에서 1,000ms로 개선",
      "배치 장애 복구 시간을 1시간에서 5분으로 단축",
    ],
    metrics: [
      { label: "Incident", value: "2건" },
      { label: "API", value: "1,000ms" },
      { label: "Recovery", value: "5분" },
    ],
    period: "2022.02 - 2023.07",
    problem: "백오피스 운영 중 반복 장애와 느린 조회 API, 실패 시 재시작이 어려운 배치 구조가 운영 부담을 키웠습니다.",
    slug: "tonymoly-backoffice-operation",
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
    summary: "백오피스 장애 패턴을 줄이고 조회 API와 배치 복구 흐름을 개선해 운영 안정성을 높였습니다.",
    title: "토니모리 영업정보시스템 백오피스 운영",
    tone: "blue",
    type: "Backoffice Operation",
    year: "2022",
  },
] satisfies Project[];

export const portfolioStats = [
  { label: "Years", value: "5+" },
  { label: "Projects", value: `${projects.length}` },
  { label: "Tech Stack", value: "30+" },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
