# Step 3: claim-verification-source-policy

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
- article_claims, post_sources, quality_gate_results 관련 파일

## 작업

본문 claim 단위 검증 정책을 코드 contract로 만든다.

- version, date, price, API, performance, security, benchmark, support claim은 source 또는 evidence가 필요하다.
- discovery/reaction source만 있는 강한 claim은 통과하지 않는다.
- source와 claim이 모순되면 quality gate failure로 남긴다.
- opinion claim과 factual claim을 분리한다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. source 없는 강한 claim이 통과하는 실패 테스트를 먼저 작성한다.
2. discovery-only source가 claim verification을 통과하지 못하는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- source 개수만으로 claim 검증을 완료 처리하지 말 것.
- LLM 자기평가를 factual verification으로 사용하지 말 것.
- 긴 copyrighted excerpt를 저장하거나 공개하지 말 것.
