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
| contract 완료와 runtime 완료 혼동 | 보완 완료 | local PostgreSQL migration/repository/public read path/manual worker/fake-provider dry-run을 local runtime 완료로 기록하고 provider/scheduler activation은 별도로 유지 |
| 성과 학습이 운영 안정화보다 먼저 배치됨 | 순서 수정 | runtime integration과 ops hardening 이후에 aggregate signal/persona learning 진행 |
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
post-publish-seo-automation: completed, steps 0-3 completed
topic-research-generation: completed, steps 0-3 completed
auto-article-generation: completed, steps 0-3 completed
diagram-assets-automation: completed, steps 0-2 completed
blog-runtime-integration: completed, steps 0-4 completed
auto-publish-ops-hardening: pending, steps 0-3 completed
feedback-and-persona-learning: pending
```

`completed`인 DB/검색/자동 글 phase는 현재 contract/test baseline 완료를 뜻한다. Local PostgreSQL persistence, migration, manual worker는 구현됐지만 외부 provider와 scheduler가 동작한다는 뜻은 아니다.

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
- 다음 실행 대상은 phase registry 기준으로 관리한다.

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

### post-publish-seo-automation / Step 3: content-hash-reconciliation

- 상태: completed
- 결과: `lib/blog-content-hash-reconciliation.ts`와 테스트로 published current version만 대상으로 public HTML, `/blog/:slug.md`, `sitemap.xml`, `feed.xml`, `llms.txt`, `llms-full.txt`의 `content_hash`를 DB version hash와 비교한다. mismatch는 warning이 아니라 `publish_verifications`의 failed `content_version_match` required failure로 기록하고, 본문 excerpt를 verification result에 저장하지 않는다. 실패 결과는 `published -> correction_pending` 운영 검토와 correction/retraction handoff를 남긴다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-content-hash-reconciliation.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-content-hash-reconciliation.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-post-publish-verification.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-crawler-output.test.ts`
- 완료 후 주제 수집 phase로 이동했다.

## 현재 주제 수집 진행 상태

### topic-research-generation / Step 0: source-collector-and-ranking

- 상태: completed
- 결과: `lib/blog-topic-research.ts`와 테스트로 topic source type, source role, ranking score, duplicate URL suppression, source cache TTL, daily source limit, `source_fetch` usage event contract를 고정했다. GeekNews/HN/Reddit 같은 discovery/reaction source는 높은 점수를 받아도 claim source로 승격하지 않는다. 실제 외부 수집, research pack 생성, 글 생성, 발행은 아직 수행하지 않는다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-topic-research.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-topic-research.test.ts`
- 완료 후 `topic-research-generation / Step 1: research-pack-boundary`로 이동했다.

### topic-research-generation / Step 1: research-pack-boundary

- 상태: completed
- 결과: `lib/blog-topic-research.ts`와 테스트로 topic candidate를 비공개 research pack, post source record, source snapshot으로 묶는 contract를 고정했다. snapshot은 원문 전체 저장을 거부하고 짧은 excerpt, summary, claim metadata, hash만 남긴다. official/original source가 없으면 strong claim support를 통과하지 못한다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-topic-research.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-topic-research.test.ts`
- 완료 후 `topic-research-generation / Step 2: apply-to-me-context-ledger`로 이동했다.

### topic-research-generation / Step 2: apply-to-me-context-ledger

- 상태: completed
- 결과: `lib/blog-topic-research.ts`와 `lib/blog-content-model.ts` 테스트로 `personal_context_items`와 `apply_to_me_results` contract를 고정했다. `allowed_usage`, `public_safe`, 5개 article mode(`experiment`, `applied_analysis`, `document_analysis`, `project_record`, `ops_incident`)를 기록하고, ledger에 없는 직접 경험 표현, forbidden/private context, evidence 없는 experiment mode는 generation 전 `failed_generation`으로 차단한다. Generation input에는 public-safe context summary만 전달한다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-topic-research.test.ts`, RED focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-topic-research.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, `npm run typecheck`
- 완료 후 `topic-research-generation / Step 3: claim-verification-source-policy`로 이동했다.

### topic-research-generation / Step 3: claim-verification-source-policy

- 상태: completed
- 결과: `lib/blog-topic-research.ts`와 `lib/blog-content-model.ts` 테스트로 `article_claims`, `quality_gate_results`, factual/opinion claim 분리, source/evidence 필수 정책, discovery/reaction source만 있는 강한 claim 차단, source contradiction failure를 고정했다. 긴 evidence quote는 저장하지 않는다. 실제 외부 source verification, LLM 생성, 발행은 아직 수행하지 않는다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-topic-research.test.ts`, RED focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-topic-research.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`
- 완료 후 `auto-article-generation / Step 0: article-output-schema`로 이동했다.

## 현재 자동 글 생성 진행 상태

### auto-article-generation / Step 0: article-output-schema

- 상태: completed
- 결과: `lib/blog-article-generation.ts`와 `lib/blog-content-model.ts` 테스트로 LLM writer output schema, required field gate, public-route compatible slug/tag normalization, source/evidence-backed factual claim check, `publish_decision=block` private failure, `publish` result as `ready_to_publish` draft only, and `post_generation_runs` contract를 고정했다. 실제 LLM 호출, DB 저장, 공개 발행 side effect는 추가하지 않았다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-article-generation.test.ts`, RED focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-article-generation.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`, `npm run typecheck`

### auto-article-generation / Step 1: persona-and-mode-selection

- 상태: completed
- 결과: `lib/blog-article-generation.ts`와 테스트로 `experiment` mode가 concrete experiment evidence path 없이 통과하지 못하도록 고정했다. `createArticleGenerationRunRecord`는 persona version, selected article mode, input source ids, personal_context_ids, prompt hash, output hash를 `post_generation_runs` 형태로 기록한다. Persona는 style/version 기록이며 factual claim verification을 대체하지 않는다. 실제 LLM 호출, DB 저장, 공개 발행 side effect는 추가하지 않았다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-article-generation.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-article-generation.test.ts`, `npm run test`, `npm run typecheck`

### auto-article-generation / Step 2: quality-gate-publish-decision

- 상태: completed
- 결과: `lib/blog-article-generation.ts`와 테스트로 `unsafe_claim`, `privacy_risk`, `no_evidence`, `weak_sources`, `duplicate_topic`, `style_drift`를 publish quality gate failure로 기록하는 contract를 고정했다. Gate failure는 `quality_gate_results`에 남고 `failed_generation`/private 상태를 유지한다. 통과한 output도 `ready_to_publish` draft content까지만 만들며 `ready_to_publish -> published` 직접 전환, LLM 호출, DB 저장, 공개 발행 side effect는 추가하지 않았다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-article-generation.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-article-generation.test.ts`, `npm run test`, `npm run typecheck`, `npm run build`

### auto-article-generation / Step 3: daily-cron-draft-to-publish

- 상태: completed
- 결과: `lib/blog-daily-auto-article.ts`와 테스트로 collect/rank/research/apply/generate/validate/create version/required publish jobs/published 전환을 하나의 bounded daily pipeline contract로 연결했다. 같은 daily cron이 중복 실행돼도 하루 1회만 published 상태가 되고, `no_topic`, `weak_sources`, `budget_exceeded`, required publish job retry limit 초과는 public route에 글을 만들지 않는다. 실제 외부 LLM/API 호출과 공개 발행 side effect는 `generateArticle`, `runRequiredPublishJob` adapter 뒤에 둔다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-daily-auto-article.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-daily-auto-article.test.ts`, `npm run typecheck`

## 다이어그램 asset 자동화 완료 상태

### diagram-assets-automation / Step 0: diagram-trigger-policy

- 상태: completed
- 결과: `lib/blog-diagram-assets.ts`와 테스트로 diagram trigger policy contract를 고정했다. Published current version 글 중 topic이 `architecture`, `workflow`, `infra`, `data-flow`인 경우에만 retryable `diagram` publish job을 예약하고, `diagramGenerationMax` quota 초과 시 job을 만들지 않는다. Diagram 생성 실패는 retryable failure로 기록해서 글의 `published` 상태를 유지하며, required publish 검증과 분리한다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-diagram-assets.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-diagram-assets.test.ts`
- 완료 후 `diagram-assets-automation / Step 1: diagram-asset-storage`로 이동했다.

### diagram-assets-automation / Step 1: diagram-asset-storage

- 상태: completed
- 결과: `lib/blog-content-model.ts`의 `post_assets` contract와 `lib/blog-diagram-assets.ts`의 `storeDiagramAsset`으로 diagram asset 저장 경계를 고정했다. Asset은 current published post version에 묶이고, public-safe `/blog-assets/` path, alt text, `generated_by`를 요구한다. Private workspace path, 내부 host, credential-like text는 거부한다. 삭제/교체는 `recordDiagramAssetAuditAction`으로 감사 가능한 기록을 남긴다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-diagram-assets.test.ts`, GREEN focused `node --no-warnings --test --experimental-strip-types lib/blog-diagram-assets.test.ts`, focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts`
- 완료 후 `diagram-assets-automation / Step 2: article-diagram-insertion-gate`로 이동했다.

### diagram-assets-automation / Step 2: article-diagram-insertion-gate

- 상태: completed
- 결과: `post_assets`에 `status`, `asset_hash`, `verified_at` 경계를 추가하고, 저장 시 기대 SHA-256과 검증 SHA-256이 일치한 asset만 `ready`로 만든다. Public renderer는 current published version의 검증된 최신 diagram 하나만 첫 H2 뒤 또는 첫 paragraph 뒤에 `<figure>`로 출력한다. Missing, failed, invalid hash, 이전 version asset은 생략하며 canonical Markdown/HTML/content hash는 바꾸지 않는다.
- crawler: Markdown/feed/llms output에는 diagram 설명을 추가로 반복하지 않는다.
- 검증: RED focused `node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts lib/blog-diagram-assets.test.ts lib/blog-public.test.ts lib/blog-crawler-output.test.ts`, GREEN focused 동일 명령 32/32 통과. 전체 `npm run test` 100/100, `npm run lint`, `npm run typecheck`, `npm run build`도 통과했다.
- runtime integration 후속 기록은 phase registry를 따른다.

## 현재 runtime 통합 phase

### blog-runtime-integration

현재 contract-only 구현을 local Compose의 실제 persistence vertical slice로 연결한다.

#### Step 0: postgres-schema-and-migration-runner

- 상태: completed
- 결과: `pg` driver, `migrations/001_blog_core.sql`, `scripts/blog-migrations.mjs`, profile-gated `hlog-migrate` service를 추가했다. 첫 migration은 `vector` extension과 다음 repository 단계가 사용할 핵심 6개 table만 만든다.
- 검증: schema 없는 격리 DB의 RED, migration 적용 후 extension/table/version 확인, 두 번째 실행 `applied=0`, `npm run test`, `npm run typecheck`, `npm run lint` 통과.
- 운영 경계: local Compose에만 적용했으며 OCI DB, repository, public route는 변경하지 않았다.
- 다음 실행 대상: `blog-runtime-integration / Step 1: postgres-blog-repository`.

#### Step 1: postgres-blog-repository

- 상태: completed
- 결과: `lib/blog-postgres-repository.ts`에 핵심 6개 table의 최소 aggregate 저장과 published-current 공개 조회 adapter를 추가했다. 저장은 post/version/current version과 tag/source/asset/publish job을 한 transaction으로 처리하고, 공개 조회는 기존 domain selector를 재사용한다.
- 검증: 실제 local PostgreSQL에서 missing module RED, published/preview/failed 분리와 연관 데이터 조회 GREEN, related write unique failure 시 current version과 새 version rollback GREEN, `npm run test`, `npm run typecheck`, `npm run lint` 통과.
- 운영 경계: 정적 public route store, OCI DB, worker, provider, scheduler, public publish는 변경하지 않았다.
- 다음 실행 대상: `blog-runtime-integration / Step 2: db-backed-public-read-path`.

#### Step 2: db-backed-public-read-path

- 상태: completed
- 결과: `lib/blog-public-source.ts`의 공통 PostgreSQL loader를 `/blog`, 상세, Markdown, sitemap/feed/llms, search에 연결했다. Production surface는 정적 fixture import를 제거하고 request-time dynamic rendering을 사용하며 DB failure를 fixture fallback으로 숨기지 않는다. Crawler 절대 URL은 Nginx 내부 host 대신 `HLOG_PUBLIC_BASE_URL`을 사용한다.
- 검증: production surface의 static fixture import RED, 공통 loader GREEN, 실제 local PostgreSQL의 DB-only published 글이 public/crawler/search에 반영되는 GREEN, draft/failed/corrected/retracted 제외, local Next/Nginx 목록·상세·Markdown·sitemap·search smoke, `npm run test`, `npm run typecheck`, `npm run lint`, 권한 허용 `npm run build` 통과.
- 운영 경계: worker, OCI runtime, provider, scheduler, 실제 공개 발행은 변경하지 않았다.
- 다음 실행 대상: `blog-runtime-integration / Step 3: persistent-worker-once-runner`.

#### Step 3: persistent-worker-once-runner

- 상태: completed
- 결과: `lib/blog-persistent-worker.ts`와 `scripts/blog-worker.mjs`로 queued/retrying job을 최대 한 건 claim하고 종료하는 PostgreSQL-backed `--once` worker를 추가했다. 성공은 `succeeded`, required 실패는 post의 `failed_publish`/`failed_verification`, retryable 실패는 3회 한도까지 `retrying` 후 terminal `failed`로 transaction 저장한다.
- 검증: missing module RED, required adapter 예외 RED, retry/terminal RED 뒤 실제 local PostgreSQL GREEN 3/3, `npm run typecheck`, `npm run lint`, `docker compose --profile worker config --quiet`, worker image build와 idle `--once` smoke 통과.
- 운영 경계: 외부 API adapter는 비활성화했고 polling, cron, OCI runtime, public publish는 변경하지 않았다.
- 다음 실행 대상: `blog-runtime-integration / Step 4: local-end-to-end-dry-run`.

#### Step 4: local-end-to-end-dry-run

- 상태: completed
- 결과: `lib/blog-local-dry-run.ts`, `scripts/blog-local-dry-run.mjs`, Compose `dry-run` profile을 추가했다. 고정된 fake topic으로 성공/실패 aggregate를 DB에 저장하고 required job을 처리한다. 모든 required job이 성공한 current version만 `published`로 전환하며, required failure는 `failed_publish`로 남긴다.
- public 검증: 성공 글은 Nginx를 통해 HTML, Markdown, sitemap, feed, llms에 같은 slug/version/hash로 노출되고 실패 글은 404이며 crawler output에도 포함되지 않는다.
- 검증: worker publish-transition RED와 dry-run missing-module RED를 각각 확인했다. PostgreSQL 통합 테스트 5/5, `docker compose --profile dry-run run --rm --build hlog-dry-run`, 전체 `npm run test` 103 pass/8 environment skip, `npm run typecheck`, `npm run lint`, `npm run build`, 기본/worker/dry-run Compose config가 통과했다.
- 운영 경계: deterministic local fixture와 fake adapter만 사용했다. 외부 provider, scheduler, OCI runtime, production domain, 실제 공개 발행은 변경하지 않았다.
- 다음 실행 대상: `auto-publish-ops-hardening / Step 1: persistent-job-lock-and-retry-stop`.

1. `postgres-schema-and-migration-runner`: completed. PostgreSQL schema, vector extension, migration version과 재실행 안정성을 local DB에서 검증했다.
2. `postgres-blog-repository`: completed. Current domain contract를 재사용하는 최소 DB read/write adapter와 transaction rollback을 local PostgreSQL에서 검증했다.
3. `db-backed-public-read-path`: completed. 정적 production store를 공통 DB-backed published-only route/crawler/search source로 교체했다.
4. `persistent-worker-once-runner`: completed. DB job 최대 한 건을 claim하고 성공/실패/retry 결과를 저장한 뒤 종료하는 manual runner로 교체했다.
5. `local-end-to-end-dry-run`: completed. Fake provider로 DB write부터 Nginx public/crawler surface까지 local vertical slice를 검증했다.

실제 provider, cron, OCI runtime 변경, public publish는 이 phase에 포함하지 않는다. `auto-publish-ops-hardening` 완료 단계에서 사용자 승인 후 canary로 활성화한다.

## 현재 운영 안정화 phase

### auto-publish-ops-hardening

#### Step 0: idempotency-key-contract

- 상태: completed
- 결과: 모든 publish job 생성 경로가 `job_type:post_version_id:content_hash` 형식의 공통 deterministic key를 사용한다. PostgreSQL repository는 저장 전 version/hash 결합을 검증하고, 같은 논리 요청이 다시 들어오면 새 row 대신 기존 job을 반환한다. Version 또는 content hash가 달라진 요청은 서로 다른 key로 저장된다.
- 검증: missing export RED를 확인한 뒤 focused test 17/17, 관련 비-DB test 38/38, 실제 PostgreSQL repository 통합 test 3/3, 전체 `npm run test` 104 pass/9 environment skip, `npm run typecheck`, `npm run lint`, `npm run build`가 통과했다.
- 운영 경계: 새 schema나 dependency를 추가하지 않았고 job lock, retry stop, 비용 집계, privacy scanner, provider/scheduler/OCI/public publish activation은 변경하지 않았다.

#### Step 1: persistent-job-lock-and-retry-stop

- 상태: completed
- 결과: `002_publish_job_leases` migration과 persistent worker에 PostgreSQL lease owner/expiry를 추가했다. Lease timeout 전에는 다른 worker가 같은 job을 claim하지 못하고, timeout 후 재획득한 현재 owner만 성공/실패 상태를 저장할 수 있다. Retryable job은 같은 실패 사유가 2회 반복되면 terminal failure로 중단하며, 같은 transaction에서 `usage_events` retry stop row를 저장하고 operator-alert 결과를 반환한다.
- 검증: 실제 PostgreSQL에서 lease column missing RED, 동일 오류 2회 중단 RED, durable `usage_events` relation missing RED를 확인한 뒤 worker 통합 test 5/5, migration 통합 test 1/1, 전체 `npm run test` 104 pass/10 environment skip, `npm run typecheck`, `npm run lint`, `npm run build`가 통과했다.
- 운영 경계: 5분 lease, retry stop, 해당 중단 event의 최소 persistence만 추가했다. 외부 호출 비용 집계와 budget guard, privacy scanner, 실제 provider, scheduler, OCI runtime, public publish activation은 변경하지 않았다.
- 다음 실행 대상: `auto-publish-ops-hardening / Step 2: usage-events-cost-ledger`.

#### Step 2: usage-events-cost-ledger

- 상태: completed
- 결과: `lib/blog-usage-ledger.ts`에 기존 PostgreSQL `usage_events`를 사용하는 공통 멱등 원장과 UTC 일/월 비용 집계를 추가했다. Daily article source fetch/LLM, 검색 API embedding, IndexNow/Discord retryable job은 provider/model/token/estimated cost/status를 같은 형식으로 기록한다. LLM/embedding은 원장 없이는 호출하지 않고, 설정한 일/월 한도에 도달하면 새 비용성 작업을 `budget_exceeded`로 차단한다. 검색 route는 `HLOG_DAILY_ESTIMATED_COST_LIMIT`, `HLOG_MONTHLY_ESTIMATED_COST_LIMIT`을 사용하며 미설정 상태는 이후 activation 전까지 무제한이다.
- 검증: LLM usage 누락, embedding 원장 누락, persisted daily/monthly budget 초과 RED를 확인한 뒤 전체 `npm run test` 113 pass/10 environment skip, `npm run typecheck`, `npm run lint`, `npm run build`가 통과했다.
- 운영 경계: 새 schema나 dependency를 추가하지 않았다. 실제 provider, cron/scheduler, OCI runtime, public auto-publish activation은 여전히 비활성화이며 production activation 전에 유한한 예산 값을 정해야 한다.

#### Step 3: privacy-scanner-and-redaction

- 상태: completed
- 결과: `lib/blog-privacy-scanner.ts`의 공통 scanner가 token/API key, 내부 URL/IP, 개인 연락처, 명시적으로 설정한 회사/고객사명과 비공개 저장소명을 탐지한다. Daily pipeline은 generation input을 LLM 호출 전에 검사하고 writer output은 normalization 전에 검사한다. PostgreSQL public read는 published current post/version과 tag/source/asset 전체를 다시 검사해 민감한 aggregate를 모든 public consumer에서 제외한다.
- 감사 경계: 실패 기록은 `article_quality_gate:privacy_risk`와 finding category만 남기고 민감 원문 대신 `[REDACTED]`를 저장한다. 서버 로컬 설정은 `HLOG_PRIVACY_ORGANIZATION_NAMES`, `HLOG_PRIVACY_PRIVATE_REPOSITORIES` JSON 배열을 사용하며 잘못된 JSON은 fail closed 처리한다.
- 검증: 내부 URL/token 공개 실패 RED를 확인한 뒤 focused privacy/generation/daily/public selector test, 전체 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`가 통과했다.
- 운영 경계: 새 schema나 dependency를 추가하지 않았다. 실제 provider, cron/scheduler, OCI runtime, public auto-publish activation은 여전히 비활성화다.
- 다음 실행 대상: 사용자 승인 후 `auto-publish-ops-hardening / Step 4: production-activation-and-rollback-smoke`.

#### Step 4: production-activation-and-rollback-smoke

- 상태: pending (local rollback/provider/scheduler packaging completed)
- 현재 결과: retracted 글이 기존 검색 TTL cache에 남는 RED를 확인하고, cache hit도 현재 published selector를 통과한 결과만 반환하도록 수정했다. `003_publish_rollback_audit` migration과 PostgreSQL repository에 transaction 기반 retract/admin audit 저장, rollback verification 저장을 추가했다. Provider/model은 Hermes `openai-codex`/`gpt-5.6-sol`로 결정했고, `included`/estimated cost 0이 아닌 실행을 거부하는 article adapter와 실제 local one-shot smoke를 추가했다. PostgreSQL/Hermes one-shot runner는 서울 날짜 advisory lock과 결정적 post ID 중복 확인을 먼저 수행하고, 검증된 결과를 `publishing` aggregate로 저장한 뒤 public 전이 전에 종료한다. Bounded cycle은 같은 daily post의 required job만 처리하며, 공식 Hermes image 기반 Compose service와 09:00 KST systemd timer를 비활성 package로 추가했다.
- local 검증: fake-provider 성공 글을 철회한 뒤 public detail, Markdown, sitemap, feed, llms, search index, related posts에서 제거되고 `admin_actions` 1건과 `publish_verifications` 8건이 저장되는 통합 GREEN을 확인했다. 감사 로그 저장 실패 시 철회 상태도 rollback되는 원자성 검증을 포함해 PostgreSQL 통합 test 12/12, 전체 `npm run test` 120 pass/10 environment skip, `npm run typecheck`, `npm run lint`, `npm run build`, 기본/worker/dry-run Compose config가 통과했다.
- provider 검증: missing provider module RED, generation model audit RED, tool-loop 차단 RED를 확인한 뒤 focused test 10/10, 전체 `npm run test` 124 pass/11 environment skip, `npm run lint`, `npm run typecheck`, `npm run build`, 실제 Hermes one-shot의 `openai-codex`/`gpt-5.6-sol`/estimated cost 0 JSON 응답이 통과했다.
- runner 검증: missing runner RED 후 서울 날짜 중복 DB 확인 전에는 usage/Hermes/persistence가 실행되지 않는 focused test 2/2, daily pipeline 포함 focused test 9/9, `npm run typecheck`, `npm run lint`가 통과했다.
- required adapter 검증: missing module/stage export RED 후 사전 `render`/`privacy_scan`과 공개 후 URL/Markdown/sitemap/content hash adapter focused test 22/22가 통과했다. Worker는 사전 작업만 끝난 canary를 공개하고 public required 실패를 `correction_pending`으로 숨기며, 격리 PostgreSQL 통합 test 6/6이 통과했다.
- scheduler 검증: missing cycle/post scope/systemd package RED와 logged-out exit 0 preflight RED 후 focused test 11/11, `npm run typecheck`, scheduler profile 포함 Compose config와 Node syntax check가 통과했다. Daily cycle은 required job 수 + idle probe 1회로 제한되고 다른 post/retryable job을 claim하지 않으며, OAuth가 logged out이면 timer service가 시작되지 않는다.
- 의존성 보안 검증: local registry audit의 high 취약점 4건을 `next`/`eslint-config-next` 16.2.11과 패치된 transitive dependency로 해소했다. `npm audit` 0건, 전체 test 140 pass/12 environment skip, `npm run lint`, `npm run typecheck`, `npm run build`, Node 24 Alpine production image build와 image 내부 `sharp` 0.35.3 PNG 변환이 통과했다. OCI의 `08cff26` artifact는 아직 이 패치를 포함하지 않는다.
- 운영 경계: 2026-07-24 commit `08cff26815d304460f335d7d1459fd0d01f8e1af` artifact를 OCI 기준 경로에 반영하고 이전 artifact를 rollback 경로에 보존했다. `hlog-auto-publish` image와 `hermes_data` container-local OAuth preflight를 검증했으며, pre-migration logical backup을 격리 DB에 복구한 뒤 migrations `001`-`003` 적용과 idempotent 재실행까지 확인했다. 기존 service와 timer는 변경하지 않았다. Server-local production credential/env/input, live migration, canary 1건, live rollback smoke가 끝날 때까지 Step 4와 phase는 완료 처리하지 않는다.
- 다음 실행 대상: 저장소 placeholder를 사용하는 현재 DB credential을 server-local secret으로 회전하고 production env/input read-only mount를 준비한다. 그 다음 live migration을 적용하고 timer를 켜기 전에 수동 canary 1건과 rollback smoke를 실행한다.

## 이후 DB-first 단계

1. DB 기반 수동 발행 블로그
2. OCI 인프라 및 배포 foundation
3. 발행 상태와 최소 관리자 운영
4. 하이브리드 검색과 관련 글
5. 발행 후 SEO/AI crawler 자동화 - completed, Steps 0-3 completed
6. 주제 수집과 research pack - completed, Steps 0-3 completed
7. 자동 글 생성 - completed, Steps 0-3 completed
8. 다이어그램 asset 자동화 - completed, Steps 0-2 completed
9. PostgreSQL/worker runtime 통합
10. 운영 안정화와 승인된 production canary
11. 성과 피드백과 persona learning

## 완료 기준

- Harness baseline 문서와 phase template이 존재한다.
- root `.codex/skills`에 dogfood에서 확인한 skill 4개가 h-log에 맞게 추가된다.
- `apps/h-log/phases/index.json`이 DB-first 실행 순서를 기록한다.
- 다음 실행 대상은 phase registry의 첫 번째 pending phase이다.
- contract 완료와 production runtime 완료를 구분해 기록한다.
- 문서 검증과 `git diff --check`가 통과한다.
