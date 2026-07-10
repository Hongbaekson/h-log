# Step 3: persistent-worker-once-runner

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
- `apps/h-log/compose.yaml`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- publish job/state transition 관련 파일
- Step 1 PostgreSQL repository 파일

## 작업

placeholder worker를 local/manual `--once` 실행 가능한 persistent job runner로 교체한다.

- 한 번 실행할 때 DB에서 최대 1개 job을 읽고 기존 state transition contract를 통해 처리한다.
- 외부 LLM, embedding, IndexNow, Discord 호출은 fake/disabled adapter만 사용한다.
- 성공/실패/retry 결과를 `publish_jobs`와 관련 상태에 저장한다.
- 반복 polling, cron, production restart policy는 아직 활성화하지 않는다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run lint
docker compose --profile worker config
```

## 검증

1. queued job이 처리 후에도 DB에 queued로 남는 RED를 먼저 만든다.
2. `--once`가 한 job만 처리하고 종료하는지 확인한다.
3. adapter failure가 기존 retry/terminal 상태 규칙대로 저장되는지 확인한다.
4. 성공 시 phase index의 step status와 summary를 갱신한다.

## 하지 말 것

- 무한 polling worker나 자동 cron을 켜지 말 것.
- 테스트나 local smoke에서 실제 외부 API를 호출하지 말 것.
- job 상태를 메모리에만 남기지 말 것.
