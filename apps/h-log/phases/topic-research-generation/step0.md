# Step 0: research-pack-boundary

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
- post publish automation과 published route 관련 파일

## 작업

완전 자동 글 생성을 시작하기 전 research pack과 claim 검증 경계를 만든다.

- GeekNews, HN, Reddit 등 반응성 source는 discovery/reaction 용도로만 분류한다.
- official/original source 없이 강한 기술 claim을 통과시키지 않는 테스트를 작성한다.
- `personal_context_ledger`에 없는 경험을 "직접 해봤다"로 표현하지 못하게 한다.
- persona는 문체에만 적용하고 사실 검증을 대체하지 않는다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 증거 없는 경험 표현이 실패하는 테스트를 먼저 작성한다.
2. discovery-only source가 claim verification을 통과하지 못하는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 원문 전체를 기본 저장하지 말 것. 이유: 저작권과 개인정보 리스크가 있다.
- 자동 생성 글을 quality gate 없이 published로 전환하지 말 것.
- LLM 출력만으로 사실 검증을 완료 처리하지 말 것.
