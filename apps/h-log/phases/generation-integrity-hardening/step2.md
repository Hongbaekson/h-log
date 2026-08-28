# Step 2: quality-gate-failure-reason-handoff

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
- `apps/h-log/lib/blog-article-generation.ts`
- `apps/h-log/lib/blog-article-generation.test.ts`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- `apps/h-log/lib/blog-daily-auto-article.test.ts`
- `apps/h-log/lib/blog-auto-publish-runner.ts`
- `apps/h-log/lib/blog-auto-publish-runner.test.ts`
- `apps/h-log/scripts/blog-auto-publish.mjs`

## 작업

article validation과 claim verification이 만든 redacted failure 정보를 one-shot 운영 결과까지 전달한다.

- 모든 차단을 `generation_failed` 하나로만 반환하지 않고 기존 gate category/name/message를 보존한다.
- raw writer output, claim text, URL, 내부 값은 결과나 로그에 추가하지 않는다.
- 현재 pipeline/runner result와 stderr/stdout JSON 경계만 사용하고 새 DB table은 추가하지 않는다.
- durable quality history가 실제 운영 요구로 확인되기 전에는 persistence contract를 만들지 않는다.

## 인수 기준

- privacy, duplicate, unsupported claim 등 서로 다른 실패가 redacted category로 구분된다.
- one-shot runner/operator output에서 실패 단계와 안전한 사유를 확인할 수 있다.
- 성공 결과와 exit code, usage ledger, persistence 호출 횟수는 변하지 않는다.
- 민감 문자열 fixture는 출력에 나타나지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-article-generation.test.ts lib/blog-daily-auto-article.test.ts lib/blog-auto-publish-runner.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. 서로 다른 gate failure가 동일한 generic result로 축약되는 focused RED를 남긴다.
2. 기존 redacted `qualityGateResults`를 최소 result field로 전달해 GREEN을 만든다.
3. raw input 누출 금지와 성공/중복 실행 회귀를 함께 확인한다.
4. PRD/ARCHITECTURE/장기 계획의 감사 로그 표현을 실제 persistence 범위에 맞춘다.

## 하지 말 것

- 새 migration이나 `quality_gate_results` table을 추측으로 추가하지 말 것. Reason: 현재 필요한 것은 운영 결과 전달이다.
- 실패 원문 전체를 log에 출력하지 말 것. Reason: privacy 경계다.
- failure registry framework를 다시 만들지 말 것. Reason: caller 없는 이전 contract를 이미 제거했다.
