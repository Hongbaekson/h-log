# Step 1: persona-and-mode-selection

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
- personal context ledger, persona version, article output schema 관련 파일

## 작업

persona는 문체를 고정하고, article mode는 evidence 수준에 맞춰 결정한다.

- experiment mode는 명령, 코드, 설정, API 호출, 로그, 비용 계산 같은 evidence가 있을 때만 허용한다.
- applied_analysis와 document_analysis는 직접 적용하지 않은 글임을 명시할 수 있어야 한다.
- persona version과 사용된 personal_context_ids를 generation run에 남긴다.
- persona는 사실 검증을 대체하지 않는다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. evidence 없이 experiment mode가 선택되는 실패 테스트를 먼저 작성한다.
2. persona version이 generation run에 기록되는지 확인한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 실제로 하지 않은 일을 "해봤다"로 쓰지 말 것.
- persona prompt에 private source 원문을 넣지 말 것.
- 글 모드와 근거 수준이 안 맞는데 자동으로 published로 넘기지 말 것.
