# Step 1: published-route-boundary

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/phases/db-manual-publishing-mvp/step0.md`
- DB content model contract 관련 파일

## 작업

public route가 `status=published`인 최신 `post_version`만 조회하도록 경계를 테스트로 고정한다.

- `draft`, `ready_to_publish`, `gate_failed`, `failed_publish`, `failed_verification`, `unpublished`, `retracted`는 public URL에서 보이지 않게 한다.
- `published` 글도 최신 공개 version만 목록/상세에 노출한다.
- preview나 admin 조회는 public route와 분리한다.
- sitemap, feed, llms, `.md` endpoint에도 같은 published-only 규칙을 적용할 준비를 한다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 비공개 상태가 public route에 노출되는 실패 테스트를 먼저 확인한다.
2. 최소 구현으로 published-only 경계를 통과시킨다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 자동 글 생성부터 구현하지 말 것. 이유: DB 수동 발행 경계가 먼저 안정돼야 한다.
- 비공개 상태의 글을 sitemap, feed, llms, `.md` endpoint에 노출하지 말 것.
- 방문자 챗봇을 추가하지 말 것.
