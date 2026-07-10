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

### ADR-008: 배포 기본값은 OCI Compute + Docker Compose + Nginx다

**결정**: 현재 deploy target은 OCI Compute 기반 self-hosted runtime이다. Docker Compose로 `web`, `worker`, `postgresql+pgvector`, `redis`, `nginx`를 관리하고, Nginx가 80/443 TLS 종료와 reverse proxy를 담당한다.

**이유**: 개인 사이트 운영 비용과 통제 범위에 맞고, 기존 계획과 일치한다.

**트레이드오프**: Vercel, Neon, Supabase 같은 managed platform보다 서버 보안, DB 백업, 볼륨 관리, 로그, 장애 대응 책임이 커진다. 대신 DB/worker/검색/발행 job을 한 운영 경계에서 통제할 수 있다.

**운영 경계**:

- public ingress는 Nginx 80/443으로 제한한다.
- PostgreSQL과 Redis는 private compose network에만 둔다.
- 로컬 검증도 같은 Compose service boundary를 사용하되, 로컬 public ingress는 `localhost:8080 -> hlog-nginx -> hlog-web`으로 둔다.
- `deploy/env.dev`는 placeholder-only local development 값만 담고, 운영 secret은 서버 로컬 파일 또는 CI/CD secret으로만 주입한다.
- SSH, 서버 IP, DB password, API key는 저장소에 기록하지 않는다.
- Nginx는 고정 upstream인 `hlog-web:3000`으로만 proxy하고 request `Host` 값을 그대로 전달하지 않는다.
- client IP가 필요한 앱 로직은 Nginx가 설정한 `X-Real-IP`를 신뢰하고, client가 조작할 수 있는 `X-Forwarded-For` chain을 직접 신뢰하지 않는다.
- 기본 public route에서는 `Upgrade`/`Connection` header를 upstream으로 전달하지 않는다. WebSocket 같은 장기 연결이 필요하면 별도 route와 ADR로 결정한다.
- DB 백업은 PostgreSQL logical dump부터 시작하고, 복구 완료 기준은 local/test DB restore rehearsal, `vector` extension, migration version, `content_hash`, public smoke 확인으로 둔다.
- backup/restore runbook은 `apps/h-log/.codex/docs/backup-restore-runbook.md`에 둔다. 운영 dump, Object Storage credential, bucket URL, server IP, DB password는 저장소에 남기지 않는다.
- deploy smoke/rollback runbook은 `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`에 둔다. 실제 OCI deploy, compose restart, rollback은 사용자 승인 후에만 수행하고, 이전 image tag, server-local env, migration rollback 가능 여부를 기준으로 판단한다.
- OCI Object Storage 장기 보관은 선택 단계로 두고, credential 주입 방식은 저장소 밖 server-local secret 또는 CI/CD secret으로만 결정한다.
- managed DB/runtime 전환은 새 ADR 없이는 하지 않는다.

### ADR-009: 공개 블로그 상세는 저장 HTML을 직접 주입하지 않는다

**결정**: `post_versions.content_html`은 generated artifact와 `content_hash` 검증 경계로 유지하되, `/blog/[slug]` 상세 페이지는 저장 HTML을 `dangerouslySetInnerHTML`로 렌더링하지 않는다. 공개 렌더링은 `content_markdown`에서 만든 typed content block을 React 요소로 출력한다.

**이유**: 저장 또는 생성된 HTML은 XSS sink가 되기 쉽다. Markdown을 canonical input으로 두고 React의 escaping을 사용하면 DB-backed 발행 모델을 유지하면서 공개 렌더링의 공격 표면을 줄일 수 있다.

**트레이드오프**: 현재 공개 렌더러는 heading, paragraph, strong, fenced code block 중심의 좁은 Markdown 표면만 지원한다. 링크, 리스트, 표, 이미지 같은 richer Markdown은 허용 목록과 테스트를 먼저 추가한 뒤 확장한다.

### ADR-010: contract 완료와 runtime 완료를 분리한다

**결정**: 순수 TypeScript contract와 테스트가 완료된 phase는 contract baseline으로 기록한다. 실제 PostgreSQL schema/migration, DB repository, persistent worker, provider/scheduler activation이 없는 상태를 production runtime 완료로 표현하지 않는다. 다이어그램 삽입 계약 다음에 `blog-runtime-integration`을 실행하고, 운영 안정화와 승인된 canary 이후에만 feedback/persona learning으로 이동한다.

**이유**: 현재 코드에는 상태 전이, 검색, 발행 검증, 자동 글 생성, diagram asset 계약이 있지만 production dependency에는 PostgreSQL driver가 없고 worker는 placeholder다. 계약이 충분하다는 이유로 성과 학습을 먼저 진행하면 실제 데이터와 실패 신호가 없는 상태에서 최적화 계약만 늘어난다.

**트레이드오프**: phase가 하나 늘고 production 자동 발행까지 시간이 더 필요하다. 대신 완료 상태가 실제 운영 준비도를 과장하지 않고, local DB vertical slice와 production activation 승인 경계가 명확해진다.

**운영 경계**:

- 첫 runtime integration은 local Compose와 fake/disabled provider만 사용한다.
- PostgreSQL query/migration 도구는 Step 0에서 현재 쿼리에 필요한 최소 방식으로 결정하며, ORM을 선행 도입하지 않는다.
- actual provider credential, scheduler, OCI compose 변경, public publish는 `auto-publish-ops-hardening`의 승인 단계 전까지 활성화하지 않는다.

## 공식/내부 기준

- Next.js docs
- React docs
- TypeScript docs
- Tailwind CSS docs
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `plans/automated-blog-publishing-plan.md`
