# Step 2: shrink-diagram-asset-contract

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
- `apps/h-log/lib/blog-diagram-assets.ts`
- `apps/h-log/lib/blog-diagram-assets.test.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`

## 작업

diagram asset module에서 public rendering이 실제 사용하는 integrity predicate만 남긴다.

- `isRenderableDiagramAsset`와 그 입력 type을 유지한다.
- live caller가 없는 generation planning, failure record, storage, audit helper와 전용 type/test를 제거한다.
- current post version, ready status, SHA-256 asset hash 검증과 figure 삽입 위치는 변경하지 않는다.

## 인수 기준

- ready/current/hash-matched diagram만 public figure로 렌더링된다.
- missing/failed/stale/hash-mismatch asset은 계속 생략된다.
- canonical Markdown과 crawler output은 변경되지 않는다.
- 제거한 helper의 non-test caller가 0건이다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-diagram-assets.test.ts lib/blog-public.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. render predicate behavior를 삭제 전 focused characterization으로 고정한다.
2. unwired helper/type/test만 제거한다.
3. public render와 diagram omission 회귀를 재검증한다.
4. phase index와 diagram architecture 설명을 동기화한다.

## 하지 말 것

- `isRenderableDiagramAsset`를 inline 복제하지 말 것. Reason: 한 public integrity boundary가 더 작다.
- 새 image generation/storage pipeline을 만들지 말 것. Reason: live caller 없는 미래 contract를 다시 만드는 셈이다.
- 현재 diagram asset row나 SVG 파일을 삭제하지 말 것. Reason: code contract pruning만 수행한다.
