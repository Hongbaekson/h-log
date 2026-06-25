# Step 0: published-route-boundary

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
- 현재 파일 기반 blog loader와 route 구현

## 작업

DB 기반 수동 발행으로 전환하기 전 public route 노출 경계를 테스트로 고정한다.

- `status=published` 최신 version만 공개하는 조회 contract를 설계한다.
- `draft`, `ready_to_publish`, `gate_failed`, `failed_publish`, `failed_verification` 상태는 public URL에서 보이지 않는 테스트를 먼저 작성한다.
- 글 생성 자동화는 포함하지 않는다.
- DB 플랫폼, migration 도구, worker 분리는 별도 결정이 필요하면 멈추고 기록한다.

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
