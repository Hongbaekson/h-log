# Step 0: claim-verifier-runtime-wiring

## 읽을 파일

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- `apps/h-log/lib/blog-daily-auto-article.test.ts`
- `apps/h-log/lib/blog-article-generation.ts`
- `apps/h-log/lib/blog-topic-research.ts`
- `apps/h-log/lib/blog-topic-research.test.ts`

## 작업

이미 구현된 `verifyArticleClaims`를 daily article pipeline의 writer schema 검증과 private persistence 사이에 연결한다.

- pipeline이 이미 구성한 verified `postSources`를 source of truth로 재사용한다.
- unknown source ID, discovery-only source, contradicted claim, evidence가 없는 강한 factual claim은 persistence 전에 차단한다.
- opinion claim과 기존 privacy/article quality gate는 그대로 유지한다.
- 별도 verifier, 새 저장소 table, 외부 호출은 추가하지 않는다.

## 인수 기준

- 존재하지 않는 `sourceId`를 가진 writer output이 schema validation만 통과한 뒤 저장되는 회귀 테스트가 먼저 실패한다.
- claim 검증 실패 시 `persistPublishingArticle`은 호출되지 않는다.
- 검증된 official/original source claim은 기존 private persistence handoff까지 통과한다.
- source role과 claim failure message에는 원문 excerpt나 민감값을 추가하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-daily-auto-article.test.ts lib/blog-topic-research.test.ts lib/blog-article-generation.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. unknown/discovery-only/contradicted claim이 persistence까지 도달하는 focused RED를 남긴다.
2. 기존 verifier를 한 번 호출하는 최소 연결로 GREEN을 만든다.
3. claim failure에서 persistence 호출이 0회인지 확인한다.
4. phase index와 관련 PRD/ADR/ARCHITECTURE의 실제 runtime 설명을 동기화한다.

## 하지 말 것

- `verifyArticleClaims`를 복제하거나 새 validator 계층을 만들지 말 것. Reason: 검증 정책은 이미 한 곳에 있다.
- claim 검증 실패를 warning으로 낮추지 말 것. Reason: 공개 전 무결성 경계다.
- OCI, provider, timer, production DB를 변경하지 말 것. Reason: 이 step은 local generation path만 다룬다.

## 완료 결과

- 상태: completed
- 결과: `runDailyAutoArticlePipeline`이 writer schema와 privacy/article quality gate를 통과한 normalized claim을 기존 `verifyArticleClaims`에 전달한다. Pipeline이 이미 만든 `postSources`를 그대로 사용하며 검증 실패는 post/version 생성과 `persistPublishingArticle` 호출 전에 `generation_failed`로 종료한다.
- RED: unknown `sourceId` claim이 `publishing`까지 도달하는 focused test 실패를 확인했다.
- GREEN: unknown source의 persistence 0회, 기존 official source의 private persistence 성공, discovery-only/contradicted/opinion verifier 계약을 포함한 focused 27/27을 확인했다.
- 전체 검증: `npm run test` 174개 중 162 pass, DB 환경 의존 12 skip, 실패 0. `npm run typecheck`, `npm run lint`, `npm run build`가 통과했다.
- 운영 경계: 새 verifier/table/external call을 추가하지 않았고 OCI, provider, timer, production DB를 변경하지 않았다.
- 다음 실행 대상: `generation-integrity-hardening / Step 1: hermes-no-tool-enforcement`.
