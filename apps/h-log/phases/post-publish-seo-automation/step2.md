# Step 2: indexnow-discord-retryable-jobs

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
- publish_jobs, usage_events, notification adapter 관련 파일

## 작업

IndexNow 제출과 Discord 알림을 retryable job으로 만든다.

- 실제 외부 호출은 adapter 뒤에 두고 테스트에서는 fake를 사용한다.
- 실패 시 글 공개 상태를 유지하고 `publish_jobs`에 실패 사유를 기록한다.
- 같은 optional job이 반복 실패하면 retry를 멈추고 알림만 남긴다.
- 외부 side effect는 사용자 승인 또는 환경 설정이 있을 때만 실행한다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. IndexNow/Discord 실패가 published 상태를 내리지 않는 테스트를 작성한다.
2. retry limit과 idempotency key를 focused test로 검증한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 실제 IndexNow나 Discord webhook을 테스트에서 호출하지 말 것.
- 실패 job을 무한 재시도하지 말 것.
- webhook URL, token, channel id를 코드나 fixture에 남기지 말 것.
