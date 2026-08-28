# Step 0: keyword-search-without-fake-embedding

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

현재 `/api/search`가 keyword-only 점수를 embedding 호출처럼 포장하는 route-local adapter를 제거한다.

- 실제 embedding provider가 없는 현재 route는 existing optional adapter를 전달하지 않는다.
- keyword search는 기존 handler의 native fallback을 그대로 사용한다.
- fake provider/model/token과 `usage_events` embedding row를 만들지 않는다.
- future real embedding adapter contract와 관련 글의 저장된 vector 계산은 삭제하지 않는다.

## 인수 기준

- fresh public keyword search가 기존 결과/status/cache contract를 유지한다.
- route-local fake embedding adapter와 fake usage ledger write가 없다.
- real adapter가 명시적으로 주입된 unit path의 budget/usage gate는 계속 동작한다.
- schema, dependency, 환경 변수는 추가하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-search.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. 현재 route composition이 keyword request를 fake embedding usage로 기록하는 RED를 남긴다.
2. route-local adapter만 제거하고 existing keyword fallback으로 GREEN을 만든다.
3. optional real adapter의 budget/ledger test와 cached published filtering을 재검증한다.
4. PRD/ADR/ARCHITECTURE의 현재 keyword runtime과 future hybrid target을 구분한다.

## 하지 말 것

- `BlogSearchEmbeddingAdapter` 전체를 삭제하지 말 것. Reason: real provider가 연결될 때 사용하는 기존 경계다.
- pgvector, `post_chunks`, related-post similarity를 제거하지 말 것. Reason: 현재 검색 route의 fake accounting과 별개다.
- fake adapter를 다른 이름으로 감싸지 말 것. Reason: 삭제가 최소 해법이다.
