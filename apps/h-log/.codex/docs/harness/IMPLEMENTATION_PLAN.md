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
db-manual-publishing-mvp: next
oci-infra-deployment-foundation
publish-state-and-admin
search-and-related-posts
post-publish-seo-automation
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

- 상태: next
- 목표: public blog 조회가 `status=published`이면서 `current_version_id`가 가리키는 version만 반환하도록 route/query 경계를 고정한다.
- 주의: 실제 OCI DB 연결이나 자동 글 생성은 아직 하지 않는다.

## 이후 DB-first 단계

1. DB 기반 수동 발행 블로그
2. OCI 인프라 및 배포 foundation
3. 발행 상태와 최소 관리자 운영
4. 하이브리드 검색과 관련 글
5. 발행 후 SEO/AI crawler 자동화
6. 주제 수집과 research pack
7. 자동 글 생성
8. 다이어그램 asset 자동화
9. 성과 피드백과 persona learning
10. 운영 안정화

## 완료 기준

- Harness baseline 문서와 phase template이 존재한다.
- root `.codex/skills`에 dogfood에서 확인한 skill 4개가 h-log에 맞게 추가된다.
- `apps/h-log/phases/index.json`이 DB-first 실행 순서를 기록한다.
- 다음 step은 `db-manual-publishing-mvp/step1.md`다.
- 문서 검증과 `git diff --check`가 통과한다.
