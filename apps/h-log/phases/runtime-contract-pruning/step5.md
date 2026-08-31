# Step 5: remove-test-only-public-data-fixture

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
- `apps/h-log/lib/blog-public-data.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public-source.ts`

## 작업

runtime caller가 없는 200-line `blog-public-data.ts` fixture를 test-local data로 축소한다.

- repository 전체에서 `blogContentStore` import/call을 다시 확인하고 runtime consumer가 0건인지 증명한다.
- `blog-public.test.ts`의 inline-code compatibility assertion은 같은 파일의 기존 `createStore`/`createVersion` builder로 필요한 Markdown만 만든다.
- 전용 import와 `blog-public-data.ts`를 삭제한다.
- public runtime source는 PostgreSQL-backed `blog-public-source.ts`로 유지한다.

## 인수 기준

- `blog-public-data.ts`와 `blogContentStore` 참조가 repository에서 0건이다.
- inline code, published-only detail, Markdown, diagram insertion characterization은 그대로 통과한다.
- 삭제한 fixture를 대체하는 새 shared fixture/module을 만들지 않는다.
- 실제 DB-backed public data와 사용자 콘텐츠는 변경하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. production, script, test import를 다시 검색하고 sole test caller를 기록한다.
2. 기존 public characterization test를 baseline으로 실행한다.
3. 필요한 최소 local fixture로 assertion을 바꾼 뒤 모듈을 삭제하고 같은 test를 다시 실행한다.
4. DB-backed public read와 전체 앱 gate를 확인하고 phase 문서를 동기화한다.

## 하지 말 것

- fixture 내용을 다른 production module로 옮기지 말 것. Reason: runtime caller 없는 샘플 데이터를 보존할 이유가 없다.
- public repository나 route에 fallback sample을 추가하지 말 것. Reason: PostgreSQL이 현재 public source of truth다.
- `blog-public.test.ts`의 published/private, XSS, hash, diagram assertions를 함께 줄이지 말 것. Reason: 제거 대상은 fixture module뿐이다.
