# Step 1: persona-example-learning

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
- persona_versions, performance signals, article output 관련 파일

## 작업

성과 좋은 글의 구조를 persona examples로 축적하는 contract를 만든다.

- 제목 패턴, section 구조, closing pattern, evidence density를 요약해 저장한다.
- 원문 전체를 persona example에 복사하지 않는다.
- persona version 변경은 active flag와 hash를 가진다.
- persona update가 자동 발행 결과를 악화시키면 rollback할 수 있게 기록한다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. published 본문 전체를 persona example로 저장하는 실패 테스트를 먼저 작성한다.
2. persona version hash와 active 전환을 검증한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 성과 좋은 글 원문 전체를 prompt 재료로 복사하지 말 것.
- persona update를 사실 검증 기준으로 사용하지 말 것.
- 실패한 스타일을 active persona에 자동 반영하지 말 것.
