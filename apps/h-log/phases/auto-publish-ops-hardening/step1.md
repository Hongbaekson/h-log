# Step 1: persistent-job-lock-and-retry-stop

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
- publish_jobs, daily cron, usage_events 관련 파일

## 작업

PostgreSQL에 저장되는 job lease와 retry stop condition으로 동시 worker의 중복 처리와 실패 루프를 막는다.

- 한 worker만 job lease를 획득하고, lease timeout 이후에만 안전하게 재획득한다.
- 같은 실패 사유가 2회 반복되면 해당 stage를 중단한다.
- 중복 cron 실행이 같은 글을 두 번 publish하지 않게 한다.
- retry stop은 usage_events와 alert 결과에 남긴다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. 두 worker가 같은 persisted job을 동시에 처리하는 실패 테스트를 먼저 작성한다.
2. lease owner만 상태를 완료/실패로 갱신할 수 있는지 확인한다.
3. retry limit 도달 후 비용성 job이 멈추는지 확인한다.
4. `npm run test`, `npm run typecheck`를 실행한다.
5. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 무제한 retry를 만들지 말 것.
- process-local mutex만으로 job lock을 구현하지 말 것.
- 실패 루프를 성공 상태로 숨기지 말 것.
