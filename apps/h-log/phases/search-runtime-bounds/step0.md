# Step 0: bounded-process-local-search-state

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
- `apps/h-log/lib/blog-usage-ledger.ts`

## 작업

long-lived `/api/search` module state의 메모리 상한을 고정한다.

- request window 밖의 history와 만료 cache entry를 요청 평가 전에 제거한다.
- cache에는 작은 고정 최대 개수를 둔다. 새 환경 변수나 Redis는 추가하지 않는다.
- PostgreSQL `usage_events` ledger가 이미 보유한 usage 기록과 중복되는 process-local `usageEvents`는 제거하고, 테스트는 durable ledger 호출을 검증한다.
- cache hit에서도 현재 published selector를 다시 적용하는 기존 retract 보호를 유지한다.

## 인수 기준

- 오래된 history가 이후 요청의 rate limit 또는 duplicate 판정에 영향을 주지 않는다.
- 많은 고유 검색어에도 cache와 history는 고정된 상한을 넘지 않는다.
- cache hit, abnormal query, budget guard, published-only/retract filtering의 현재 HTTP 결과는 변하지 않는다.
- embedding usage는 계속 persistent ledger에 기록된다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-search.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
```

## 검증

1. 오래된 history/cache 및 최대 cache 수를 재현하는 focused RED를 작성한다.
2. 최소 prune/eviction 구현 후 GREEN을 확인한다.
3. durable usage ledger 호출과 retracted cache result 제거 회귀를 focused test로 확인한다.
4. phase index status와 summary를 갱신한다.

## 하지 말 것

- 분산 rate limiter, Redis client, 새 observability dependency를 추가하지 말 것. Reason: 현재 single-process local state를 안전하게 bounded하게 만드는 것이 이번 step의 범위다.
- client IP trust boundary를 임의로 확장하지 말 것. Reason: Nginx `X-Real-IP` 정책 변경은 별도 edge 설계다.
