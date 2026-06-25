# Step 3: correction-unpublish-retract-flow

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
- publish state machine, post version, admin actions 관련 파일

## 작업

자동 발행 이후 틀린 글을 빠르게 내리거나 정정하는 흐름을 만든다.

- `published -> correction_pending -> corrected -> published` 흐름을 테스트한다.
- `published -> unpublished`와 `published -> retracted`의 public route 동작을 구분한다.
- correction은 새 `post_version`과 `post_corrections` 기록을 남긴다.
- 기존 URL 유지 여부와 retract 페이지 정책이 미정이면 문서에 decision point를 남긴다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 정정 전후 content_hash가 기록되지 않는 실패 테스트를 먼저 작성한다.
2. unpublished/retracted 상태가 public 목록과 검색에서 제외되는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 기존 version을 덮어쓰지 말 것. 이유: 자동 발행 정정 이력이 필요하다.
- retracted 글의 본문을 계속 공개하지 말 것.
- 검색/related index에서 내려간 글을 남겨두지 말 것.
