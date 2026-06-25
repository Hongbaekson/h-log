# Step 2: apply-to-me-context-ledger

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
- research pack, personal_context_items, apply_to_me_results 관련 파일

## 작업

글감이 홍백님의 공개 가능한 기술 맥락에 어떻게 걸리는지 판단하는 `apply-to-me` 단계를 만든다.

- `personal_context_items`는 allowed_usage와 public_safe를 가진다.
- article mode는 experiment, applied_analysis, document_analysis, project_record, ops_incident 중 하나로 결정한다.
- ledger에 없는 직접 경험 표현은 차단한다.
- 공개 불가 context가 본문 후보에 들어가면 generation 전 실패로 남긴다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. ledger에 없는 경험을 "직접 해봤다"로 쓰려는 실패 테스트를 먼저 작성한다.
2. forbidden/public_safe=false context가 generation input에 들어가지 않는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- private context 원본을 LLM prompt에 그대로 넣지 말 것.
- evidence 없이 experiment mode로 승격하지 말 것.
- 회사/고객사/비공개 저장소명을 context fixture에 넣지 말 것.
