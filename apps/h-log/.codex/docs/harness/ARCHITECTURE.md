# Architecture: H-Log

기준 문서:

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`

## 현재 구현 상태

`apps/h-log`는 Next.js App Router 기반 개인 사이트다. 현재 확인된 구조는 Home, Resume, Portfolio, Blog placeholder, 프로젝트 상세, resume PDF API route, 공통 UI 컴포넌트, 프로젝트/이력 데이터 loader, 파일 기반 blog loader와 단위 테스트를 포함한다. 파일 기반 blog loader는 DB-first 전환 후 public source of truth가 아니라 import/transition support로 취급한다.

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

### future infra가 소유할 수 있다

- PostgreSQL instance
- Redis
- 백업/복구
- secret injection
- Nginx TLS
- OCI network/firewall
- 배포 runner

## 현재 앱 데이터 흐름

```text
Source content / lib data
  -> Next.js route or Server Component
  -> shared UI component
  -> rendered page
  -> metadata / sitemap / robots
```

현재 `/blog`는 placeholder다. `lib/blog.ts`의 파일 기반 loader는 public route에 연결하지 않고, DB 전환 전후 import/fixture support로만 사용한다.

## DB 기반 수동 발행 데이터 흐름

```text
Manual admin or internal API
  -> posts / post_versions
  -> markdown to sanitized HTML
  -> content_hash
  -> status=published latest version
  -> /blog, /blog/:slug, /blog/:slug.md
```

public route는 `published` 상태의 최신 `post_version`만 노출한다. `ready_to_publish`, `gate_failed`, `failed_generation`, `failed_publish`, `failed_verification`, `unpublished`, `retracted` 상태는 public URL에서 보이지 않아야 한다.

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

```text
posts
post_versions
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
