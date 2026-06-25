# Step 2: failure-pattern-registry

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
- quality_gate_results, failed generation, persona version 관련 파일

## 작업

반복 실패를 금지 패턴으로 축적한다.

- weak_sources, unsafe_claim, privacy_risk, no_evidence, style_drift 같은 실패 유형을 분류한다.
- 같은 실패가 반복되면 해당 일자의 발행을 포기하거나 후보를 낮춘다.
- 금지 패턴은 다음 generation prompt와 quality gate에 반영된다.
- failure registry도 private-safe summary만 저장한다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. 같은 실패 사유가 무한 retry되는 실패 테스트를 먼저 작성한다.
2. 금지 패턴이 private raw text 없이 저장되는지 확인한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 실패한 LLM 출력 전체를 무제한 저장하지 말 것.
- 같은 실패를 비용성 API 호출로 계속 반복하지 말 것.
- 민감정보 탐지 결과의 원문을 그대로 보관하지 말 것.
