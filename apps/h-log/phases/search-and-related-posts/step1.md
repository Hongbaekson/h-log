# Step 1: search-api-cost-guard

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
- search contract, usage event, rate limit 관련 파일

## 작업

`/api/search`가 임베딩 비용 폭주를 만들지 않도록 비용 방어 contract를 만든다.

- 짧은 query, 반복 query, 비정상 패턴은 임베딩 호출 전에 차단하거나 cache hit로 처리한다.
- query cache TTL과 rate limit 기준을 테스트한다.
- embedding provider 호출은 adapter 뒤에 숨기고 테스트에서는 fake를 사용한다.
- 비용성 호출은 `usage_events`에 기록한다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 반복 query가 매번 embedding 호출로 이어지는 실패 테스트를 먼저 작성한다.
2. rate limit과 cache 동작을 focused test로 검증한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 모든 검색마다 외부 embedding API를 호출하지 말 것.
- 봇 방어를 이유로 정상 검색 기능을 완전히 막지 말 것.
- 방문자 대화 session이나 chatbot memory를 만들지 말 것.
