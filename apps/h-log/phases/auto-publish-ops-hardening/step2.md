# Step 2: usage-events-cost-ledger

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
- source fetch, LLM, embedding, diagram, IndexNow, Discord adapter 관련 파일

## 작업

외부 호출과 비용성 작업을 `usage_events`로 집계한다.

- event_type, provider, model, input_tokens, output_tokens, estimated_cost, status를 기록한다.
- daily/monthly budget을 초과하면 새 자동 생성과 비용성 job을 멈춘다.
- 검색 API embedding 호출 비용도 별도로 기록한다.
- 비용 한도 초과는 `budget_exceeded` failure로 분류한다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. LLM/embedding 호출이 usage_events 없이 실행되는 실패 테스트를 먼저 작성한다.
2. budget 초과 시 비용성 job이 block되는지 확인한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 실제 비용 provider를 테스트에서 호출하지 말 것.
- token이나 secret을 usage_events에 저장하지 말 것.
- 비용 한도 초과를 단순 warning으로만 남기지 말 것.
