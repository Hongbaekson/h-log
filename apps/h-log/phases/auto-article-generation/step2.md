# Step 2: quality-gate-publish-decision

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
- article output schema, claim verification, privacy scanner 관련 파일

## 작업

자동 생성 결과가 발행 가능한지 결정하는 quality gate를 만든다.

- unsafe_claim, privacy_risk, no_evidence, weak_sources, duplicate_topic, style_drift를 gate failure로 분류한다.
- gate 실패 시 public route에 노출하지 않고 실패 사유를 남긴다.
- 통과 시 `ready_to_publish` post_version을 생성한다.
- `ready_to_publish`에서 바로 `published`로 바꾸지 않고 required publish jobs로 넘긴다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. privacy risk가 있는 output이 ready_to_publish로 가는 실패 테스트를 먼저 작성한다.
2. gate failure가 public route에 노출되지 않는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- quality gate 실패 글을 published로 전환하지 말 것.
- gate failure reason을 덮어쓰거나 버리지 말 것.
- 자동 발행 실패를 성공 알림으로 보내지 말 것.
