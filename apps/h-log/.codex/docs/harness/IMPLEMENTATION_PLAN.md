# Implementation Plan: H-Log Harness Baseline

이 문서는 H-Log를 Harness step으로 구현하거나 자동 블로그 플랫폼으로 전환할 때의 기준 계획이다. 실제 phase 파일은 `apps/h-log/phases/` 아래에 생성한다.

## Dogfood 구조 분석 결과

`D:\dogfood\backend`의 Codex 구조는 아래 흐름을 강제한다.

```text
AGENTS.md
  -> .codex/docs/PRD.md
  -> .codex/docs/ADR.md
  -> .codex/docs/ARCHITECTURE.md
  -> .codex/docs/BACKEND_WORKFLOW.md
  -> .codex/docs/AGENT_LOOP.md
  -> .codex/docs/IMPLEMENTATION_PLAN.md
  -> .codex/skills/harness/SKILL.md
  -> .codex/skills/tdd/SKILL.md
  -> phases/{task}/stepN.md
```

H-Log에는 같은 패턴을 아래처럼 적용한다.

```text
apps/h-log/AGENTS.md
  -> apps/h-log/.codex/docs/harness/PRD.md
  -> apps/h-log/.codex/docs/harness/ADR.md
  -> apps/h-log/.codex/docs/harness/ARCHITECTURE.md
  -> apps/h-log/.codex/docs/harness/WORKFLOW.md
  -> apps/h-log/.codex/docs/harness/AGENT_LOOP.md
  -> apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md
  -> .codex/skills/harness/SKILL.md
  -> .codex/skills/tdd/SKILL.md
  -> apps/h-log/phases/{task}/stepN.md
```

## 현재 격차

| 항목 | 상태 | 조치 |
| --- | --- | --- |
| h-log PRD/ADR/ARCHITECTURE가 placeholder | 보완 완료 | 실제 MVP와 자동 블로그 전환 기준 작성 |
| AGENT_LOOP/WORKFLOW/IMPLEMENTATION_PLAN 없음 | 보완 완료 | dogfood 구조를 h-log에 맞게 추가 |
| root skill에 harness/tdd/grill-me/sync-repos 없음 | 보완 완료 | `.codex/skills/`에 repo-local skill 추가 |
| phase index 없음 | 보완 완료 | `apps/h-log/phases/index.json` 생성 |
| 자동 블로그 계획과 MVP 방향 충돌 가능 | 정리 완료 | file-based track은 active phase index에서 제거하고, DB-first track을 다음 실행 대상으로 기록 |
| visitor chatbot 오해 가능 | 통제 필요 | 모든 문서에서 chatbot 제외 명시 |
| 자동 글의 허위 경험 표현 위험 | 통제 필요 | evidence 기반 article mode와 claim gate를 강제 |

## 현재 phase 실행 순서

수정된 `plans/automated-blog-publishing-plan.md` 기준으로 블로그 본선은 DB-first다. 기존 file-based loader는 완료된 호환 작업으로만 보존하고, `/blog` 목록/상세 구현은 DB phase에서 진행한다.

```text
phase-registry-bootstrap: completed
db-manual-publishing-mvp: completed
oci-infra-deployment-foundation: completed
publish-state-and-admin: completed, steps 0-3 completed
oci-server-runtime-setup: completed, steps 0-3 completed
search-and-related-posts: completed, steps 0-3 completed
post-publish-seo-automation: steps 0-2 completed, step 3 pending
topic-research-generation
auto-article-generation
diagram-assets-automation
feedback-and-persona-learning
auto-publish-ops-hardening
```

## 완료된 호환 이력

### 파일 기반 loader 호환 이력

- 상태: completed
- 역할: 기존 Markdown/MDX 글 import, fixture, 전환 지원
- 주의: DB-first phase가 시작된 뒤 public source of truth로 확장하지 않는다.
- active phase index에서는 제외한다. 새 블로그 목록/상세 구현은 `db-manual-publishing-mvp`에서만 진행한다.

## 현재 DB-first 진행 상태

### db-manual-publishing-mvp / Step 0: db-content-model-contract

- 목표: `posts`, `post_versions`, `post_sources`, `publish_jobs`의 최소 model contract를 정한다.
- 상태: completed
- 결과: `lib/blog-content-model.ts`와 테스트로 version content, `content_hash`, `current_version_id`, publish job 중요도 경계를 고정했다.
- 검증: `npm run test`, `npm run typecheck`

### db-manual-publishing-mvp / Step 1: published-route-boundary

- 상태: completed
- 목표: public blog 조회가 `status=published`이면서 `current_version_id`가 가리키는 version만 반환하도록 route/query 경계를 고정한다.
- 결과: `selectPublicBlogRouteEntries`와 `selectPublicBlogRouteEntryBySlug`로 published-only public lookup 경계를 고정했다.
- 검증: `npm run test`, `npm run typecheck`, `npm run build`

### db-manual-publishing-mvp / Step 2: markdown-html-version-boundary

- 상태: completed
- 목표: Markdown/HTML canonical content와 `content_hash` 검증 경계를 고정한다.
- 결과: `content_markdown`에서 sanitized `content_html`과 `content_hash`를 생성하고, HTML/Markdown drift가 생기면 `.md` 출력과 integrity 검증이 실패하도록 고정했다. 공개 상세 렌더링은 저장 HTML 직접 주입이 아니라 Markdown 기반 안전 렌더링 블록을 사용한다.
- 검증: `npm run test`, `npm run typecheck`
- 주의: 실제 OCI DB 연결은 아직 하지 않는다.

### db-manual-publishing-mvp / Step 3: blog-public-routes-and-md-endpoint

- 상태: completed
- 목표: DB content model과 published-only selector를 `/blog`, `/blog/[slug]`, `/blog/[slug].md` public route에 연결한다.
- 결과: `lib/blog-public.ts`, `lib/blog-public-data.ts`, `/blog`, `/blog/[slug]`, `/blog/:slug.md` route를 추가해 public route가 같은 published-only boundary를 사용하도록 연결했다. 상세 렌더링은 Markdown 기반 typed content block을 React로 출력하고, source link는 public HTTPS URL만 공개한다.
- 검증: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`
- 주의: preview/admin route를 public route와 섞지 않는다.

### db-manual-publishing-mvp / Step 4: public-blog-index-surface

- 상태: completed
- 목표: `/blog` 목록에 날짜, 제목, 요약, 태그, 태그별 카운트, 페이지네이션을 제공한다.
- 결과: published 글만 기준으로 tag count와 pagination을 계산하고, 검색 UI는 다음 `search-and-related-posts` phase로 남겼다.
- 검증: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`

### db-manual-publishing-mvp / Step 5: minimal-admin-preview-save-publish

- 상태: completed
- 목표: 자동 작성 전 수동 발행을 위한 preview/save/publish 최소 admin workflow를 고정한다.
- 결과: `lib/blog-admin.ts`와 테스트로 preview, save, publish, `admin_actions` audit log를 고정했다. source URL은 저장 전 public HTTPS URL로 검증한다. 접근 제어 방식이 미정이므로 `/admin` production route는 공개하지 않았다.
- 검증: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`
- 다음 결정: 실제 관리자 화면을 route로 공개하려면 인증/접근 제어 방식을 먼저 정해야 한다.

## 현재 OCI foundation 진행 상태

### oci-infra-deployment-foundation / Steps 0-4

- 상태: completed
- 결과: Dockerfile, Compose topology, local Nginx reverse proxy, admin/internal route blocking, security headers, fixed upstream proxy, trusted `X-Real-IP` boundary, PostgreSQL logical dump 기반 backup/restore runbook, deploy smoke/rollback runbook을 고정했다.
- 검증: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm audit --audit-level=moderate`, source-only `gitleaks`, Semgrep `--novcs`, `git diff --check`

## 현재 발행 상태/관리자 진행 상태

### publish-state-and-admin / Step 0: publish-state-machine

- 상태: completed
- 결과: `lib/blog-content-model.ts`와 테스트로 publish state transition contract를 고정했다. 직접 `ready_to_publish -> published` 전환은 막고, publish/retry/unpublish/retract/correct에 필요한 명시 전이만 허용한다.
- 검증: focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`

### publish-state-and-admin / Step 1: required-vs-retryable-jobs

- 상태: completed
- 결과: `lib/blog-content-model.ts`와 테스트로 required publish job 실패는 `failed_publish` 또는 `failed_verification`으로 전환하고, retryable job 실패는 `published` 상태를 유지하면서 `retry_count`와 실패 사유를 기록하도록 고정했다.
- 검증: focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, `npm run test`, `npm run typecheck`

### publish-state-and-admin / Step 2: admin-actions-audit-log

- 상태: completed
- 결과: `lib/blog-admin.ts`와 테스트로 `retry`, `unpublish`, `retract`, `correct`, `block_topic`, `approve_preview` 운영 명령을 `admin_actions`에 남기는 contract를 고정했다. 감사 로그는 `actor_type`, `actor_id`, `target_type`, `target_id`, `reason`, `created_at`을 기록하고, URL/private host/credential-like 값을 포함한 감사 사유는 저장 전에 거부한다. public blog output은 `admin_actions`를 노출하지 않는다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-admin.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-admin.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, `npm run test`, `npm run typecheck`

### publish-state-and-admin / Step 3: correction-unpublish-retract-flow

- 상태: completed
- 결과: `lib/blog-admin.ts`와 테스트로 `published -> correction_pending -> corrected -> published` 운영 흐름을 고정했다. correction은 기존 version을 덮어쓰지 않고 새 `post_version`과 `post_corrections`의 `previous_content_hash`/`corrected_content_hash` 기록을 남긴다. corrected 상태는 재발행 전까지 public route에서 숨기고, 재발행 시 기존 slug URL을 유지한다. `unpublished`와 `retracted` 글은 public detail/Markdown/list 경계에서 제거하며 generic publish workflow로 다시 공개할 수 없다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-admin.test.ts`, RED focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-admin.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, `npm run test`, `npm run typecheck`
- 다음 실행 대상은 phase registry 기준으로 관리한다.

## 현재 검색/관련 글 진행 상태

### search-and-related-posts / Steps 0-3

- 상태: completed
- 결과: `lib/blog-search.ts`와 테스트로 published-only hybrid search, embedding purpose boundary, `/api/search` cache/rate-limit/abnormal-query cost guard, `usage_events` recording, fresh `post_chunks` 기반 related similarity contract를 고정했다. 관련 글 selector는 현재 published version과 `content_hash`가 맞는 chunk만 embedding similarity에 사용하고, stale chunk, 현재 글 자신, draft/failed target은 결과에서 제외한다. `/blog` 검색 UI는 `/api/search` 결과를 사용해 published 글의 title, description, date, tags, score, match reason을 보여주며 cached/loading/empty/rate-limited/error 상태를 처리한다. tag fallback은 허용하되 embedding match 뒤에 정렬한다.
- 검증: focused `node --no-warnings --test --experimental-strip-types lib/blog-search.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-search-ui.test.ts`, `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`
- 다음 실행 대상: `post-publish-seo-automation / Step 3: content-hash-reconciliation`

## 현재 발행 후 SEO 자동화 진행 상태

### post-publish-seo-automation / Step 0: post-publish-verification-jobs

- 상태: completed
- 결과: `lib/blog-post-publish-verification.ts`와 테스트로 public URL, `/blog/:slug.md` surface의 `content_hash` 검증 contract를 고정했다. `sitemap.xml`, `feed.xml`, `llms.txt`, `llms-full.txt` crawler manifest는 published current version만 포함하며, preview/failed 상태 글은 제외한다. Required verification job과 retryable feed/llms/IndexNow/Discord job을 분리하고, required 실패는 publish 차단 또는 운영 검토 상태로, retryable 실패는 `published` 유지로 판정한다. 실제 IndexNow 제출과 Discord 알림 전송은 수행하지 않는다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-post-publish-verification.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-post-publish-verification.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-search.test.ts`

### post-publish-seo-automation / Step 1: crawler-output-generation

- 상태: completed
- 결과: `lib/blog-crawler-output.ts`와 route handlers로 `sitemap.xml`, `feed.xml`, `llms.txt`, `llms-full.txt`를 생성한다. 출력은 Step 0의 published-only manifest를 재사용하고, current version `content_hash`를 검증하며, preview/failed/unpublished/retracted 글은 제외한다. `llms-full.txt`는 공개된 글의 canonical Markdown만 싣고 source raw snapshot, 내부 evidence path, secret, private URL은 추가로 노출하지 않는다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-crawler-output.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-crawler-output.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-post-publish-verification.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts`, `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`

### post-publish-seo-automation / Step 2: indexnow-discord-retryable-jobs

- 상태: completed
- 결과: `lib/blog-post-publish-retryable-jobs.ts`와 테스트로 IndexNow 제출과 Discord 발행 알림을 retryable job contract로 고정했다. 실제 외부 호출은 adapter 뒤에 두고 `allowExternalSideEffects`가 명시된 경우에만 실행한다. deterministic idempotency key를 adapter 호출 전 검증하고, 실패 시 글의 `published` 상태를 유지하면서 `retry_count`/`error`를 갱신한다. retry limit에 도달하면 무한 재시도하지 않고 operator alert 결과만 남긴다. webhook URL, token, channel id는 코드/fixture에 남기지 않는다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-post-publish-retryable-jobs.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-post-publish-retryable-jobs.test.ts`
- 다음 실행 대상: `post-publish-seo-automation / Step 3: content-hash-reconciliation`

## 이후 DB-first 단계

1. DB 기반 수동 발행 블로그
2. OCI 인프라 및 배포 foundation
3. 발행 상태와 최소 관리자 운영
4. 하이브리드 검색과 관련 글
5. 발행 후 SEO/AI crawler 자동화 - Steps 0-2 completed, Step 3 pending
6. 주제 수집과 research pack
7. 자동 글 생성
8. 다이어그램 asset 자동화
9. 성과 피드백과 persona learning
10. 운영 안정화

## 완료 기준

- Harness baseline 문서와 phase template이 존재한다.
- root `.codex/skills`에 dogfood에서 확인한 skill 4개가 h-log에 맞게 추가된다.
- `apps/h-log/phases/index.json`이 DB-first 실행 순서를 기록한다.
- 다음 실행 대상은 `post-publish-seo-automation / Step 3: content-hash-reconciliation`이다.
- 문서 검증과 `git diff --check`가 통과한다.
