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

**결정**: 블로그 public route의 source of truth는 PostgreSQL 기반 `posts`와 `post_versions`다. 기존 Markdown/MDX loader는 live import/transition consumer가 없어 `runtime-contract-pruning / Step 0`에서 제거했다. 기존 콘텐츠는 보존하며 새 import workflow는 실제 요구가 생기면 별도로 설계한다.

현재 관리자 runtime 계약은 PostgreSQL repository가 호출하는 retract와 같은 transaction의 `admin_actions` 감사 기록만 유지한다. live caller가 없는 preview, draft, publish, correction, unpublish, generic operational action은 `runtime-contract-pruning / Step 3`에서 제거했으며, 인증된 관리자 caller가 생기면 필요한 명령만 다시 설계한다.

**이유**: 수정된 `plans/automated-blog-publishing-plan.md`가 `Content: DB + generated Markdown/HTML`, `PostgreSQL + pgvector 필수`, 자동화 중심 방향을 명시한다. 자동 글 생성보다 먼저 published-only public boundary와 version/hash 모델이 안정돼야 한다.

**트레이드오프**: file-based MVP보다 초기 구현량이 늘어난다. 대신 이후 검색, 관련 글, `.md` endpoint, sitemap/feed/llms, 발행 검증, 정정/rollback을 같은 모델 위에서 처리할 수 있다.

### ADR-003: 자동 블로그 플랫폼 전환은 별도 phase로 둔다

**결정**: 완전 자동 글 생성/발행은 DB 기반 수동 발행과 발행 후 자동화 이후 phase로 분리한다. 자동화의 첫 단위는 글 생성이 아니라 DB 기반 수동 발행이다.

**이유**: 자동 글 생성부터 시작하면 렌더링, 상태 전이, 공개 검증, 롤백, 출처 저장 정책이 뒤섞인다.

**트레이드오프**: 자동화 완성까지 단계가 늘어난다. 대신 공개 URL과 데이터 모델이 먼저 안정된다.

### ADR-004: 방문자 챗봇은 만들지 않는다

**결정**: 검색, 관련 글 추천, 임베딩은 내부 발행/탐색 품질을 위해 사용하되 방문자 RAG 챗봇 UI는 만들지 않는다. 실제 embedding provider가 없는 현재 public search route는 keyword-only fallback을 사용하고, fake provider 호출이나 usage 기록을 만들지 않는다.

**이유**: 사용자 요구와 맞지 않고, 세션/개인화/프롬프트 보안/운영비가 추가된다.

**트레이드오프**: 방문자가 자연어로 사이트를 질의하는 UX는 제공하지 않는다. 대신 블로그 검색과 관련 글 품질을 높인다.

### ADR-005: 자동 글은 홍백님의 기술 맥락에 매핑된 기록이어야 한다

**결정**: 글 생성 전 `personal_context_ledger`와 apply-to-me 단계를 통과해야 한다.

**이유**: 이 블로그의 주체는 AI가 아니라 손홍백이다. 단순 IT 뉴스 요약은 개인 기술 블로그의 신뢰를 떨어뜨린다.

**트레이드오프**: 발행 가능한 후보가 줄어든다. 좋은 후보가 없으면 발행하지 않는 것을 정상 동작으로 본다.

### ADR-006: "해봤다" 표현은 증거가 있을 때만 쓴다

**결정**: 실험형 글은 명령, 코드, 설정, 로그, API 호출, 로컬 재현, 비용 계산 같은 evidence path를 writer output과 research pack에 남긴 경우에만 허용한다. `post_generation_runs`는 migration과 persistence가 생기기 전까지 장기 target이다.

**이유**: 자동 글이 실제 경험처럼 보이는 것은 가장 큰 신뢰 리스크다.

**트레이드오프**: 일부 글은 "대입해봤다", "문서를 기준으로 판단했다" 모드로 낮춰 발행한다.

### ADR-007: Harness + TDD를 개발 기본값으로 둔다

**결정**: 기능 구현, bugfix, behavior change는 Harness step과 TDD cycle로 진행한다.

**이유**: 블로그 플랫폼 전환은 콘텐츠, SEO, DB, worker, 발행 상태가 얽히므로 작은 단위의 실패 테스트와 검증 기록이 필요하다.

**트레이드오프**: 초기 속도는 느리지만, 단계별 완료 기준과 롤백 지점이 명확해진다.

### ADR-008: 배포 기본값은 OCI Compute + Docker Compose + Nginx다

**결정**: 현재 deploy target은 OCI Compute 기반 self-hosted runtime이다. Docker Compose로 `web`, `worker`, `postgresql+pgvector`, `nginx`를 관리하고, Nginx가 80/443 TLS 종료와 reverse proxy를 담당한다.

**이유**: 개인 사이트 운영 비용과 통제 범위에 맞고, 기존 계획과 일치한다.

**트레이드오프**: Vercel, Neon, Supabase 같은 managed platform보다 서버 보안, DB 백업, 볼륨 관리, 로그, 장애 대응 책임이 커진다. 대신 DB/worker/검색/발행 job을 한 운영 경계에서 통제할 수 있다.

**운영 경계**:

- public ingress는 Nginx 80/443으로 제한한다.
- PostgreSQL은 private compose network에만 둔다.
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

**트레이드오프**: 현재 공개 렌더러는 heading, paragraph, strong, inline code, safe inline link, code block, 순서/비순서 목록과 인용문을 지원한다. 표, 이미지 같은 richer Markdown은 허용 목록과 테스트를 먼저 추가한 뒤 확장한다.

2026-10-01 `blog-reading-foundation / Step 0`은 공개 block reader에서 fenced code 경계를 먼저 구분한다. 코드 내부 빈 줄과 literal Markdown/HTML은 React text로 유지한다. 저장된 HTML 생성 알고리즘과 content hash, Markdown endpoint는 변경하지 않는다. 이 단계는 전체 CommonMark 지원을 의미하지 않으며 링크·목록·표는 후속 step에서 별도로 확장한다.

2026-10-01 `blog-reading-foundation / Step 1`은 [Marked inline lexer](https://marked.js.org/using_pro#lexer)를 `marked@18.0.14`로 고정해 재사용한다. 중첩 괄호·escape·code span 우선순위를 별도 정규식 파서로 확장하지 않고 lexer token을 text/code/strong/link 허용 노드로 변환한다. Marked의 HTML renderer는 사용하지 않는다. Strong과 link label은 재귀형 children을 사용하고 raw HTML·미지원 inline 문법은 React text로 남긴다. GFM 자동 링크는 비활성화하고 참조식 링크·HTML entity 해석은 이번 단계에 포함하지 않는다.

본문 목적지는 공개 HTTPS, 단일 `/`로 시작하는 사이트 경로, `#` fragment로 제한한다. 일반 상대 경로·protocol-relative URL·backslash·공백/제어 문자·위험한 scheme은 anchor로 출력하지 않는다. HTTPS는 `public-source-url.ts`의 URL 정규화와 private host 검사를 공유하며 privacy scanner와 일치하도록 `.internal`, `.corp`, `.lan`도 차단한다. 거부된 목적지는 label만 표시한다. HTTPS anchor는 `noopener noreferrer`, 새 창 안내, 외부 아이콘과 focus outline을 제공하고 내부 경로/fragment는 같은 창에서 이동한다. 저장 Markdown/HTML/hash와 published-current/privacy 경계는 그대로다.

2026-10-06 `blog-reading-foundation / Step 2`는 기존 Marked block lexer를 사용해 목록·인용문·문단·코드의 중첩 경계를 구분한다. 목록은 시작 번호와 항목별 block 배열, 인용문은 block children을 보유하고 React의 `ol`/`ul`/`li`/`blockquote`로 렌더링한다. Inline 부분은 Step 1의 검증과 허용 목록을 재사용하며 미지원 블록/참조식 링크는 text로 남긴다. Marked 18.0.14의 trailing-tab fence 종료 회귀 때문에 Step 0의 scanner만 [공식 tokenizer override](https://marked.js.org/using_pro#tokenizer)로 재사용한다. 자체 중첩 Markdown 문법이나 새 의존성은 추가하지 않는다. 저장 원문/hash와 최상위 verified diagram 삽입 경계는 유지한다.

### ADR-010: contract 완료와 runtime 완료를 분리한다

**결정**: 순수 TypeScript contract와 테스트가 완료된 phase는 contract baseline으로 기록한다. 실제 PostgreSQL schema/migration, DB repository, persistent worker, provider/scheduler activation이 없는 상태를 production runtime 완료로 표현하지 않는다. 다이어그램 삽입 계약 다음에 `blog-runtime-integration`을 실행한다. Feedback 이력의 persona, performance-signal, failure-pattern contract는 live caller/persistence가 없어 pruning Steps 4-6에서 제거했으며, 실제 신호 수집과 learning contract는 production HTTPS origin과 반복 schedule이 활성화된 뒤 runtime 요구에 맞춰 설계한다.

**이유**: PostgreSQL schema/repository/public read path, manual `--once` worker, fake-provider end-to-end dry-run과 production canary/rollback은 검증됐다. 반면 실제 신호도 caller도 persistence도 없는 feedback contract는 현재 runtime을 보호하지 못하고 유지보수 표면만 늘린다.

**트레이드오프**: feedback Steps 0-2는 완료 이력으로 남지만 현재 production module이 있다는 뜻은 아니다. 실제 collection/learning 계약은 HTTPS와 privacy/consent 경계가 정해질 때 다시 설계해야 한다.

**운영 경계**:

- 첫 runtime integration은 local Compose와 fake/disabled provider만 사용한다.
- PostgreSQL query/migration 도구는 Step 0에서 현재 쿼리에 필요한 최소 방식으로 결정하며, ORM을 선행 도입하지 않는다.
- actual provider credential, scheduler, OCI compose 변경, public publish는 `auto-publish-ops-hardening`의 승인 단계 전까지 활성화하지 않는다.

### ADR-011: 자동 글 LLM provider는 Hermes Codex OAuth로 제한한다

**결정**: 자동 글 writer는 Hermes one-shot을 `provider=openai-codex`, `model=gpt-5.6-sol`로 명시해 호출한다. OpenAI Platform API key는 사용하지 않는다. Hermes usage report가 요청한 provider/model과 일치하고 `cost_status=included`, `estimated_cost_usd=0`, `api_calls=1`일 때만 결과를 기존 article quality/privacy/usage gate로 전달한다.

**이유**: 현재 확인된 Hermes Codex OAuth 경로는 사용자의 Codex 구독 범위에서 동작하며 별도 API 사용료를 만들지 않는다. Provider 선택을 설정 기본값이나 fallback에 맡기지 않고 실행마다 고정하면 유료 API provider로 잘못 전환되는 경로를 fail closed 처리할 수 있다.

**트레이드오프**: 실행 host에 Hermes CLI와 유효한 OpenAI Codex OAuth 상태가 필요하고, 구독 한도나 OAuth 만료 시 생성이 중단된다. 자동 글 생성 중단은 글 공개 실패보다 안전하므로 API key fallback을 두지 않는다.

**운영 경계**:

- Node worker가 DB, 상태 전이, privacy/quality gate, publish, rollback을 계속 소유하고 Hermes는 검증된 입력을 구조화 article JSON으로 바꾸는 역할만 맡는다.
- Hermes는 `--safe-mode`와 도구 정의가 비어 있는 명시적 `context_engine` toolset으로 실행해 user config/rules/plugins/MCP와 web/other tool capability를 함께 차단한다. Writer prompt도 전달된 verified input만 사용하도록 제한한다.
- Hermes OAuth 상태와 실행 경로는 server-local runtime에만 두며 저장소, Compose placeholder env, CI log에 복사하지 않는다.
- production schedule은 `Asia/Seoul` 매일 09:00, publish 최대 1개, stage retry 최대 1회로 고정한다. 공식 Hermes image 기반 Compose service와 systemd timer는 packaging했지만, container-local OAuth와 OCI canary/rollback이 검증될 때까지 timer는 활성화하지 않는다.

### ADR-012: 생성 실행과 공개 worker를 PostgreSQL handoff로 분리한다

**결정**: Production daily run은 검증된 생성 결과를 `publishing` post, current version, sources, tags, queued required jobs로 먼저 저장하고 종료한다. 같은 process에서 required jobs를 성공 처리하거나 `published`로 전환하지 않는다. 공개 전이는 별도 persistent worker가 저장된 job을 처리한 뒤에만 수행한다.

**이유**: public route는 `status=published`인 current version만 노출한다. 생성 process가 persistence 전에 URL 검증과 공개 전이를 함께 수행하면 실제 DB/public read path를 검증할 수 없고, process 종료 시 생성 결과와 job 상태도 잃는다. 비공개 DB handoff를 먼저 만들면 scheduler 재시작과 worker lease 경계를 유지하면서 공개 side effect를 뒤로 미룰 수 있다.

**트레이드오프**: PostgreSQL/Hermes one-shot runner, required job adapter, bounded Compose/systemd scheduler, OCI container-local OAuth, server-local production credential/env/input, live migration과 bounded canary는 검증됐다. Server runner는 같은 서울 날짜의 advisory lock과 durable post 여부를 DB에서 먼저 확인하고, scheduler worker는 그 daily post의 required job만 처리하면서 publish 전 `render`/`privacy_scan`과 publish 후 public smoke를 분리한다. Public required 검증 실패 canary는 `correction_pending`으로 숨긴다. 실제 HTTPS public origin이 없으므로 반복 timer는 비활성으로 유지한다.

### ADR-013: 도메인 구매는 production collection cutover까지 미룬다

**결정**: 도메인 구매와 DNS/TLS 연결은 로컬 기능과 isolated synthetic fixture 검증의 선행 조건으로 두지 않는다. 실제 공개 HTTPS smoke, 성과 신호 수집 endpoint, 반복 production timer를 활성화하기 직전에 사용자에게 도메인이 필요하다고 알리고 cutover를 진행한다.

**이유**: 호출/지속성이 없던 persona, performance-signal, failure-pattern contract는 pruning Steps 4-6에서 제거했다. 실제 공개 트래픽을 받기 전에는 운영 signal이 생기지 않으므로 다음 collection/persona/timer 단계부터 HTTPS origin을 요구한다.

**트레이드오프**: 도메인 전환 전에는 실제 유입, 체류, 공유, 검색 클릭 데이터를 검증할 수 없다. 따라서 synthetic fixture를 실제 성과로 기록하지 않고 persona version도 변경하지 않는다.

**활성화 gate**:

- 사용자가 실제 HTTPS public origin을 정한다.
- DNS/TLS와 public 80/443 smoke를 확인한다.
- privacy 조직명/비공개 저장소 목록을 server-local secret에 설정한다.
- 그 뒤에만 signal collection과 09:00 KST timer를 활성화한다.

### ADR-014: 미연결 반복 생성 실패 contract는 제거한다

**결정**: live caller와 production persistence가 없는 failure-pattern registry contract를 `auto-publish-code-pruning / Step 6`에서 제거한다. 현재의 durable retry stop은 persistent worker가 계속 소유하며, generation-level 반복 실패 정책은 실제 provider/scheduler runtime 요구가 생길 때 다시 설계한다.

**이유**: standalone in-memory registry와 isolated test는 현재 daily pipeline, provider prompt, quality gate, DB schema 어디에도 연결되지 않아 runtime을 보호하지 못한다.

**트레이드오프**: 같은 일자·후보 실패 두 번에서 당일 발행을 중단하는 synthetic contract는 더 이상 현재 동작이 아니다. 대신 기존 worker retry limit, 동일 실패 retry stop, privacy scanner, quality gate failure 처리는 유지한다.

### ADR-015: 도메인 공개 기본값은 일반화된 콘텐츠와 dark-only `/portfolio`다

**결정**: 승인되지 않은 고객사명·회사명과 현재 회사 내부 흐름은 일반화하고, 상세 성과 수치는 근거 자료가 확인된 값만 공개한다. 공개 프로젝트 수는 실제 project data source에서 계산한다. 프로필 사진과 GitHub는 공개하되 이메일과 Contact form은 공개하지 않는다. 이력서 PDF는 전 페이지 개인정보 검수와 조직 식별자 일반화, `이력서` 명칭 통일을 마친 뒤 공개한다. 초기 theme은 dark-only이며 `/portfolio`를 canonical route로 사용하고 `/projects`는 308 영구 redirect로만 제공한다.

**이유**: 채용 담당자가 확인할 수 있는 사실과 공개 가능한 경력만 남기고, 조직 식별·개인정보·근거 없는 수치로 인한 신뢰 및 보안 리스크를 줄이기 위해서다. 현재 light theme과 별도 Contact form은 출시 품질에 비해 유지보수 범위가 크다.

**트레이드오프**: 일부 프로젝트 제목과 성과 표현의 구체성이 낮아지고 이메일 연락 경로가 없다. 대신 GitHub와 명확한 Portfolio/Resume 표면을 제공하고, 추가 공개는 근거 자료나 별도 승인이 생겼을 때만 확장한다.

**검수 기록**:

- 2026-07-27에 이력서 PDF 2페이지와 프로필 asset을 직접 확인했다.
- PDF의 공개 금지 정보는 발견되지 않았지만 조직 식별자 일반화 전까지 download는 보류한다.
- 2026-07-29 Step 5에서는 일반화된 안전한 교체 원본이 없어 기존 PDF와 download CTA/API를 제거했다. 새 PDF는 전 페이지 재검수와 조직 식별자 일반화, `이력서` 명칭 정렬을 모두 통과한 뒤에만 다시 공개한다.
- 이번 결정은 domain, DNS/TLS, OCI, signal collection, persona activation, production timer 변경을 승인하지 않는다.

### ADR-016: 클라우드 자원 관리는 Terraform으로 전환한다

**결정**: 앞으로 H-Log 클라우드 자원 변경은 Terraform plan 검토와 승인된 apply로 진행한다. 기존 OCI 자원은 소유권과 provider import 지원을 확인한 뒤 편입하며, 재생성을 전제로 코드를 만들지 않는다. 공유 자원은 소유권 합의 전까지 data source로만 참조한다. Compose/Nginx/systemd 배포, DB migration과 자동 발행 활성화는 Terraform에 묶지 않는다.

**이유**: OCI 공식 provider는 기존 자원 discovery/import를 지원한다. 현재 단일 Compute + Compose 구조를 유지하면서 클라우드 변경 내역과 실제 자원의 차이를 plan으로 검토할 수 있다.

**상태/경계**: 2026-09-28 읽기 전용 inventory를 완료했다. 2026-09-29 사용자 진행 지시에 따라 공유 Compute와 연결 network/IP 8개를 `infra/terraform/oci-shared/`의 별도 root로 코드화했다. H-Log 앱 state와 backend bootstrap state는 분리하며, launch-owned boot volume/primary VNIC/private IP는 중복 관리하지 않는다. 고정 CLI/provider, lockfile과 credential 없는 CI 검증까지 완료했고 backend 생성/연결, import와 live plan/apply는 아직 미실행이다. 초기 편입은 자원 create/update/delete/replace 없이 끝나야 하며, import 후 일반 plan의 변경 없음까지 확인한다.

**State 정책**: OCI Object Storage의 native `oci` backend, state locking, bucket versioning을 기본안으로 둔다. Bucket/IAM bootstrap은 별도 승인과 별도 state 경계로 다룬다. 2026-09-30 `infra/terraform/oci-backend/`에 private/versioned bucket 1개 생성 구성과 private saved plan을 준비했다. Bootstrap은 private 영구 local state, shared root는 별도 remote state를 사용한다. 현재 관리자에게 중복 IAM policy를 추가하지 않으며 cloud apply/import는 아직 미실행이다. State, plan, 실제 tfvars, backend 설정과 credential은 공개 저장소나 CI log에 남기지 않는다. 세부 절차는 [배포 지침](../deployment-ci-cd.md#terraform-전환-계획)에 둔다.

**트레이드오프**: 기존 자원의 정확한 구성과 소유권을 조사해야 하며 state 접근·잠금·복구를 운영해야 한다. Terraform 자체는 DB backup이나 앱 배포 rollback을 대신하지 않는다.

### ADR-017: 자동 작성 연구 자료의 유효기간은 수집 후 24시간이다

**결정**: 공통 daily pipeline에서 기존 `researchPackSources[].fetchedAt`을 `runAt`과 비교해 `0 <= 경과 시간 <= 24시간`을 요구한다. 만료·미래·잘못된 시각은 usage/LLM/slug 조회/저장 전에 실패시키고 오류에는 배열 위치와 필드명만 남긴다. 새 schema나 환경 설정은 추가하지 않는다.

**이유**: 매일 실행되는 생성기가 이전 입력 파일을 재사용해 오래된 조사 결과로 글을 만들지 않도록 한다. 기존 수집 시각을 재사용하면 모든 daily pipeline 호출 경로에 같은 기준을 적용할 수 있다.

**트레이드오프**: 오래된 입력은 자료를 다시 수집/확인한 뒤 갱신해야 한다. Timestamp만 현재로 바꾸는 것은 재검증이 아니다. 이 검사는 원문 내용의 정확성·기사 발행일·topic 수집 시각·개인 맥락 최신성을 보장하지 않으며 실제 수집기 연결도 별도 작업이다. 일일 중복 확인은 기존 runner에서 먼저 수행한다.

### ADR-018: 운영 모니터링은 비공개 Prometheus/Grafana와 지속적인 작업 신호로 시작한다

**결정 (2026-10-06, 구현 예정)**: [operations-observability](OBSERVABILITY_PLAN.md)에서 Prometheus, Grafana/Grafana Alerting, Node/PostgreSQL/Blackbox Exporter를 선택형 Compose 구성으로 도입한다. Grafana는 localhost + SSH 터널을 기본안으로 두고 metrics/probe endpoint는 공개하지 않는다. 초기에는 별도 Alertmanager, Loki/Tempo, OTel Collector, Pushgateway, cAdvisor를 추가하지 않는다.

**이유**: 단일 OCI host의 가용성·DB·자동 발행·백업 상태가 우선이다. One-shot의 메모리 counter나 홈 HTTP 200만으로 작업 성공을 판단할 수 없다. 기존 `publish_jobs`/`usage_events`의 제한된 집계와 필요한 최소 지속 결과를 재사용하며 마지막 성공·미실행·오류·수집 누락을 구분한다. [Prometheus batch 계측 지침](https://prometheus.io/docs/practices/instrumentation/)을 참고한다.

**트레이드오프**: 로그 전문 검색·분산 추적·컨테이너별 자원 분석은 후속 요구로 남는다. 같은 host의 수집/알림은 host 전체 장애 때 멈추므로 독립된 외부 HTTP/heartbeat 감시가 필요하다. 자원·retention은 로컬 예산과 실측으로 검증하고 운영 host에 맞지 않으면 배치를 재검토한다.

**실행 경계**: 로컬 Steps 0–6 후 승인된 Step 7에서 운영 수집과 수신처를 검증한다. 이 phase의 완료를 자동 발행 timer 활성화 선행 조건으로 추가하되 timer 자체는 활성화하지 않는다. disabled schedule을 구분해 순환 의존을 피한다. 기존 OCI 보류·Terraform·발행/비용/privacy 경계는 유지한다.

### ADR-019: Second Brain은 검수한 기술 노트의 읽기 전용 카탈로그로 시작한다

**후속 결정**: 카탈로그/공개 경계는 유효하다. 아래 초기 SVG 전용 UI 결정은 사용자의 수정 요청을 반영한 ADR-020으로 대체됐다.

**결정 (2026-10-06)**: [Second Brain 계획](SECOND_BRAIN_PLAN.md)의 초기 노드는 TypeScript로 편집하는 별도 카탈로그다. 서버에서 공개 항목/관계만 선택해 명시적인 DTO로 전달하고, 같은 데이터로 그래프·목록·상세·사이트맵을 만든다. 개인 소개, 구현에서 정리한 메모, 회고 초안, 검토 질문을 구분한다. 비공개 원본/경로는 runtime import나 공개 데이터에 넣지 않는다.

**이유**: 현재 요청은 여러 프로젝트에서 선별한 기술적 생각을 연결해 읽는 첫 버전이다. 기존 Portfolio의 편집형 자료와 같은 규모에서 새 DB/인증/그래프 서비스를 먼저 추가하지 않는다. 회사 코드의 존재는 개인의 당시 생각·기여·감정의 증거가 아니므로 편집 근거를 함께 표시한다.

**트레이드오프**: 초기 노트 수정에는 코드 변경이 필요하다. 소유자 전용 기록 기능을 만드는 후속 step에서 PostgreSQL 원본/버전/선택 공개를 도입한다. 이것은 Blog의 DB source 전환이나 개인 기억 저장 완료가 아니다. 작은 SVG 그래프는 목록/키보드 탐색을 병행하며, 3D 효과나 별도 graph DB는 도입하지 않는다.

### ADR-020: Memory 전체 화면과 3D 탐색을 `/brain` 전용으로 구현한다

**후속 결정**: 사용자가 이 결과도 원본과 다르다고 거절했다. UI와 renderer 결정은 ADR-021로 대체한다. 공개 DTO·기존 콘텐츠·운영 경계는 유지한다.

**결정 (2026-10-06)**: 사용자가 작은 격자 UI를 거절하고 참고 Memory와 같은 UI를 명시했다. ADR-019의 SVG 전용/3D 제외 결정만 대체한다. 공개 클라이언트와 실제 화면의 [분석](MEMORY_UI_REFERENCE.md)을 기준으로 밝은 260px 사이드바, 검은 전체 화면, 선택 시 오른쪽 reader를 구현한다. Three.js와 d3-force-3d를 클라이언트에서 지연 로드한다. 카메라 제어는 OrbitControls를 재사용한다. 같은 renderer에서 2D 배치도 제공한다.

**경계**: 이 route의 밝은 sidebar는 최신 사용자 요청에 따른 전용 디자인이며 전역 light theme을 추가하지 않는다. Home/레이더 및 다른 경로의 Discord 스타일은 유지한다. 승인된 28개/42개 카탈로그와 공개 DTO는 그대로이며, 원본 질문 기능은 H-Log의 실제 기록 검색으로 대체한다. 방문자 챗봇, 회사 Wiki import, 가짜 노드, 운영 배포는 포함하지 않는다.

**트레이드오프**: WebGL 의존성과 그래프 전용 bundle이 추가된다. 렌더러를 동적으로 불러오고 dispose하며, reduced-motion·움직임 정지·키보드/목록 대체·WebGL 실패 fallback을 제공한다. 모바일도 그래프로 진입하되 필터와 reader는 닫을 수 있는 dialog다.

### ADR-021: 지정한 로컬 UI의 최종 스타일과 native WebGL renderer를 이식한다

**결정 (2026-10-06)**: 사용자의 최신 요청은 로컬 `brain/ui/index.html`과 같은 모양이다. [직접 실행한 화면과 최종 CSS/JS 분석](LOCAL_BRAIN_UI_REFERENCE.md)을 기준으로 340px 검은 sidebar, sidebar 검색, pill 필터, 상단 hover controls, 세로 constellation, 하단 preview와 우측 하단 520px detail을 이식한다. Force simulation/Three.js 대신 원본의 native WebGL point/line shader와 2D label canvas를 사용하고, 원본 script를 앱에 삽입하는 대신 React lifecycle에 맞춰 타입과 자원 해제를 연결한다.

**이유**: 다른 reference의 구조를 재해석한 Step 0은 시각적 요구를 충족하지 못했다. 원본은 이미 독립된 UI 코드이므로 동일한 수치와 렌더링을 재사용하는 것이 가장 직접적이다. 이식 후 불필요한 Three.js/d3-force-3d 및 전용 타입을 제거한다.

**경계**: 원본의 회사 embedded data/본문/검색 인덱스/파일 fetch/AI prompt는 포함하지 않는다. 승인된 28개/42개 공개 DTO만 연결한다. Home/레이더·다른 route·Blog DB와 운영 보류는 그대로다. 실제 기록 종류·주제·정리일만 사용한다.

**보정/트레이드오프**: 원본의 고정 sidebar가 모바일 graph를 가리는 문제는 767px 이하 drawer로 보정한다. 소수 노드의 한글 라벨 겹침도 원본 collision guard로 막는다. 실제 node drag, touch pinch, 키보드/정지/reduced-motion, 목록 fallback, 안전한 본문/URL 복원은 유지한다. Renderer는 공개 데이터만 받고 unmount 시 observer/listener/RAF/GPU 자원을 해제한다.

### ADR-022: 개인 원문과 직접 승인한 공개 사본을 분리한다

**결정 (2026-10-07, foundation Step 3)**: `/admin/brain`은 단일 소유자의 비공개 작성 화면이다. 서버에 명시한 256-bit 관리자 키로 HTTP Basic 인증을 받고, Proxy뿐 아니라 page와 각 route handler에서도 인증한다. 외부 환경은 HTTPS만 허용하고 HTTP는 개발 중 loopback에서만 허용한다. 쓰기 요청은 설정한 origin과 일치해야 한다. 응답은 no-store/noindex이며 키·DB 기능 설정이 없으면 화면을 열지 않는다. 기존 Nginx의 관리자 경로 차단과 OCI 보류는 유지한다. 별도 회원가입·세션 저장소·OAuth 제공자는 도입하지 않는다. [Next.js 인증 지침](https://nextjs.org/docs/app/guides/authentication)의 route handler별 권한 확인을 따른다.

**저장/공개 계약**: 기존 PostgreSQL에 Brain 전용 원본/수정 이력을 두고 낙관적 버전 검사로 덮어쓰기를 막는다. 저장은 비공개이며 최초 원문과 이후 수정본을 남긴다. 공개용 제목·요약·본문을 별도로 작성하고 확인한 버전만 명시적으로 공개한다. 원문을 공개 필드로 자동 복사하지 않는다. 비공개 수정만으로 기존 공개 사본이 바뀌지 않으며 공개 해제는 공개 조회에서 즉시 제외한다. 공개 SQL은 사본만 읽고 기존 privacy scanner로 다시 검증한다.

**카탈로그 전환**: 승인된 28개 노드/42개 연결은 기존 편집형 카탈로그에 유지한다. `HLOG_BRAIN_DATABASE_ENABLED=1`로 명시적으로 활성화한 환경에서만 새 공개 사본을 같은 그래프·검색·상세·사이트맵에 더한다. 기존 카탈로그를 자동으로 DB 원본에 넣거나 Blog 데이터와 합치지 않는다. 활성화 후 DB 오류를 옛 공개 상태로 숨기지 않는다. 새 메모의 연결 편집·회고 흐름은 Step 4에 남긴다.

**검증/운영 경계**: 격리된 로컬 DB와 합성 기록으로 인증·원본 비노출·수정 이력·공개/해제·동시 수정·HTTP를 검증한다. 이 결정은 실제 개인 원문 입력, 운영 migration, 관리자 경로 개방이나 배포를 실행하는 승인이 아니다.

### ADR-023: 회고는 새 기록으로 연결하고 후보는 직접 골라 반영한다

**결정 (2026-10-07, foundation Steps 4–5)**: 이후 회고는 새 비공개 메모에서 작성하며 `revises` 관계로 이전 기록을 가리킨다. 원문과 과거 버전은 보존한다. 사건 날짜는 선택 입력이고 기록 시점과 구분한다. 사건 날짜의 공개는 별도 확인값으로 결정하며 모르는 날짜는 채우지 않는다. 관계 대상·종류·이유도 저장한 버전의 일부로 두고, 명시적 공개 시 사본에 고정한다. 공개 조회 때 양쪽 노드가 현재 공개된 관계만 반환한다. 기존 JSONB 버전에 선택 필드를 추가하므로 기존 이력의 수정이나 새 table은 필요하지 않다.

**다시 읽기**: 소유자 목록에 검색과 정리일/사건일 정렬을 제공하고 원래 기록과 이후 회고를 오갈 수 있게 한다. 공개 목록에도 날짜 정렬과 두 날짜의 구분을 더한다. 기존 WebGL/레이아웃은 유지한다.

**제안 범위**: 전체 Second Brain 마무리 요청에 따라 Step 5의 보조 기능을 로컬 규칙 기반으로 구현한다. 기존 공개 카탈로그와 소유자의 기록 제목·태그·주제를 비교해 관련 기록·중복 가능성·태그 후보와 이유를 보여 준다. 실제 사용 부담이나 AI 정확도를 측정했다고 주장하지 않는다. 외부 AI 제공자·임베딩·비용은 추가하지 않는다. 후보 조회는 데이터를 쓰지 않고, 후보 선택도 편집 중인 초안만 바꾼다. 저장과 공개는 각각 기존 소유자 확인을 거친다.

**경계**: 비공개 제목·사건 날짜·관계와 후보 결과는 인증된 화면에만 둔다. 회사 Wiki import, 원문 자동 수정, 감정 추정, 자동 관계 확정·공개, OCI 변경은 포함하지 않는다.

### ADR-024: 기존 Marked의 표 구분 규칙과 안전한 셀 모델을 사용한다

**결정 (2026-10-08)**: 공개 Blog reader는 요청마다 `Lexer`와 `Tokenizer`를 만들고 `Lexer.rules.block.gfm`의 블록 구분 규칙을 사용한다. `gfm: false`와 기존 fence tokenizer는 유지한다. 표를 header/rows/align 모델로 변환하고 각 셀은 기존 text/code/strong/link 허용 목록으로 읽는다. React의 native table과 `scope="col"` 헤더를 사용하며, 이름과 키보드 focus가 있는 컨테이너 안에서만 가로 스크롤한다.

**이유**: 고정된 Marked 18의 표 규칙은 escaped pipe, 코드 셀, 누락 셀과 중첩 블록을 처리한다. GFM 전체 옵션을 켜면 기존 체크박스 목록의 텍스트 해석도 달라지므로 표를 구분하는 블록 규칙만 재사용한다. HTML parser 출력이나 새 의존성 없이 기존 React escaping과 URL 검증을 유지한다.

**트레이드오프**: Marked를 올릴 때 표 인접 문단·setext 제목·목록·fence 경계의 회귀 검증이 필요하다. 표의 헤더와 구분 행 열 수가 다르면 일반 텍스트로 남고, 짧은 본문 행은 빈 셀로 채우며 초과 셀은 Marked 규칙에 따라 제외한다. 저장 Markdown/HTML/hash, crawler 원문과 published-current 경계는 변경하지 않는다.

### ADR-025: 제목 주소와 목차는 서버 모델과 브라우저 기본 탐색으로 만든다

**결정 (2026-10-08)**: 허용된 heading의 inline 표시 문자열을 NFC 정규화·소문자·문자/숫자 기반 slug로 바꾸고 `section-` 접두어를 붙인다. 문서 전체의 Set으로 중첩 제목까지 중복을 확인해 숫자 suffix를 붙인다. 목차에는 최상위 H2/H3만 포함하며 code와 인용문/목록 제목, 문서 H1은 제외한다.

**탐색**: React server markup의 native hash anchor, focus 가능한 heading, `scroll-margin-top`과 모바일 `details/summary`를 사용한다. 제목에 이미 링크가 있어도 중첩 anchor가 되지 않도록 permalink를 형제로 둔다. 데스크톱 목차는 sticky와 내부 스크롤을 사용하며 Blog detail을 포함한 main에만 `overflow-x: clip`을 적용해 상위 scroll container가 sticky를 막지 않게 한다. 별도 client 상태·스크롤 listener·의존성은 추가하지 않는다.

**트레이드오프**: 같은 본문에서는 새로고침과 비관련 제목 삽입에도 주소가 유지된다. 제목 문구를 바꾸거나 같은 제목을 앞에 추가하면 해당 slug/suffix가 바뀔 수 있으며 DB에 anchor 이력을 저장하지 않는다. 현재 위치 자동 강조와 hash 별칭은 이번 범위가 아니다. 저장 원문/해시·공개 경계와 다른 페이지의 스크롤 설정은 유지한다.

### ADR-026: 코드 복사는 작은 client component와 Clipboard API로 처리한다

**결정 (2026-10-12)**: 기존 fence tokenizer가 언어 info를 전달하고 공개 모델은 첫 토큰 중 최대 32자의 ASCII 언어 식별자만 소문자로 표시한다. 파일명 등 나머지 info는 제외하며 언어가 없거나 유효하지 않으면 `코드`로 표시한다. `components/blog/CodeBlock.tsx`는 같은 `code` 문자열을 React text로 출력하고 버튼을 누를 때만 `navigator.clipboard.writeText`에 전달한다.

**접근성/실패**: 항상 존재하는 polite status 영역에 진행/성공/실패를 안내한다. 대기 중에는 `aria-disabled`와 handler guard로 중복 요청을 막고 키보드 초점은 유지한다. API가 없거나 거부하면 코드를 직접 선택해 복사하도록 안내하고 다시 시도할 수 있다. 코드 본문은 client hydration 전에도 서버 HTML에서 읽을 수 있고 `pre`의 focus/가로 스크롤을 유지한다.

**트레이드오프**: Clipboard 권한·지원 여부에 따라 버튼 복사가 실패할 수 있다. 별도 복사 라이브러리, 자동 clipboard 읽기, 구문 강조와 성공 안내를 지우는 timer는 추가하지 않는다. 저장 Markdown/HTML/hash와 공개 경계는 변경하지 않는다.

### ADR-027: 상세 글 탐색은 기존 공개 store와 태그 선택 로직을 재사용한다

**결정 (2026-10-12)**: 상세 page와 metadata는 request-cached `loadPublicBlogContentStore()`를 공유한다. 같은 published-current/privacy 필터를 통과한 store에서 본문과 탐색 대상을 선택한다. `getPublicBlogPostNavigation`은 기존 `selectPublishedRelatedPostsBySimilarity`에 빈 chunks와 limit 3을 전달해 태그 겹침 순위를 사용한다. 독자에게는 현재 버전 제목과 공통 태그만 표시하며 similarity 점수를 노출하지 않는다.

**순서/빈 상태**: 이전 글은 발행 순서상 바로 앞, 다음 글은 바로 뒤다. `publishedAt`(없으면 기존 `updatedAt` fallback)의 오름차순과 동률일 때 slug 순서로 결정한다. 관련 글 순위는 기존 태그 비율·공통 태그 수·slug 순서이며 공통 태그 표시 순서도 고정한다. 관련 글이 없거나 한 편뿐이어도 채우기용 글을 만들지 않으며 존재하는 링크만 출력한다.

**트레이드오프**: 이미 있는 공개 전체 조회를 사용하므로 새 SQL, 저장 필드나 외부 embedding 호출 없이 연결한다. 현재 글 외의 본문을 Markdown block으로 파싱하지는 않는다. 공개 글 수가 커져 전체 조회가 병목으로 확인되면 요약 전용 조회를 검토한다. DB 실패는 기존 Blog 오류 경계로 전달한다. 저장 원문/hash, Markdown 경로, Home/레이더와 Second Brain은 유지한다.

### ADR-028: Blog 탐색 상태는 URL로 공유하고 검색 API에서 필터·페이지를 계산한다

**결정 (2026-10-13)**: `blog-search-ui.ts`의 `parseBlogBrowseParams`/`buildBlogBrowseHref`를 page, API와 페이지 링크가 공유한다. 같은 query parameter가 반복되면 첫 값을 사용하고 검색어 공백·빈 태그·잘못된 페이지를 정규화한다. 검색어/태그를 바꾸면 첫 페이지로 이동하며 페이지 링크는 나머지 조건을 유지한다. 범위를 넘은 페이지는 실제 마지막 페이지로 제한한다.

**화면/요청**: URL 상태를 key로 갖는 `BlogSearchPanel`이 제출 전 draft와 제출된 snapshot을 분리한다. URL 변경이나 재시도 시 이전 effect의 AbortController를 취소하고, 취소된 성공/실패는 반영하지 않는다. 검색 중에는 일반 목록을 렌더링하지 않는다. 기존 검색 API의 HTTP `reason` 필드를 정확히 읽고, 오류 응답을 빈 검색 결과로 취급하지 않는다. 일반/검색 페이지 이동은 `BlogPagination`을 공유한다.

**캐시/공개 경계**: 태그 필터를 전체 검색 결과에 적용한 뒤 페이지를 자른다. 기존 TTL/100개 제한 query cache는 표시용 글을 보관하지 않고 재사용 가능한 vectorScores만 보관한다. 캐시 hit에도 최신 public store에서 검색/태그/개수/페이지를 계산해 수정·철회 글의 과거 제목이나 순위를 재사용하지 않는다. 현재 route는 여전히 keyword-only이며 새 embedding 호출이나 사용량 기록은 없다. 비용·반복·rate-limit guard와 DB 실패 전파를 유지한다.

**트레이드오프**: 목록/필터는 기존 서버 조회, 검색 결과는 브라우저의 `/api/search` 요청을 사용한다. 검색 결과를 보려면 JavaScript가 필요하다. 새 DB 조회 계층 없이 현재 공개 store를 평가하며 대규모 글 수에서 검색 비용이 확인되면 SQL 기반 검색/페이지 조회를 별도로 검토한다. UI의 cache/score 표시는 결과 수와 읽을 수 있는 일치 설명으로 대체한다.

### ADR-029: 목록 태그는 서버에서 나누고 기본 HTML로 펼친다

**결정 (2026-10-14)**: `/blog`의 큰 소개와 발행 정책 패널을 짧은 소개로 바꾸고, 한 열에 검색·태그·글을 배치한다. `BlogTopicFilters`는 기존 public selector가 공개 글 수 내림차순/태그명 순으로 정렬한 태그 중 앞의 4개를 보여 준다. 선택한 공개 태그가 뒤에 있으면 접힌 영역에서 빼서 앞에 함께 표시한다. 태그 숫자는 전체 공개 글 기준이며 검색 결과 수와 구분한다.

**상태/접근성**: 나머지는 native `details/summary`로 펼치고 접으며 별도 client 상태나 의존성을 추가하지 않는다. 선택 표시는 `aria-current`, 태그 이동은 기존 q/tag/page URL builder를 사용한다. 긴 태그는 필터 안에서 줄이고 접근 가능한 링크 이름과 title에는 원문을 유지한다. 존재하지 않는 태그는 입력값과 빈 결과만 안내하며 공개 태그 개수를 만들어 내지 않는다.

**트레이드오프**: 모바일 첫 화면의 높이를 줄이기 위해 데스크톱도 같은 가로 필터를 사용한다. 공개 목록/개수 계산과 검색 API는 바꾸지 않는다. 대표 글은 명시적인 편집 선택이 없으므로 자동으로 선정하거나 별도 설정을 만들지 않는다. 태그 펼치기는 페이지가 표시된 뒤 브라우저 기본 동작으로 처리된다. 기존 비동기 route의 초기 스트리밍/JavaScript 의존성을 이 변경으로 해소했다고 주장하지 않는다.

### ADR-030: 현재 로컬 Brain UI를 REA로 확인하고 화면 구성을 갱신한다

**결정 (2026-10-14)**: 사용자가 지정한 로컬 HTML을 REA directory/runtime 분석과 화면 캡처로 확인했다. 이전 ADR-021의 340px 검은 sidebar 기준을 현재 원본의 260px 크림색 sidebar, 그래프 상단 검색, 하단 460px preview와 우측 440px 세로 본문으로 대체한다. 배치·색상·간격 도구는 sidebar에 둔다. 밝은 패널은 `/brain` 전용이며 다른 경로의 Discord 테마에 영향을 주지 않는다.

**구현**: 기존 React 컴포넌트와 native WebGL/2D canvas를 유지한다. 원본의 viewport fit 배율과 중앙 투영을 사용하고 이전 모바일 전용 초기 축소를 제거한다. `/`로 검색에 포커스하되 입력 중이거나 modal dialog가 열린 경우 가로채지 않는다. 모바일 필터와 본문은 기존 native dialog로 접근성과 내부 스크롤을 보존한다.

**경계/검증**: 회사 embedded data·경로·AI prompt와 원본 HTML/캡처는 공개 저장소에 넣지 않는다. 개인 공개 DTO·URL 복원·목록·근거 수준·실제 날짜·한글 라벨 충돌 방지를 보존한다. 데이터가 다르므로 노드 연결 모양까지 같다고 주장하지 않는다. 기준 파일 hash와 REA evidence, geometry/투영 RED→GREEN 및 화면별 검증은 [이식 기준](LOCAL_BRAIN_UI_REFERENCE.md)과 `second-brain-memory-interface/step2.md`에 남긴다. DB·Home/레이더·OCI 운영 상태는 변경하지 않는다.

### ADR-031: Second Brain의 최종 UI 기준은 공개 Memory 페이지다

**결정 (2026-10-15)**: 사용자의 비동기 답변으로 기준이 `careerhackeralex.com/memory`로 확정됐다. ADR-030의 로컬 HTML 기준을 대체한다. 공개 번들을 REA로 분석하고 실제 화면에서 sidebar·필터·검색·미리보기·전체 높이 reader와 모바일 구성을 측정했다. 화면 치수와 evidence는 [Memory 기준](MEMORY_UI_REFERENCE.md)에 남긴다.

**그래프**: 고정 나선 좌표 대신 실제 공개 노드/연결의 force 배치를 사용한다. `d3-force-3d` 3.0.6으로 3D 또는 2D simulation을 고정 tick만 계산하고 입력은 복사해 원본을 보존한다. 렌더링은 기존 native WebGL/2D label canvas를 재사용한다. 브레인은 데이터 크기에 맞춘 원근/회전/발광점, 다른 배치는 밝은 평면/화면 이동/노드 drag다. 원본 Three.js bloom/SVG까지 복제하지 않는다. 실제 기록 날짜와 관계만 사용하며 화면 밀도를 위해 데이터를 추가하지 않는다.

**읽기/접근성**: 560px 전체 높이 본문은 제목·요약과 스크롤 영역으로 나누고 모바일에서는 전체 화면 native dialog로 연다. 본문이 열리면 상단 검색은 남은 공간을 사용한다. 원본의 질문/로그인·번역은 도입하지 않고 기존 기록 검색과 H-Log 표기를 유지한다. URL 복원, 근거 수준, 목록 fallback, 키보드·focus·모션 정지와 공개 DTO 경계를 보존한다. 다른 화면과 Home/레이더, DB/운영 상태는 변경하지 않는다.

### ADR-032: 홈의 최근 글 조회는 독립된 서버 섹션으로 격리한다

**결정**: 홈의 기존 모든 section 뒤에 async `HomeRecentPosts`를 `Suspense`로 배치한다. 공통 public store loader와 `getPublicBlogIndex({ pageSize: 3 })`를 재사용하고 요청 시 렌더링을 명시한다. 제목·요약·날짜·글 유형과 상세/전체 글 링크만 표시한다.

**이유**: 기존 published-current/privacy 검사를 재사용하면 새 DB/API 없이 공개 목록과 같은 기준을 지킨다. DB 지연/실패가 소개와 레이더를 막지 않도록 await와 오류 처리를 최근 글 컴포넌트 안에 한정한다. 성공한 0건은 생략하고 실패는 일반 안내와 전체 페이지를 다시 요청하는 native GET form으로 구분한다. 원본 오류/접속 정보는 공개하거나 로그에 덧붙이지 않는다.

**트레이드오프**: 기존 전체 공개 조회와 Markdown 모델 처리를 재사용하므로 모든 공개 글을 읽는다. 실제 규모에서 병목이 확인되면 요약 전용 조회를 검토한다. 별도 API·cache·client 상태·새 timeout 정책은 추가하지 않았다. 기존 Home/레이더의 값·배치·주변 영역과 Second Brain, DB/schema/worker 및 OCI 보류는 유지한다.

### ADR-033: 목록 썸네일은 기존 자산의 전용 경로로 지정하고 파일을 검증한다

**결정**: `type=image`인 기존 `post_assets`를 `/blog-assets/thumbnails/<SHA-256>.png|webp`에 명시적으로 배치했을 때만 목록 후보로 삼는다. 현재 공개 버전과 content hash, ready/verifiedAt/alt, 경로의 hash와 asset hash를 확인한 뒤 공통 public loader에서 실제 파일 SHA-256을 검사한다. 목록·검색은 같은 선택 규칙을 사용하고 실패하면 텍스트 행을 유지한다.

**이유**: 새 DB 필드나 업로드 기능 없이 기존 자산 계약 안에서 목록용 선택 의사를 구분한다. 본문 이미지 자동 선택, 임의 외부 URL, SVG는 썸네일 후보가 아니다. 브라우저 오류도 글 탐색을 막지 않도록 작은 client component에서 처리한다.

**트레이드오프**: 요청마다 선택된 파일을 읽는다. 파일명은 hash에 묶고 같은 경로의 내용을 바꾸지 않는다. 정적 파일 자체의 공개 철회를 보장하지 않으므로 독립적으로 공개 가능한 자산만 사용할 수 있다. 이 단계는 합성 fixture로 로컬 UI를 검증하며 실물 이미지 선정·배포나 운영 활성화를 포함하지 않는다.

### ADR-034: 프로젝트와 글은 명시적인 연결 목록과 기존 공개 판정을 공유한다

**결정**: `lib/portfolio-posts.ts`에서 프로젝트 slug·글 slug·연결 이유를 지정한다. 양쪽 상세 화면은 같은 selector로 published-current/privacy 검사를 통과한 연결만 표시한다. 글 상세는 이미 읽은 store를 재사용하고 프로젝트 상세는 연결 후보가 있을 때만 기존 public loader를 호출한다.

**이유**: 태그 유사성만으로 프로젝트 경험과 문서 분석을 같은 사실로 묶지 않는다. 연결 이유에 관계의 범위를 적고, 없는 프로젝트·글이나 미발행·철회 글에는 링크를 만들지 않는다. 현재 버전 제목을 사용하며 저장 본문과 hash는 수정하지 않는다.

**트레이드오프**: 연결 추가에는 코드 변경이 필요하지만 소수의 선별된 사례에는 새 schema·관리 화면이 필요하지 않다. 프로젝트 상세는 요청 시 렌더링하며 async 관련 글 영역을 Suspense로 분리한다. 성공한 빈 결과는 생략하고 DB 실패는 해당 영역에만 일반 안내·GET 재시도를 표시한다. 전체 public 조회 비용은 기존 loader와 같으며 규모가 커지면 실제 측정 후 좁은 조회를 검토한다.

### ADR-035: 검증 범위와 수정 기록은 현재 공개 버전의 명시적 스냅샷으로 저장한다

**결정**: `post_versions.public_editorial`의 선택적 JSONB에 공개용 검증 방법·확인 날짜·범위·한계와 수정 날짜·요약을 저장한다. 기존 aggregate 저장 경로에서 입력을 검증하며, public 조회는 현재 published 버전에 속한 이 스냅샷만 사용한다. 과거 버전 조회나 내부 검증/감사 테이블 공개는 추가하지 않는다.

**이유**: `posts.updated_at`은 상태 변경에도 갱신되고 `post_sources.fetched_at`은 자료 수집 시각이다. 버전 생성 시각·번호도 공개 수정 이력이나 직접 실험의 증거가 아니다. 작성자가 공개하기로 정리한 요약만 보존하면 비공개 초안의 본문·제목·내부 evidence를 추론하거나 노출하지 않는다. 문서 검토, 로컬 재현, 운영 관찰을 구분하고 검증 범위와 한계를 함께 표시한다.

**트레이드오프**: 공개 기록은 자동으로 생성하지 않으며 새 버전에 포함할 기록은 작성자가 선별한다. 검증 배지·새 관리 화면·과거 본문 diff는 제공하지 않는다. 기존 글은 null로 유지하고 원문/HTML/hash는 변경하지 않는다. 부적합한 공개 기록은 저장을 거절하고 읽기에서는 생략한다. 운영 적용에는 migration 005가 선행돼야 하며 이번 단계는 격리 로컬 DB에서만 적용한다.

### ADR-036: 시리즈는 명시적 순서를 기존 공개 글에 연결한다

**결정 (2026-10-22)**: 검수한 관련 원고 3편을 `lib/blog-series.ts`의 시리즈명·소개·slug 순서로 연결한다. `getPublicBlogSeries`는 기존 `selectPublicBlogRouteEntries`를 통과한 현재 버전의 제목과 `/blog/[slug]`만 반환한다. 원래 편 번호를 유지하고 비공개·철회·누락 글을 제외하며 공개 글이 0개면 시리즈도 생략한다.

**읽기 흐름**: 기본 블로그 목록의 첫 페이지에 시리즈를 표시한다. 검색·태그 목록은 해당 결과에 집중하도록 시리즈를 생략한다. 상세에서는 native details로 전체 순서와 현재 편을 확인하며 하단 이전/다음은 시리즈 안의 남은 공개 글을 연결한다. 시리즈에 속하지 않는 글은 기존 날짜순 이동을 유지한다. 중간 편이 철회돼도 번호를 다시 매기거나 비공개 제목을 표시하지 않는다.

**트레이드오프**: 선별한 소수의 시리즈이므로 편집 순서는 코드로 관리하고 별도 DB 테이블·관리 화면·API·시리즈 URL을 만들지 않는다. 추가 시 코드 변경이 필요하다. 현재 공개 store를 재사용하며 태그나 글 유형으로 시리즈 소속을 추론하지 않는다. 글 본문·HTML·hash와 canonical은 그대로 유지한다. 원고 준비와 로컬 기능 구현은 실제 발행을 뜻하지 않는다.

### ADR-037: Queue 실험은 고정 가상 작업의 순수 재생 모델로 제공한다

**결정 (2026-10-22)**: 독립 경로 `/lab/queue`에 작업 6개, Worker 1~3개, 실패 조건 3개만 제공한다. `lib/queue-lab.ts`가 같은 입력에서 같은 frame 목록을 만들고, `QueueReplay`는 목록의 현재 위치와 재생 여부를 관리한다. 작업 획득과 결과 확인은 별도 단계이며 첫 실패는 FIFO Queue 뒤, 두 번째 실패는 DLQ로 이동한다. 명시적인 재처리는 원인이 해결됐다는 가정으로 DLQ 작업만 되돌리고 누적 시도 횟수를 보존한다.

**이유**: 방문자가 작업의 이동과 보관 위치를 확인하는 데 실제 broker·Worker·DB·LLM은 필요하지 않다. 입력은 제한된 native select로 고르고 자동 재생은 사용자가 시작한다. 한 단계 진행과 처리 기록으로 모션 없이도 같은 결과를 읽을 수 있다.

**한계**: 고정 작업의 전이를 설명하는 가상 모델이며 실제 성능·처리량·exactly-once 보장의 근거가 아니다. 네트워크·영속성·Worker 장애·중복 전달을 구현하지 않는다. 전용 대형 메뉴나 새 의존성은 추가하지 않는다.

**사례 연결 (2026-10-22 Step 1)**: 실험과 기존 Redisson/DLQ 상세를 정적 링크로 왕복하고, 관련 글은 프로젝트의 기존 `ProjectRelatedPosts`와 ADR-034 공개 판정을 재사용한다. 실험 페이지에 별도 DB 조회나 글 제목/slug 복사본을 추가하지 않는다. 동시성·네트워크·영속성 설명은 실제 설계 시 확인할 조건으로 표시하고, 가상 수치를 프로젝트 성과의 근거로 사용하지 않는다. 실험은 sitemap에 포함하되 feed/llms의 Blog-only 범위는 유지한다.

### ADR-038: 운영 기능은 단일 소유자의 관리자 영역에서 통합한다

**결정 (2026-10-22 계획)**: 사용자 요청에 따라 기존 Next.js `/admin`에 블로그 편집·초안 생성·자동화 허용·실제 작업 조회/제어·Second Brain·모니터링·가상 실험실을 모은다. 운영 진입점은 `admin.<선택 도메인>`으로 분리하되 별도 앱/마이크로서비스를 추가하지 않는다. 공통 소유자 인증과 정확한 Host/Origin, page/HTTP/data 권한 검사를 적용하고 공개 host에서 관리 경로를 거부한다.

**접근 계약 확정 (2026-10-23, A1 Step 0)**: [관리자 접근·명령 계약](ADMIN_ACCESS_CONTRACT.md)에 따라 기존 Basic 256-bit 키를 `HLOG_ADMIN_ENABLED/OWNER_KEY/ORIGIN`으로 이전하고 Brain DB flag와 분리한다. 구 owner 환경값은 fallback하지 않고 잘못된 설정은 닫는다. 별도 세션/계정 저장 없이 시작하며 Basic 캐시의 로그아웃 한계를 명시한다. 초기 운영 접근은 기존 SSH 공개키 터널 안의 관리자 HTTPS + 앱 인증으로 제한하는 기본안이다. 공개 인터넷 로그인/MFA 제공자는 별도 결정 없이 추가하지 않는다. 명령은 중복 receipt·예상 상태/revision·감사를 같은 transaction에 넣고 중지는 정책 row를 통한 실행 예약 순서로 정의한다. 이는 설계 완료이며 실제 인증/DB/ingress는 아직 변경하지 않았다.

**공개 범위 변경 (2026-10-23, A1 Step 2 구현)**: ADR-037의 가상 모델과 재생 컴포넌트를 유지하며 `/admin/lab/queue`로 이동했다. 공통 Proxy와 page 인증으로 보호하고 기존 `/lab/queue`는 redirect 없이 404로 종료했다. Portfolio 진입 영역·sitemap 항목·공개 canonical을 제거했으며 관리자 실험의 공개 프로젝트 링크만 공개 origin으로 연결한다. 공개 `/brain`과 기존 승인된 콘텐츠·원문/hash·레이더는 유지한다.

**명령/실행 계약**: 초안 저장과 공개 발행, 새 claim 중지와 이미 진행 중인 작업을 구분한다. 정책/요청/감사는 필요한 최소 지속 상태로 만들고 웹·CLI·scheduler·worker가 동일한 허용 조건을 확인한다. 서버 운영 허용 설정은 상한이며 UI에서 timer/credential을 바꾸지 않는다. 기존 상태 전이·lease·중복 방지·usage/quality/privacy를 재사용한다. 새 작업이 중지돼도 공개 검증·실패 시 숨김·철회 같은 보호 조치는 유지한다.

**근거와 트레이드오프**: 실제 운영 화면이 필요해져 ADR-002에서 제거했던 caller-free 명령을 일괄 복원하지 않고 필요한 caller와 함께 설계한다. 기존 Brain UI·가상 재생·DB/worker를 재사용할 수 있으나 초안 전용 persistence와 운영 정책의 실제 enforcement는 새 구현이 필요하다. 서브도메인 분리는 프로세스/DB 격리나 인증을 대신하지 않는다. [Next.js 인증 지침](https://nextjs.org/docs/app/guides/authentication)과 [OWASP CSRF 지침](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)을 따라 직접 endpoint/RSC·형제 origin·위조 header를 검증한다.

**A1 Step 1 구현 (2026-10-23)**: 공통 `admin-owner.ts`와 `/admin/:path*` Proxy, page의 조회 전 검사, Brain handler의 공통 인증+기능 flag를 적용했다. 관리자 전용 탐색과 개요는 기존 Discord 스타일을 사용하고 준비 메뉴/미설정/오류를 구분한다. 공개 Header/Footer는 관리자 경로에서 렌더링하지 않으며 이는 인증 경계와 별개다. Brain 공개 링크는 공개 origin을 사용한다. 세션 DB·새 명령 schema·운영 ingress는 추가하지 않았다.

**A1 Step 3 구현 (2026-10-26)**: 내용 revision과 별도로 증가하는 command revision, UUID 멱등 키와 SHA-256 입력 비교를 적용했다. 기존 `admin_actions`를 최소 확장해 Brain 상태/버전과 감사 receipt를 같은 transaction에 저장한다. 고유 키를 먼저 예약해 중복 신규 저장을 수렴시키며 실패 시 예약도 함께 rollback한다. 감사 사유는 버튼의 고정 의미만 남기고 원문은 복제하지 않는다. UI는 결과 불명확 시 동일 요청을 재사용하고 최근 20개 변경을 표시한다. 기존 원문·공개 snapshot·과거 감사는 보존하며 범용 명령 계층은 추가하지 않았다.

**실행 경계**: [통합 관리자 계획](ADMIN_CONSOLE_PLAN.md)의 4개 phase/17개 step은 A1 Steps 0–3와 A4 Steps 0–3 completed 8개·pending 8개·운영 rollout blocked 1개다. 다음은 operations-observability Step 0이다. Prometheus/Grafana는 기존 observability phase가 소유하며 관리자 화면에 새 모니터링 시스템을 만들지 않는다. 로컬 구현 완료는 OCI/DNS/TLS·provider·공개 발행·timer 활성화 승인이 아니다.

### ADR-039: 이력서 PDF는 비공개 버전에서 검토한 파일 하나만 공개한다

**결정 (2026-10-22 계획)**: A4 `admin-resume-pdf`에서 `/admin/resume` 등록·미리보기·파일 교체·버전 선택·공개 해제를 제공한다. 업로드는 비공개이며 특정 버전/hash의 전체 검토 후 공개 포인터를 전환한다. Resume의 다운로드와 `/api/resume/pdf`는 매 요청의 승인된 current 파일만 제공한다. 과거 정적 PDF나 비공개 버전은 노출하지 않는다.

**저장/회수**: A4 Step 0(2026-10-26)에서 [PDF 계약](RESUME_PDF_CONTRACT.md)을 확정했다. 기존 PostgreSQL bytea·검사 보고서·공개 포인터를 사용하고 5 MiB·10페이지·20버전/원본 100 MiB를 제한한다. 전역 revision과 기존 감사 receipt로 파일 저장/메모/공개 변경을 원자적으로 처리한다. 새 public asset/bucket·원격 변환 서비스·범용 파일 관리 플랫폼은 만들지 않는다. 공개/교체/해제와 감사는 transaction으로 처리하며 no-store와 동적 공개 판정으로 철회 뒤 새 요청을 차단한다. 이미 받은/전송 중인 사본의 회수는 보장하지 않는다. DB 복구 시에는 공개 게이트를 닫고 dump 밖의 새 publication epoch와 현재 공개 의사를 확인한다. 공개 요청마다 current/epoch/hash를 확인하고 ETag 조건부도 그 뒤에 평가한다. Range는 최대 5 MiB 전체 응답으로 처리한다.

**검사 도구 결정 (2026-10-26)**: qpdf JSON v2 구조 검사와 Poppler의 서버 PNG 미리보기를 선택했다. 같은 web image의 고정 CLI·prlimit·seccomp 네트워크 차단을 사용하며 새 서비스/브라우저 PDF viewer/원격 변환은 추가하지 않는다. 도구와 제한이 검증되지 않으면 기능을 닫는다. 이미지 변환은 검토용이며 공개 원본 바이트를 바꾸지 않는다. Step 1에서 qpdf 12.3.2·Poppler 25.12.0·util-linux 2.42.3과 폰트를 기존 Linux image에 고정하고 네트워크/CPU/메모리/종료·청소를 검증했다. Step 3에서 UID/GID 1001 전용 32 MiB tmpfs를 필수로 하고 실제 최대 보관량의 RSS·dump·복구를 검증했다. tmpfs 미설정/용량 초과 환경은 검사 불가로 닫는다.

**수정 범위**: 파일 바이트의 수정은 새 버전 등록이다. 관리자용 메모와 공개본 선택은 웹에서 바꾸지만 임의 PDF의 본문·폰트·레이아웃 직접 편집이나 온라인 Resume와의 자동 동기화는 구현 범위가 아니다. 구조화된 이력서 편집→PDF 생성은 이후 별도 요구로 다룬다. 검토를 통과한 파일 바이트/hash를 서버에서 몰래 정제·재작성하지 않는다.

**근거/실행 경계**: [OWASP 업로드 지침](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)에 따라 허용 형식·실제 파싱·크기/자원·인증·CSRF·비공개 저장/handler 접근을 검증한다. 자동 검사는 전 페이지·메타데이터·주석·링크의 공개 검토를 대신하지 않는다. A4 Step 1은 합성 PDF로 비공개 업로드·PNG 렌더·불변 버전·메모·중복 receipt를 구현/검증했다. A4 Step 2에서 공개 시 재검사·hash별 검토·epoch/revision·원자적 감사, current-only 다운로드와 Resume 링크를 구현했다. 합성 자료의 공개→교체→해제와 캐시/장애/재전송을 검증했다. Step 3에서 최대 보관량의 별도 DB 복구와 오프라인 공개 초기화를 검증했다. 새 epoch만으로 원문/감사를 지우지 않고, 전용 reset 명령이 기존 unpublish transaction을 재사용해 포인터/revision/감사를 함께 바꾼다. 기존 unpublish fingerprint와 receipt 호환은 유지하며 새 schema나 HTTP 관리 endpoint는 추가하지 않는다. 실제 PDF 공개·운영 migration은 수행하지 않았다.

### ADR-040: SEO 도구는 개발용 Codex 지침으로 선별 이식한다

**결정 (2026-10-26 계획)**: [claude-seo 기준 commit](https://github.com/AgriciDaniel/claude-seo/tree/6be93f45064ffbadced572b5d5c95f55fd263af0)의 필요한 지침·참고 자료를 MIT/출처와 함께 저장소 `hlog-seo` 스킬로 이식한다. `.agents/skills/hlog-seo/`를 기본 후보로 삼고 실제 Codex 검색/명시 호출로 검증한다. Claude installer·plugin root·agent/model 지정·hook을 그대로 활성화하지 않는다. 기존 `.codex/skills` 전체 이동이나 새 SEO 서비스/DB·web 의존성은 만들지 않는다.

**이유와 범위**: H-Log의 기존 metadata/crawler/public selector가 이미 있어 새 SEO 프레임워크보다 실제 응답 감사와 확인된 결함의 작은 수정이 필요하다. source/local/public 모드를 분리하고 인증 자료/비공개 문서를 전달하지 않는다. 원본 Python helper는 필요한 경우에만 격리 도구로 검증하며 SSRF 경계를 유지한다. schema hook의 자동 실행을 가정하지 않고 렌더된 JSON-LD를 명시적으로 검사한다.

**완료 판단**: [SEO 계획](SEO_OPTIMIZATION_PLAN.md)의 S1은 도입/기준선, S2는 공개 표면, S3는 회귀/승인된 운영 측정이다. 점수·llms 존재·GEO 평가를 실제 순위/인용으로 설명하지 않는다. 기존 경험/수치·공개 사본·레이더/Brain UI와 OCI 보류를 유지하며 스킬 설치·앱 최적화·외부 제출은 아직 미실행이다.

## 공식/내부 기준

- Next.js docs
- React docs
- TypeScript docs
- Tailwind CSS docs
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `plans/automated-blog-publishing-plan.md`
