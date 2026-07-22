# Architecture: H-Log

기준 문서:

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`

## 현재 구현 상태

`apps/h-log`는 Next.js App Router 기반 개인 사이트다. 현재 확인된 구조는 Home, Resume, Portfolio, DB-contract 기반 Blog 목록/상세/Markdown endpoint, 프로젝트 상세, resume PDF API route, 공통 UI 컴포넌트, 프로젝트/이력 데이터 loader, 파일 기반 blog loader와 단위 테스트, DB 기반 blog content model contract, published-only public route selector, Markdown-to-sanitized-HTML version/hash boundary, Markdown 기반 안전 렌더링 블록, publish state transition contract, required/retryable publish job failure contract, route로 공개하지 않은 최소 admin preview/save/publish workflow contract, admin/Discord/CLI operational action audit contract, correction/unpublish/retract workflow contract, 검색 API 비용 방어 contract, PostgreSQL usage event cost ledger와 일/월 budget guard contract, LLM 입력·writer 출력·PostgreSQL public read 경계의 공통 privacy scanner contract, fresh `post_chunks` 기반 관련 글 similarity contract, `/blog` published-only 검색 UI, post-publish public/Markdown content hash verification job contract, crawler output manifest contract, `sitemap.xml`/`feed.xml`/`llms.txt`/`llms-full.txt` route, IndexNow/Discord retryable job adapter contract, published-only content hash reconciliation과 `publish_verifications` failure handoff contract, topic source collector/ranking contract, research pack boundary contract, apply-to-me context ledger contract, claim verification source policy contract, article output schema contract, persona and article mode selection contract, quality gate publish decision contract, daily cron draft-to-publish pipeline contract, diagram trigger policy contract, diagram asset storage contract, 검증된 diagram의 public figure 삽입 gate를 포함한다. 파일 기반 blog loader는 DB-first 전환 후 public source of truth가 아니라 import/transition support로 취급한다.

위 자동화 항목은 현재 contract/test baseline과 local runtime이다. PostgreSQL `pg` driver, `001_blog_core`, `002_publish_job_leases`, `003_publish_rollback_audit` SQL migration, migration runner, 최소 blog repository, DB-backed public/crawler/search read path, lease 기반 manual `--once` persistent worker, local Compose 통합 테스트, Hermes Codex OAuth article provider의 local one-shot smoke, 검증된 생성 결과를 비공개 `publishing` aggregate와 queued required jobs로 넘기는 persistence handoff, 이를 실제 PostgreSQL repository와 Hermes 실행에 연결하는 one-shot runner, required publish job adapter가 구현됐다. `lib/blog-public-data.ts`는 fixture/import support로만 남는다. Scheduler와 production 자동 발행 runtime은 아직 구현되지 않았다.

현재 `package.json` 기준 검증 명령은 아래와 같다.

```bash
npm run lint
npm run test
npm run typecheck
npm run build
```

## Runtime 구성

```text
apps/h-log/
├── app/
│   ├── api/
│   ├── blog/
│   ├── portfolio/
│   ├── projects/
│   └── resume/
├── components/
│   ├── layout/
│   ├── portfolio/
│   ├── resume/
│   └── ui/
├── lib/
├── public/
├── .codex/
│   ├── docs/
│   │   └── harness/
│   ├── rules/
│   └── skills/
└── phases/
```

## 책임 경계

### 현재 앱이 소유한다

- 공개 페이지 렌더링
- 포트폴리오/이력 데이터 로딩
- 파일 기반 blog loader 호환 레이어
- UI 컴포넌트
- SEO metadata
- 공개 전 개인정보/고객사 정보 제거
- Docker/Nginx 배포 준비

### DB 기반 블로그 본선이 소유한다

- `posts`, `post_versions`, `post_sources`, `publish_jobs`
- 글 렌더링 HTML/Markdown 생성
- `status=published` 최신 version만 공개하는 route boundary
- `/blog/:slug.md` crawler-friendly endpoint

### 자동 블로그 플랫폼 전환 후 소유한다

- 청킹/임베딩/검색/관련 글 추천
- sitemap/feed/llms.txt/IndexNow/Discord 알림 job
- 주제 수집, 조사, persona 적용, claim 검증
- 자동 발행 전/후 검증 상태 전이

### OCI 인프라가 소유한다

- OCI Compute host
- OCI network/security list
- Docker Compose runtime
- Nginx reverse proxy와 TLS
- PostgreSQL + pgvector instance
- Redis instance
- 백업/복구
- secret injection
- 배포 runner

초기 production 구조는 아직 구현된 상태가 아니라 목표 runtime boundary다.

```text
Internet
  -> OCI network/security list
  -> Nginx 80/443
  -> Next.js web container
  -> PostgreSQL + pgvector / Redis

blog worker container
  -> PostgreSQL + pgvector / Redis
  -> external APIs
```

PostgreSQL과 Redis는 public internet에 노출하지 않는다. 서버 IP, SSH key, DB password, API key는 저장소나 공개 문서에 남기지 않는다.

## Local/OCI Runtime Topology Contract

OCI에 올리기 전 로컬에서 같은 service boundary를 Docker Compose로 먼저 검증한다. 로컬과 OCI의 차이는 host port, domain/TLS, secret 주입 방식, image tag뿐이어야 한다.

```text
Local developer machine
  -> docker compose
     -> hlog-nginx      localhost:8080 ingress only
     -> hlog-web        Next.js standalone runtime, internal 3000
     -> hlog-worker     manual/profile-only --once persistent job runner
     -> hlog-postgres   PostgreSQL + pgvector, data_net only
     -> hlog-redis      Redis, data_net only
```

```text
OCI Compute
  -> Docker Compose
     -> hlog-nginx      public 80/443 ingress and TLS termination
     -> hlog-web        internal 3000
     -> hlog-worker     manual or scheduled background jobs after automation phases
     -> hlog-postgres   private network and persistent volume
     -> hlog-redis      private network and persistent volume
```

Compose networks:

- `public_net`: host ingress to `hlog-nginx`.
- `app_net`: `hlog-nginx` to `hlog-web`.
- `data_net`: `hlog-web`/`hlog-worker` to PostgreSQL/Redis.
- `egress_net`: worker outbound access for later external APIs, with no published host ports.

Current repo config:

- `Dockerfile`: Next.js standalone production image.
- `compose.yaml`: local-first Compose topology for web, profile-gated manual worker and migration runner, PostgreSQL + pgvector, Redis, and Nginx.
- `migrations/001_blog_core.sql`: `vector` extension과 `posts`, `post_versions`, `post_tags`, `post_sources`, `post_assets`, `publish_jobs`의 첫 schema version.
- `migrations/002_publish_job_leases.sql`: `publish_jobs`에 lease owner/expiry와 claim index를 추가해 process-local lock 없이 만료된 작업만 재획득하게 하고, source fetch/LLM/embedding/diagram/IndexNow/Discord와 retry stop을 공통 형식으로 기록하는 `usage_events` ledger를 만든다.
- `migrations/003_publish_rollback_audit.sql`: rollback surface 결과를 저장하는 `publish_verifications`와 운영자 철회 사유를 저장하는 `admin_actions`를 만든다.
- `scripts/blog-migrations.mjs`: 파일명 순서로 SQL을 적용하고 `schema_migrations`의 현재 version을 보고하는 최소 migration runner.
- `lib/blog-postgres-repository.ts`: 핵심 6개 table의 aggregate 저장 transaction과 기존 domain selector를 재사용하는 published-current 공개 조회 adapter. Publish job persistence는 `job_type:post_version_id:content_hash` key를 검증하고 중복 논리 요청에 기존 job을 반환한다. 철회 상태와 `admin_actions`는 한 transaction으로 저장하고 rollback surface 결과는 `publish_verifications`에 남긴다.
- `lib/blog-public-source.ts`: 요청 시 `DATABASE_URL`로 PostgreSQL repository를 읽는 공통 public source. DB failure를 정적 fixture fallback으로 숨기지 않는다.
- `lib/blog-usage-ledger.ts`: `usage_events` 멱등 기록과 UTC 일/월 estimated cost 합계를 제공한다. 비용성 adapter는 호출 전에 이 원장을 요구하고, 일/월 한도 도달 시 `budget_exceeded`로 차단한다. 검색 route의 한도는 `HLOG_DAILY_ESTIMATED_COST_LIMIT`, `HLOG_MONTHLY_ESTIMATED_COST_LIMIT`으로 설정하며 미설정은 activation 전 무제한이다.
- `lib/blog-hermes-article-provider.ts`: Hermes one-shot을 명시적인 `openai-codex`/`gpt-5.6-sol`과 제한된 `web` toolset으로 실행한다. stdout은 JSON object만 허용하고 usage report가 `included`, estimated cost 0, `api_calls=1`, 요청 provider/model 일치일 때만 공통 LLM usage shape로 변환한다. OpenAI Platform API key fallback은 없다.
- `lib/blog-auto-publish-runner.ts`, `scripts/blog-auto-publish.mjs`: 서버 로컬 JSON 입력을 검증하고 서울 날짜별 PostgreSQL advisory lock과 결정적 post ID 존재 여부를 Hermes 호출 전에 확인한다. 통과한 결과는 기존 repository를 통해 `publishing` aggregate와 queued required jobs로만 저장하며 public 전이나 required job 실행은 하지 않는다.
- `lib/blog-auto-publish-cycle.ts`, `scripts/blog-auto-publish-cycle.mjs`: generation runner 뒤에 같은 daily post의 required worker만 최대 required job 수 + idle probe 1회까지 실행한다. 실패/retrying 또는 한도 초과는 즉시 non-zero로 중단한다.
- `lib/blog-privacy-scanner.ts`: token/API key, 내부 URL/IP, 개인 연락처와 서버 로컬 JSON 배열로 설정한 회사/고객사명·비공개 저장소명을 탐지한다. LLM 입력 전, writer 출력 후, PostgreSQL public read에 공통 적용하고 실패 기록에는 finding category와 `[REDACTED]`만 남긴다.
- `lib/public-site-origin.ts`: Nginx의 내부 upstream host 대신 `HLOG_PUBLIC_BASE_URL`을 crawler 절대 URL origin으로 사용한다.
- `lib/blog-persistent-worker.ts`: queued/retrying job을 PostgreSQL five-minute lease로 최대 한 건 claim하고 만료된 작업만 재획득한다. 현재 lease owner만 성공/실패를 저장할 수 있고, retryable job의 동일 실패가 2회 반복되면 같은 transaction에서 `usage_events`에 retry stop을 기록하고 operator-alert 결과와 함께 terminal failure로 중단한다.
- `lib/blog-required-publish-job-adapter.ts`, `scripts/blog-worker.mjs`: current version/idempotency를 확인하고 `render`/`privacy_scan`을 private 상태에서 처리한다. 두 사전 작업이 끝나면 worker가 canary를 공개하고 public URL, Markdown, sitemap, content hash를 실제 HTTP surface에서 검증한다. Public required 실패는 `correction_pending`으로 숨기며 CLI는 계속 한 건만 처리하고 종료한다.
- `deploy/nginx/conf.d/hlog.conf`: local Nginx reverse proxy, fixed `hlog-web:3000` upstream, trusted proxy IP headers, admin/internal blocking, static asset cache headers, and baseline security headers.
- `deploy/env.dev`: placeholder-only local development values for web/worker. Real production secrets, server IPs, SSH keys, API keys, and private URLs must not be written there.
- `.codex/docs/backup-restore-runbook.md`: PostgreSQL logical dump, local/test restore rehearsal, pgvector extension, `schema_migrations` version, content hash, and public smoke verification checklist. It does not contain production dump files, server IPs, or credentials.
- `.codex/docs/deploy-smoke-rollback-runbook.md`: local/OCI deploy smoke, registry pull, compose up, health/log checks, phase-gated sitemap/feed/llms checks, private route blocking checks, migration rollback gate, and previous-image approval-only rollback procedure. It does not contain server IPs, SSH key paths, registry tokens, or production secrets.

Container environment is scoped by service. PostgreSQL receives only `POSTGRES_*` values, Redis receives no application secrets, and web/worker receive only the runtime URLs and mode flags needed for local validation.

The worker service is intentionally profile-gated and non-automatic. It must not call LLM, embedding, IndexNow, Discord, or publish jobs unless a tested job path explicitly enables side effects. The current IndexNow/Discord retryable job contract keeps delivery behind adapters and disables external side effects by default.

Kubernetes is not required for the initial OCI deployment. If a later ADR adopts Kubernetes, the current service boundary maps directly to `Deployment`/`Service` for web and worker, `StatefulSet` or managed services for PostgreSQL/Redis, `Ingress` for Nginx edge behavior, and `Job`/`CronJob` for migration, backup, and worker tasks.

## Backup/Restore Boundary

H-Log uses PostgreSQL logical dump as the first backup method for the self-hosted DB. Restore is not considered complete until a local/test rehearsal validates the restored database.

Restore checks include:

- `vector` extension exists in the restored PostgreSQL database.
- `schema_migrations`의 현재 version이 app image의 migration과 일치한다.
- `posts.current_version_id` points to a restored `post_versions` row.
- `post_versions.content_hash` values are present and match the app-side content hash contract.
- public blog routes expose only `published` current versions after restore smoke.

Operational backup files and restore logs can contain unpublished content or personal data. They must stay outside the repository and must not include server IPs, DB passwords, Object Storage credentials, signed URLs, or private hostnames in committed files.

## Deploy Smoke/Rollback Boundary

Deploy smoke is the release gate for the OCI Compose runtime. It checks the current public app routes, Nginx proxy/security headers, container health, and DB migration safety before a release is considered operational.

Current public smoke includes:

- `/`, `/resume`, `/portfolio`, `/blog`
- DB에서 선택한 published-current slug의 `/blog/<published-slug>`
- 같은 slug의 `/blog/<published-slug>.md`, served through the `/blog/:slug.md` rewrite
- `/admin` and `/api/internal/*` returning 404 through Nginx until authentication/authorization is explicitly decided

`sitemap.xml`, `feed.xml`, `llms.txt`, and `llms-full.txt` are implemented crawler surfaces. They reuse the published-only crawler manifest, validate current version `content_hash`, and exclude preview, failed, unpublished, and retracted posts from crawler output.

Rollback uses the previous image tag and server-local env/Compose boundary. If a deploy includes DB migration or content hash changes, rollback is blocked until migration rollback or restore rehearsal is confirmed.

## 현재 앱 데이터 흐름

```text
Source content / lib data
  -> Next.js route or Server Component
  -> shared UI component
  -> rendered page
  -> metadata / sitemap / robots
```

현재 `/blog`, `/blog/[slug]`, `/blog/:slug.md`, sitemap/feed/llms, search는 `lib/blog-public-source.ts`의 공통 request-time loader를 통해 PostgreSQL repository의 published-current store를 읽는다. `lib/blog-public-data.ts`는 단위 테스트와 import/transition fixture로만 남고 production fallback으로 사용하지 않는다. public selector는 published 최신 version만 반환하고, `ready_to_publish` 같은 preview/admin 상태는 목록, 상세, Markdown endpoint에 노출하지 않는다. `/blog` 검색 UI는 `/api/search` 응답만 사용하며, 결과에는 published 글의 제목, 설명, 공개일, 태그, score, match reason만 표시한다. 검색 UI는 cached/loading/empty/rate-limited/error 상태를 보여주지만 자연어 답변, SSE stream, visitor session memory를 만들지 않는다. 상세 페이지는 저장된 `content_html`을 raw HTML로 주입하지 않고 `content_markdown`에서 만든 typed content block을 React 요소로 렌더링한다. source link는 public HTTPS URL만 허용하고 `javascript:`, `data:`, localhost, private/internal host는 저장 또는 공개 단계에서 차단한다. `lib/blog.ts`의 파일 기반 loader는 public route에 연결하지 않고, DB 전환 전후 import/fixture support로만 사용한다.

## DB 기반 수동 발행 데이터 흐름

```text
Manual admin or internal API
  -> posts / post_versions
  -> post_tags / post_sources
  -> markdown to sanitized HTML
  -> markdown to safe React render blocks
  -> content_hash
  -> status=published latest version
  -> /blog, /blog/:slug, /blog/:slug.md
```

public route는 `published` 상태의 최신 `post_version`만 노출한다. `ready_to_publish`, `gate_failed`, `failed_generation`, `failed_publish`, `failed_verification`, `unpublished`, `retracted` 상태는 public URL에서 보이지 않아야 한다.

SQL migration, 최소 blog repository, DB-backed public/crawler/search read path, lease 기반 persistent manual `--once` worker, fake-provider local end-to-end dry-run은 local PostgreSQL과 Nginx public boundary에서 검증됐다. Public surface는 요청 시 공통 loader를 사용하고 fixture fallback을 두지 않는다. 성공 fixture만 같은 current version/hash로 공개하고 required failure fixture는 `failed_publish`와 404로 유지한다. Worker lease는 PostgreSQL에 저장되며 timeout 전 중복 claim과 stale owner의 완료/실패 갱신을 거부한다.

```text
SQL migration - completed
  -> PostgreSQL blog repository - completed
  -> DB-backed public/crawler/search read path - completed
  -> manual --once persistent worker - completed
  -> fake-provider local end-to-end dry-run - completed
```

`auto-publish-ops-hardening` Step 4의 local rollback readiness, Hermes Codex OAuth article provider local smoke, private persistence handoff, PostgreSQL/Hermes one-shot runner, required job adapter, bounded Compose/systemd scheduler packaging까지 완료했다. Provider/model은 `openai-codex`/`gpt-5.6-sol`로 결정됐지만 OCI의 container-local Hermes OAuth, migration 배포, 공개 canary, timer 활성화와 live rollback smoke가 남아 있으므로 phase는 pending이다.

현재 admin 구현은 `lib/blog-admin.ts`의 순수 workflow contract다. preview, save, publish와 `admin_actions` audit log를 테스트하지만, 접근 제어 방식이 결정되지 않았으므로 `/admin` production route는 아직 만들지 않는다. `admin_actions`는 preview/save/publish와 retry/unpublish/retract/correct/block_topic/approve_preview 운영 명령을 기록하며, actor/target/reason/created_at을 남긴다. URL, private host, credential-like 값이 포함된 감사 사유는 저장 전에 거부하고, public blog route output에는 audit log를 포함하지 않는다. 정정은 `published -> correction_pending -> corrected -> published` 흐름을 사용한다. 정정 적용 시 기존 version을 덮어쓰지 않고 새 `post_version`과 `post_corrections`의 이전/정정 content hash를 남기며, corrected 상태는 재발행 전까지 public route에서 숨긴다. 재발행된 정정 글은 기존 slug URL을 유지한다. `unpublished`와 `retracted` 글은 public detail, Markdown endpoint, list selector에서 제외하며 generic publish workflow로 다시 공개할 수 없다.

## 자동 블로그 데이터 흐름

```text
Daily topic collector
  -> source fetch and dedupe
  -> research pack
  -> personal context mapping
  -> article mode decision
  -> LLM draft
  -> claim and privacy gate
  -> post version saved as ready_to_publish
  -> required publish jobs
  -> public route verification
  -> published
  -> retryable jobs: embedding, search_index, related_posts, llms, feed, IndexNow, Discord, OG, diagram
```

자동 글 생성은 public route가 안정된 뒤 `ready_to_publish` version을 생성하고 required publish jobs를 통과한 경우에만 `published`로 전환한다.

## 자동 블로그 최소 DB 모델

DB 전환 phase가 시작되면 `plans/automated-blog-publishing-plan.md`를 기준으로 아래 모델을 우선한다.

현재 코드 contract는 `lib/blog-content-model.ts`에 있고 핵심 6개 table schema는 `migrations/001_blog_core.sql`에 반영됐다. `lib/blog-postgres-repository.ts`는 이 6개 table의 aggregate 저장을 한 transaction으로 처리하고 기존 public selector로 published current version과 관련 tag/source/asset만 반환한다. 공개 조회 시 post/version/slug뿐 아니라 tag/source/asset 전체를 privacy scanner로 다시 검사하고 위험한 aggregate는 모든 public consumer에서 제외한다. OCI 연결과 public route 교체는 아직 포함하지 않는다. Public route selector는 `status=published`이고 `current_version_id`가 가리키는 `post_versions` record만 반환한다. `content_markdown`에서 sanitized `content_html`과 `content_hash`를 생성하며, 저장된 HTML/Markdown이 hash와 어긋나면 crawler Markdown 출력 전에 실패한다. 공개 상세 렌더링은 저장 HTML을 직접 주입하지 않고 Markdown에서 생성한 heading, paragraph, strong, code block 모델만 React로 렌더링한다. 목록 태그와 tag count는 `post_tags` contract를 기준으로 published 글에서만 계산한다. Search result는 `selectPublicBlogRouteEntries`를 통과한 글만 사용하고 `published_at`, tags, score, keyword/vector match reason을 UI 표시 필드로 노출한다. Publish state transition은 `queued -> researching -> drafted -> ready_to_publish -> publishing -> verifying -> published` 흐름을 기본으로 하며, `failed_publish -> publishing`, `failed_verification -> verifying`, `published -> correction_pending | unpublished | retracted`, `correction_pending -> corrected | retracted`, `corrected -> published`만 허용한다. Article mode는 `experiment`, `applied_analysis`, `document_analysis`, `project_record`, `ops_incident` 중 하나로 기록한다. Required publish job 실패는 `publishing -> failed_publish` 또는 `verifying -> failed_verification`으로 기록하고, retryable job 실패는 `published` 상태를 유지하면서 `retry_count`, `error`, `finished_at`을 갱신한다. `lib/blog-post-publish-verification.ts`는 public URL과 `/blog/:slug.md` surface의 `content_hash` 일치 여부, `sitemap.xml`, `feed.xml`, `llms.txt`, `llms-full.txt` crawler manifest 갱신 기준, required verification job과 retryable feed/llms/IndexNow/Discord job 분리를 고정한다. `lib/blog-crawler-output.ts`와 route handlers는 이 manifest를 실제 crawler output으로 렌더링하고, source raw snapshot이나 내부 evidence path를 추가로 노출하지 않는다. `lib/blog-post-publish-retryable-jobs.ts`는 IndexNow/Discord 실행을 adapter 뒤에 두고 외부 side effect를 기본 비활성화하며, deterministic idempotency key 검증, retry limit, operator alert, usage event 결과를 contract로 고정한다. `lib/blog-content-hash-reconciliation.ts`는 published current version만 대상으로 public HTML, `/blog/:slug.md`, sitemap/feed/llms manifest의 `content_hash`를 DB version hash와 비교하고, mismatch를 `publish_verifications`의 failed `content_version_match` required failure로 기록한다. 이 verification result에는 본문 excerpt를 저장하지 않으며, mismatch failure는 correction/retraction 운영 검토로 넘길 수 있는 `correction_pending` handoff를 남긴다. `lib/blog-topic-research.ts`는 GeekNews, 요즘IT, 기업 기술 블로그, 공식 release note, HN, GitHub, 보안/운영 feed, Reddit source type과 topic candidate scoring, 중복 URL 제거, source cache TTL, 일일 수집량 제한, `source_fetch` usage event 기록을 고정한다. 또한 topic candidate를 비공개 research pack, post source record, source snapshot으로 묶고, source snapshot에는 원문 전체 대신 짧은 excerpt, summary, claim metadata, hash만 남긴다. GeekNews/HN/Reddit 같은 discovery/reaction source는 높은 점수를 받거나 research pack에 포함돼도 claim source로 승격하지 않고, official/original source가 없는 pack은 strong claim support를 통과하지 못한다. apply-to-me contract는 `personal_context_items.allowed_usage`와 `public_safe`를 기준으로 public-safe context summary만 generation input에 넣고, ledger에 없는 직접 경험 표현, forbidden/private context, evidence 없는 experiment mode를 generation 전 `failed_generation`으로 차단한다. `post_chunks` contract는 `post_version_id`와 `content_hash`를 포함하며, `lib/blog-search.ts`의 관련 글 selector는 현재 published version과 hash가 맞는 chunk만 embedding similarity에 사용한다. stale chunk, 현재 글 자신, draft/failed target은 related 결과에서 제외하고, tag fallback은 embedding match 뒤에만 정렬한다. `post_corrections` contract는 corrected version의 `post_version_id`, `previous_content_hash`, `corrected_content_hash`, `corrected_by`, `corrected_at`, `reason`을 포함한다. `admin_actions` contract는 `actor_type`, `actor_id`, `target_type`, `target_id`, `reason`, `created_at`을 포함하며 public route boundary 밖에 둔다.

Publish job은 `job_type`, `post_version_id`, `content_hash`를 결합한 deterministic idempotency key를 사용한다. Repository 저장 경계는 key의 version/hash 결합을 검증하고 같은 논리 요청에 기존 job을 반환하며, version 또는 content hash가 바뀐 요청은 별도 job으로 저장한다.

Claim verification source policy는 `lib/blog-topic-research.ts`의 `verifyArticleClaims`가 소유한다. `version`, `date`, `price`, `api`, `performance`, `security`, `benchmark`, `support` claim은 official/original source 또는 evidence path가 있어야 하고, discovery/reaction source만으로는 통과하지 않는다. source와 claim이 모순되면 `quality_gate_results` failed record로 남기며, opinion claim은 factual verification과 분리한다. 긴 evidence quote는 저장하지 않고, 실제 외부 source fetching, LLM generation, publish side effect는 아직 수행하지 않는다.

Article output schema contract는 `lib/blog-article-generation.ts`의 `validateArticleWriterOutput`이 소유한다. Writer output은 title, slug, description, tags, article_mode, content_markdown, claims, sources, evidence_paths, personal_context_ids, publish_decision, block_reason을 구조화해서 반환해야 한다. Contract는 normalization 전에 writer output 전체를 privacy scanner로 검사하고, 위험한 값은 원문을 남기지 않는 `article_quality_gate:privacy_risk`로 차단한다. 이후 public route compatible slug와 tag 중복 제거를 검증하고, factual claim은 source URL, source id, evidence path 중 하나에 묶어야 한다. `experiment` mode는 command, code, config, API, log, cost evidence가 남는 top-level `evidence_paths` 없이는 통과하지 못한다. Quality gate는 `unsafe_claim`, `privacy_risk`, `no_evidence`, `weak_sources`, `duplicate_topic`, `style_drift`를 `quality_gate_results` failed record로 분류한다. Gate failure와 `publish_decision=block`은 public 노출 없이 `failed_generation`에 머무르고, `publish`가 통과한 경우에도 `ready_to_publish` draft content만 만들며 public route expose, external LLM call, DB write, publish side effect는 수행하지 않는다. `createArticleGenerationRunRecord`는 persona version, selected article mode, input source ids, personal_context_ids, prompt hash, output hash를 `post_generation_runs` contract 형태로 기록한다. Persona는 문체 고정 정보일 뿐이며 source/evidence 기반 claim 검증을 대체하지 않는다.

Daily cron draft-to-publish pipeline contract는 `lib/blog-daily-auto-article.ts`의 `runDailyAutoArticlePipeline`이 소유한다. 이 contract는 topic collection, ranking, research pack, apply-to-me, article generation adapter, writer validation, post version 생성, required publish job adapter, `ready_to_publish -> publishing -> verifying -> published` 전이를 한 번의 bounded run으로 묶는다. Production persistence callback이 있으면 검증된 결과를 `publishing` post, current version, sources, tags, queued required jobs로 한 번 넘긴 뒤 required job adapter를 실행하지 않고 종료한다. 이 aggregate는 published-only selector에서 숨겨지고, 같은 day key의 중복 callback/LLM 실행은 in-memory state에서 차단한다. Generation input, research pack, topic candidate는 article generation adapter 호출 전에 privacy scanner를 통과해야 한다. 하루 publish는 기본 1회로 제한하고, 중복 daily cron, `no_topic`, `weak_sources`, `budget_exceeded`, `privacy_risk`, required publish job retry limit 초과는 public store에 글을 만들지 않는다. 실제 외부 LLM/API 호출과 공개 발행 side effect는 adapter 밖에서 직접 실행하지 않는다.

Hermes article provider는 이 `generateArticle` adapter를 구현한다. 실행마다 provider/model을 명시하고 AGENTS/rules/memory 주입을 끈 뒤 verified input만 prompt에 넣는다. 반환 JSON은 기존 `validateArticleWriterOutput`과 privacy scanner를 그대로 통과해야 하며, 실제 model은 `post_generation_runs`와 `usage_events`에 기록한다. Local Windows smoke에서 `openai-codex`, `gpt-5.6-sol`, `included`, estimated cost 0을 확인했다. Production package는 `nousresearch/hermes-agent:v2026.7.7.2`를 기반으로 Node runner와 Hermes를 같은 container에 두고 OAuth state는 `hermes_data` volume에만 저장한다. OCI volume 인증과 canary 전에는 systemd timer를 켜지 않는다.

Diagram trigger policy contract는 `lib/blog-diagram-assets.ts`의 `planDiagramGenerationJob`이 소유한다. Diagram job은 published current version 글 중 topic이 `architecture`, `workflow`, `infra`, `data-flow`인 경우에만 retryable `diagram` publish job으로 예약한다. `diagramGenerationMax` quota를 초과하면 job을 만들지 않으며, diagram 생성 실패는 retryable failure로 기록해서 `published` 상태와 required publish 검증을 바꾸지 않는다. Diagram asset storage contract는 같은 모듈의 `storeDiagramAsset`이 소유한다. Asset은 `post_assets` record로 `post_id`, `post_version_id`, public-safe path, alt text, `status`, `asset_hash`, `verified_at`, `generated_by`, 생성 시각을 저장한다. 기대 SHA-256과 검증 SHA-256이 다르거나 private workspace path, 내부 host, credential-like text가 있으면 `ready` asset을 만들지 않는다. Asset 삭제/교체는 `recordDiagramAssetAuditAction`으로 감사 가능한 기록을 남긴다.

본문 삽입 gate는 `lib/blog-public.ts`가 current published version에 묶인 `ready` diagram asset 중 유효한 SHA-256과 `verified_at`을 가진 최신 1개만 선택한다. Public renderer는 첫 H2 뒤, H2가 없으면 첫 paragraph 뒤에 `<figure>`를 추가하고, missing/failed/hash mismatch/이전 version asset은 figure 전체를 생략한다. Canonical Markdown/HTML과 `content_hash`는 사후 수정하지 않으며 Markdown/feed/llms crawler output에도 diagram 설명을 반복하지 않는다.

```text
posts
post_versions
post_tags
topic_candidates
research_packs
post_sources
source_snapshots
personal_context_items
apply_to_me_results
article_claims
quality_gate_results
post_chunks
publish_jobs
publish_verifications
post_generation_runs
post_corrections
post_assets
usage_events
admin_actions
```

## 보안/프라이버시 경계

- 전화번호, 생년월일, 주소, 내부 URL, 서버 IP, API key/token, 비공개 저장소명은 공개하지 않는다.
- 고객사명, 회사명, 정량 성과, 현재 회사 내부 워크플로우는 공개 전 확인이 필요하다.
- 자동 글 생성 시 source raw text 전체를 기본 저장하지 않는다.
- GeekNews/HN/Reddit 같은 반응성 소스는 discovery 또는 reaction 역할로만 저장한다.
- LLM이 생성한 claim은 official/original source 또는 직접 실험 증거가 없으면 강한 표현으로 발행하지 않는다.
- 공개 앱 코드에서 raw HTML injection을 쓰지 않는다. `dangerouslySetInnerHTML` 재도입은 정적 보안 테스트로 차단한다.
- resume PDF rate limit의 client 식별자는 Nginx가 설정한 `X-Real-IP`를 사용하고, spoof 가능한 client supplied `X-Forwarded-For` chain을 신뢰하지 않는다.

## 검증 기준

- production behavior 변경은 TDD: RED -> expected failure -> GREEN -> REFACTOR.
- UI 변경은 데스크톱/모바일 overflow, hover/focus, 링크 동작을 확인한다.
- 콘텐츠/SEO 변경은 개인정보 노출 여부와 metadata를 확인한다.
- 자동 블로그 DB/worker 변경은 상태 전이, idempotency, retry, public exposure를 테스트한다.
- 기본 검증은 `apps/h-log`에서 실행한다.

```bash
npm run lint
npm run test
npm run typecheck
npm run build
```
