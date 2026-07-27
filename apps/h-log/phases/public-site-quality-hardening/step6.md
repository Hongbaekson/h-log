# Step 6: blog-discovery-resilience

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/app/blog/page.tsx`
- `apps/h-log/components/blog/BlogSearchPanel.tsx`
- `apps/h-log/lib/blog-search-ui.test.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-public-read-path.test.ts`

## 작업

Blog 목록과 검색이 정상, 빈 결과, 로딩, DB/API 실패 상태에서 모두 명확하게 동작하도록 한다.

- 검색 input에 keyboard focus-visible을 제공하고 최소 검색어 조건과 안내 문구를 일치시킨다.
- 선택된 tag가 navigation이면 `aria-current`, toggle이면 `aria-pressed`로 상태를 전달하고 시각 상태도 구분한다.
- 전체 글 0개와 검색 결과 0개를 서로 다른 한국어 안내로 표시한다.
- `/blog`에 필요한 `loading.tsx`와 `error.tsx`를 추가해 DB 지연/실패를 blank page나 불명확한 500으로 남기지 않는다.
- Published-only DB source와 기존 rate-limit/cached/error 검색 상태를 유지한다.
- DB 실패를 정적 fixture fallback으로 숨기지 않는다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 활성 tag 의미, 최소 검색어 안내, empty/error 상태 중 한 public behavior의 RED를 먼저 확인한다.
2. 한 behavior씩 GREEN으로 만들고 `lib/blog-search-ui.test.ts`와 관련 public read test를 실행한다.
3. Keyboard만으로 tag와 검색을 사용할 수 있고 focus가 보이는지 확인한다.
4. 실제 `DATABASE_URL` 환경에서 정상 목록, 빈 결과, API rate-limit, DB 실패 화면을 확인한다.
5. 성공 시 phase index의 Step 6을 `completed`로 갱신한다.

## 하지 말 것

- DB 장애 시 정적 예제 글을 production fallback으로 노출하지 말 것. 이유: source of truth와 운영 장애를 숨긴다.
- 검색 결과를 자연어 답변, SSE, visitor session memory로 확장하지 말 것. 이유: 제품 범위 밖이다.
- 새 form/state library를 추가하지 말 것. 이유: 현재 React 상태와 route boundary로 충분하다.
