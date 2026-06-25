# Architecture Decision Records

기준 문서:

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `plans/automated-blog-publishing-plan.md`

## 철학

H-Log는 화려한 마케팅 사이트보다 신뢰 가능한 백엔드 개발자 기록에 가깝게 만든다. 개인 사이트 표면은 단순하게 유지하되, 블로그 본선은 DB 기반 수동 발행부터 시작해 worker, 발행 job, 품질 게이트, 자동 글 생성으로 확장한다.

---

### ADR-001: Next.js App Router와 TypeScript를 사용한다

**결정**: H-Log 앱은 Next.js App Router, React, TypeScript를 기본 stack으로 유지한다.

**이유**: 현재 앱 구조와 맞고, 정적/서버 렌더링, metadata, sitemap, route handler를 한 프로젝트 안에서 관리하기 쉽다.

**트레이드오프**: 백엔드 worker나 DB job이 커지면 Next.js만으로는 부족할 수 있다. 그 경우 별도 worker package 또는 서비스 분리를 새 ADR로 결정한다.

### ADR-002: 블로그 본선은 DB 기반 수동 발행으로 전환한다

**결정**: 블로그 public route의 장기 source of truth는 PostgreSQL 기반 `posts`와 `post_versions`다. 기존 Markdown/MDX loader는 import, fixture, 전환 지원 용도로만 둔다.

**이유**: 수정된 `plans/automated-blog-publishing-plan.md`가 `Content: DB + generated Markdown/HTML`, `PostgreSQL + pgvector 필수`, 자동화 중심 방향을 명시한다. 자동 글 생성보다 먼저 published-only public boundary와 version/hash 모델이 안정돼야 한다.

**트레이드오프**: file-based MVP보다 초기 구현량이 늘어난다. 대신 이후 검색, 관련 글, `.md` endpoint, sitemap/feed/llms, 발행 검증, 정정/rollback을 같은 모델 위에서 처리할 수 있다.

### ADR-003: 자동 블로그 플랫폼 전환은 별도 phase로 둔다

**결정**: 완전 자동 글 생성/발행은 DB 기반 수동 발행과 발행 후 자동화 이후 phase로 분리한다. 자동화의 첫 단위는 글 생성이 아니라 DB 기반 수동 발행이다.

**이유**: 자동 글 생성부터 시작하면 렌더링, 상태 전이, 공개 검증, 롤백, 출처 저장 정책이 뒤섞인다.

**트레이드오프**: 자동화 완성까지 단계가 늘어난다. 대신 공개 URL과 데이터 모델이 먼저 안정된다.

### ADR-004: 방문자 챗봇은 만들지 않는다

**결정**: 검색, 관련 글 추천, 임베딩은 내부 발행/탐색 품질을 위해 사용하되 방문자 RAG 챗봇 UI는 만들지 않는다.

**이유**: 사용자 요구와 맞지 않고, 세션/개인화/프롬프트 보안/운영비가 추가된다.

**트레이드오프**: 방문자가 자연어로 사이트를 질의하는 UX는 제공하지 않는다. 대신 블로그 검색과 관련 글 품질을 높인다.

### ADR-005: 자동 글은 홍백님의 기술 맥락에 매핑된 기록이어야 한다

**결정**: 글 생성 전 `personal_context_ledger`와 apply-to-me 단계를 통과해야 한다.

**이유**: 이 블로그의 주체는 AI가 아니라 손홍백이다. 단순 IT 뉴스 요약은 개인 기술 블로그의 신뢰를 떨어뜨린다.

**트레이드오프**: 발행 가능한 후보가 줄어든다. 좋은 후보가 없으면 발행하지 않는 것을 정상 동작으로 본다.

### ADR-006: "해봤다" 표현은 증거가 있을 때만 쓴다

**결정**: 실험형 글은 명령, 코드, 설정, 로그, API 호출, 로컬 재현, 비용 계산 같은 증거를 `post_generation_runs` 또는 research pack에 남긴 경우에만 허용한다.

**이유**: 자동 글이 실제 경험처럼 보이는 것은 가장 큰 신뢰 리스크다.

**트레이드오프**: 일부 글은 "대입해봤다", "문서를 기준으로 판단했다" 모드로 낮춰 발행한다.

### ADR-007: Harness + TDD를 개발 기본값으로 둔다

**결정**: 기능 구현, bugfix, behavior change는 Harness step과 TDD cycle로 진행한다.

**이유**: 블로그 플랫폼 전환은 콘텐츠, SEO, DB, worker, 발행 상태가 얽히므로 작은 단위의 실패 테스트와 검증 기록이 필요하다.

**트레이드오프**: 초기 속도는 느리지만, 단계별 완료 기준과 롤백 지점이 명확해진다.

### ADR-008: 배포 기본값은 OCI Docker Compose + Nginx다

**결정**: 현재 deploy target은 OCI server, Docker Compose, Nginx reverse proxy다.

**이유**: 개인 사이트 운영 비용과 통제 범위에 맞고, 기존 계획과 일치한다.

**트레이드오프**: Vercel 같은 managed platform보다 서버/보안/백업/로그 운영 책임이 커진다.

## 공식/내부 기준

- Next.js docs
- React docs
- TypeScript docs
- Tailwind CSS docs
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `plans/automated-blog-publishing-plan.md`
