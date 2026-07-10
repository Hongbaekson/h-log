# Step 1: postgres-blog-repository

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-public.ts`
- Step 0에서 추가한 migration과 DB 연결 파일

## 작업

현재 순수 domain contract를 유지하면서 PostgreSQL persistence adapter를 추가한다.

- `posts`, `post_versions`, `post_tags`, `post_sources`, `post_assets`, `publish_jobs`의 현재 step에 필요한 read/write만 구현한다.
- public read는 `published`이면서 `current_version_id`가 일치하는 version만 반환한다.
- transaction은 post/version/current version 갱신처럼 원자성이 필요한 경계에만 둔다.
- domain rule을 SQL adapter 안에 복제하지 않고 기존 contract를 재사용한다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run lint
```

## 검증

1. 실제 local PostgreSQL에서 draft/failed version이 public repository 결과에 섞이는 RED를 만든다.
2. 최소 query로 published current version과 관련 tag/source/asset을 읽고 쓴다.
3. transaction 실패 시 current version만 앞서 바뀌지 않는지 확인한다.
4. 성공 시 phase index의 step status와 summary를 갱신한다.

## 하지 말 것

- 모든 table을 위한 범용 repository 계층을 만들지 말 것.
- public query에서 preview/admin 상태를 반환하지 말 것.
- 테스트 편의를 위해 production query에 raw fixture fallback을 넣지 말 것.
