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

## 운영 활성화 경계

- 이 step의 contract 완료에는 도메인이 필요하지 않다.
- 같은 일자·후보·실패 유형의 첫 실패는 후보 우선순위를 낮추고, 두 번째 실패는 해당 일자 발행을 포기하며 이후 등록은 거부한다.
- Registry에는 최대 160자의 privacy-redacted summary만 저장하고, 실제 generation prompt/quality gate 연결과 DB persistence는 production HTTPS 활성화 뒤에 수행한다.
- Step 2 완료 뒤 남은 다음 작업은 실제 공개 origin, privacy 목록, signal collection과 production timer를 연결하는 domain cutover다.

## 하지 말 것

- 실패한 LLM 출력 전체를 무제한 저장하지 말 것.
- 같은 실패를 비용성 API 호출로 계속 반복하지 말 것.
- 민감정보 탐지 결과의 원문을 그대로 보관하지 말 것.
