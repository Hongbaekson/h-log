# Step 7: remove-redundant-blog-slug-proxy

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
- `apps/h-log/proxy.ts`
- `apps/h-log/next.config.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-public-read-path.test.ts`
- `apps/h-log/lib/blog-public-read-path.integration.test.ts`

## 작업

blog detail page 앞에서 같은 published slug를 선조회하는 proxy 경계를 제거한다.

- `proxy.ts`와 `isPublicBlogSlug`의 caller를 다시 확인한다.
- DB-backed detail page의 existing `notFound()`와 missing/private slug HTTP 404를 먼저 characterization한다.
- proxy 전용 source-shape assertion, `isPublicBlogSlug`, `proxy.ts`를 함께 삭제한다.
- `/blog/:slug.md`는 기존 `next.config.ts` rewrite와 Markdown route가 계속 소유한다.

## 인수 기준

- `isPublicBlogSlug`와 `__hlog-not-found` 참조가 repository에서 0건이다.
- published detail은 200, missing/private detail은 404이며 proxy 선조회는 없다.
- Markdown rewrite, canonical metadata, crawler output, privacy scan은 유지된다.
- 대체 middleware, rewrite, fallback route를 추가하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public-read-path.test.ts
npm run test:integration
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. proxy/function의 모든 caller와 matcher 범위를 다시 검색한다.
2. page-owned published/missing/private behavior를 focused test와 production-like HTTP smoke로 고정한다.
3. proxy, helper, 전용 source-shape assertion을 삭제하고 같은 behavior를 재검증한다.
4. Markdown rewrite와 전체 public/crawler gate를 확인하고 phase 문서를 동기화한다.

## 하지 말 것

- detail page의 `notFound()` 또는 published-current DB query를 제거하지 말 것. Reason: 실제 public boundary다.
- Markdown 요청을 detail HTML route로 합치지 말 것. Reason: `.md` compatibility contract는 별도 live route다.
- 새 not-found compatibility page를 만들지 말 것. Reason: Next page boundary가 이미 404를 소유한다.
