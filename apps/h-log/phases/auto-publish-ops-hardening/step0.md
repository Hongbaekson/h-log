# Step 0: idempotency-and-quota

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
- topic generation, publish jobs, search 비용 기록 관련 파일

## 작업

자동 발행 운영 안정화 기준을 구현한다.

- job lock과 idempotency key로 중복 발행을 막는 테스트를 작성한다.
- source fetch, LLM, embedding, search API 비용을 usage event로 집계한다.
- 일일/월간 quota 초과 시 새 자동 생성과 비용성 job을 멈춘다.
- 실패 사유별 알림과 retry stop condition을 분리한다.
- rollback, unpublish, retract, correct 명령의 감사 기록을 확인한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 중복 cron 실행이 중복 발행으로 이어지는 실패 테스트를 먼저 작성한다.
2. quota 초과 시 비용성 job이 멈추는지 확인한다.
3. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 무제한 자동 재시도를 만들지 말 것. 이유: 비용과 중복 발행 위험이 크다.
- 외부 알림이나 실제 발행을 승인 없이 수행하지 말 것. 이유: public side effect가 있다.
- 운영 로그에 API key, 내부 URL, 서버 IP를 남기지 말 것.
