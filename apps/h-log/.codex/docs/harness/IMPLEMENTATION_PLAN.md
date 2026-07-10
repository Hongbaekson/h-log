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
| contract 완료와 runtime 완료 혼동 | 보완 진행 | 실제 PostgreSQL/migration/worker가 없는 phase는 contract baseline으로 명시하고 `blog-runtime-integration` 추가 |
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
blog-runtime-integration: pending
auto-publish-ops-hardening: pending
feedback-and-persona-learning: pending
```

`completed`인 DB/검색/자동 글 phase는 현재 contract/test baseline 완료를 뜻한다. 실제 PostgreSQL persistence, migration, persistent worker, 외부 provider, scheduler가 동작한다는 뜻이 아니다.

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
- 다음 실행 대상은 `blog-runtime-integration / Step 0: postgres-schema-and-migration-runner`이다.

## 다음 runtime 통합 phase

### blog-runtime-integration

현재 contract-only 구현을 local Compose의 실제 persistence vertical slice로 연결한다.

1. `postgres-schema-and-migration-runner`: PostgreSQL schema, vector extension, migration version을 local DB에서 검증한다.
2. `postgres-blog-repository`: current domain contract를 재사용하는 최소 DB read/write adapter를 만든다.
3. `db-backed-public-read-path`: 정적 production store를 DB-backed published-only route/crawler/search source로 교체한다.
4. `persistent-worker-once-runner`: placeholder worker를 DB job 하나를 처리하고 종료하는 manual runner로 교체한다.
5. `local-end-to-end-dry-run`: fake provider로 DB write부터 public surface까지 local vertical slice를 검증한다.

실제 provider, cron, OCI runtime 변경, public publish는 이 phase에 포함하지 않는다. `auto-publish-ops-hardening` 완료 단계에서 사용자 승인 후 canary로 활성화한다.

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
