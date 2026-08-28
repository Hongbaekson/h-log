# Step 1: guard-before-public-store-load

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
- `apps/h-log/app/api/search/route.ts`
- `apps/h-log/lib/blog-search.ts`
- `apps/h-log/lib/blog-search.test.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`

## 작업

search request guard가 PostgreSQL-backed public store load보다 먼저 실행되게 한다.

- route에서 guard를 복제하지 않고 existing request handler가 store를 지연 로드하도록 바꾼다.
- short, abnormal, duplicate, rate-limited request는 store loader를 호출하지 않는다.
- allowed request와 cache hit는 현재 published/retracted filtering에 필요한 시점에만 store를 읽는다.
- SQL query나 cache policy를 이 step에서 재설계하지 않는다.

## 인수 기준

- blocked request fixture에서 public store loader 호출은 0회다.
- allowed keyword request 결과와 HTTP status는 기존과 같다.
- cache hit도 현재 store를 기준으로 retracted post를 제거한다.
- request history/cache 상한과 client IP trust policy는 변하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-search.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. blocked query 전에 store loader가 호출되는 focused RED를 남긴다.
2. existing handler input을 lazy loader로 바꾸는 최소 구현으로 GREEN을 만든다.
3. allowed/cache-hit/retract/budget 회귀를 함께 확인한다.
4. phase index와 search runtime 문서를 동기화한다.

## 하지 말 것

- route와 handler에 동일 guard를 두 벌 만들지 말 것. Reason: 정책 drift가 생긴다.
- cached result의 current published 재검증을 생략하지 말 것. Reason: retract 직후 stale 노출을 막는 경계다.
- Redis나 분산 rate limiter를 추가하지 말 것. Reason: 이번 문제는 eager DB read다.
