# Architecture: H-Log

기준 문서:

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`

## 현재 구현 상태

`apps/h-log`는 Next.js App Router 기반 개인 사이트다. 현재 확인된 구조는 Home, Resume, Portfolio, DB-contract 기반 Blog 목록/상세/Markdown endpoint, 프로젝트 상세, resume PDF API route, 공통 UI 컴포넌트, 프로젝트/이력 데이터 loader, 파일 기반 blog loader와 단위 테스트, DB 기반 blog content model contract, published-only public route selector, Markdown-to-sanitized-HTML version/hash boundary, Markdown 기반 안전 렌더링 블록, publish state transition contract, route로 공개하지 않은 최소 admin preview/save/publish workflow contract를 포함한다. 파일 기반 blog loader는 DB-first 전환 후 public source of truth가 아니라 import/transition support로 취급한다.

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
     -> hlog-worker     manual/profile-only placeholder until automation phases
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
- `compose.yaml`: local-first Compose topology for web, worker placeholder, PostgreSQL + pgvector, Redis, and Nginx.
- `deploy/nginx/conf.d/hlog.conf`: local Nginx reverse proxy, fixed `hlog-web:3000` upstream, trusted proxy IP headers, admin/internal blocking, static asset cache headers, and baseline security headers.
- `deploy/env.dev`: placeholder-only local development values for web/worker. Real production secrets, server IPs, SSH keys, API keys, and private URLs must not be written there.
- `.codex/docs/backup-restore-runbook.md`: PostgreSQL logical dump, local/test restore rehearsal, pgvector extension, future migration version, content hash, and public smoke verification checklist. It does not contain production dump files, server IPs, or credentials.
- `.codex/docs/deploy-smoke-rollback-runbook.md`: local/OCI deploy smoke, registry pull, compose up, health/log checks, phase-gated sitemap/feed/llms checks, private route blocking checks, migration rollback gate, and previous-image approval-only rollback procedure. It does not contain server IPs, SSH key paths, registry tokens, or production secrets.

Container environment is scoped by service. PostgreSQL receives only `POSTGRES_*` values, Redis receives no application secrets, and web/worker receive only the runtime URLs and mode flags needed for local validation.

The worker service is intentionally profile-gated and non-automatic. It must not call LLM, embedding, IndexNow, Discord, or publish jobs until the later automation phases define tested job behavior.

Kubernetes is not required for the initial OCI deployment. If a later ADR adopts Kubernetes, the current service boundary maps directly to `Deployment`/`Service` for web and worker, `StatefulSet` or managed services for PostgreSQL/Redis, `Ingress` for Nginx edge behavior, and `Job`/`CronJob` for migration, backup, and worker tasks.

## Backup/Restore Boundary

H-Log uses PostgreSQL logical dump as the first backup method for the self-hosted DB. Restore is not considered complete until a local/test rehearsal validates the restored database.

Restore checks include:

- `vector` extension exists in the restored PostgreSQL database.
- migration version matches the app image being deployed. The current repo has no migration runner yet, so this check is recorded as not applicable until migration tooling is introduced.
- `posts.current_version_id` points to a restored `post_versions` row.
- `post_versions.content_hash` values are present and match the app-side content hash contract.
- public blog routes expose only `published` current versions after restore smoke.

Operational backup files and restore logs can contain unpublished content or personal data. They must stay outside the repository and must not include server IPs, DB passwords, Object Storage credentials, signed URLs, or private hostnames in committed files.

## Deploy Smoke/Rollback Boundary

Deploy smoke is the release gate for the OCI Compose runtime. It checks the current public app routes, Nginx proxy/security headers, container health, and DB migration safety before a release is considered operational.

Current public smoke includes:

- `/`, `/resume`, `/portfolio`, `/blog`
- `/blog/db-first-public-boundary`
- `/blog/db-first-public-boundary.md`, served through the `/blog/:slug.md` rewrite
- `/admin` and `/api/internal/*` returning 404 through Nginx until authentication/authorization is explicitly decided

`sitemap.xml`, `feed.xml`, `llms.txt`, and `llms-full.txt` are planned crawler surfaces, but the current app has no route files for them yet. They become mandatory smoke targets in the SEO automation phase that introduces them.

Rollback uses the previous image tag and server-local env/Compose boundary. If a deploy includes DB migration or content hash changes, rollback is blocked until migration rollback or restore rehearsal is confirmed.

## 현재 앱 데이터 흐름

```text
Source content / lib data
  -> Next.js route or Server Component
  -> shared UI component
  -> rendered page
  -> metadata / sitemap / robots
```

현재 `/blog`, `/blog/[slug]`, `/blog/:slug.md`는 `lib/blog-public.ts`와 `lib/blog-public-data.ts`를 통해 DB content contract 형태의 public store를 읽는다. public selector는 published 최신 version만 반환하고, `ready_to_publish` 같은 preview/admin 상태는 목록, 상세, Markdown endpoint에 노출하지 않는다. 상세 페이지는 저장된 `content_html`을 raw HTML로 주입하지 않고 `content_markdown`에서 만든 typed content block을 React 요소로 렌더링한다. source link는 public HTTPS URL만 허용하고 `javascript:`, `data:`, localhost, private/internal host는 저장 또는 공개 단계에서 차단한다. `lib/blog.ts`의 파일 기반 loader는 public route에 연결하지 않고, DB 전환 전후 import/fixture support로만 사용한다.

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

현재 admin 구현은 `lib/blog-admin.ts`의 순수 workflow contract다. preview, save, publish와 `admin_actions` audit log를 테스트하지만, 접근 제어 방식이 결정되지 않았으므로 `/admin` production route는 아직 만들지 않는다.

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
  -> retryable jobs: embedding, search, sitemap, feed, llms, IndexNow, Discord
```

자동 글 생성은 public route가 안정된 뒤 `ready_to_publish` version을 생성하고 required publish jobs를 통과한 경우에만 `published`로 전환한다.

## 자동 블로그 최소 DB 모델

DB 전환 phase가 시작되면 `plans/automated-blog-publishing-plan.md`를 기준으로 아래 모델을 우선한다.

현재 코드 contract는 `lib/blog-content-model.ts`에 있으며 실제 DB adapter, migration, OCI 연결은 아직 포함하지 않는다. Public route selector는 `status=published`이고 `current_version_id`가 가리키는 `post_versions` record만 반환한다. `content_markdown`에서 sanitized `content_html`과 `content_hash`를 생성하며, 저장된 HTML/Markdown이 hash와 어긋나면 crawler Markdown 출력 전에 실패한다. 공개 상세 렌더링은 저장 HTML을 직접 주입하지 않고 Markdown에서 생성한 heading, paragraph, strong, code block 모델만 React로 렌더링한다. 목록 태그와 tag count는 `post_tags` contract를 기준으로 published 글에서만 계산한다. Publish state transition은 `queued -> researching -> drafted -> ready_to_publish -> publishing -> verifying -> published` 흐름을 기본으로 하며, `failed_publish -> publishing`, `failed_verification -> verifying`, `published -> correction_pending | unpublished | retracted`, `correction_pending -> corrected | retracted`, `corrected -> published`만 허용한다.

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
