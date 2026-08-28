# Step 2: submitted-query-ui-consistency

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
- `apps/h-log/components/blog/BlogSearchPanel.tsx`
- `apps/h-log/lib/blog-search-ui.ts`
- `apps/h-log/lib/blog-search-ui.test.ts`
- `apps/h-log/lib/blog-discovery-ui.test.ts`

## 작업

검색 중 사용자가 입력을 바꿔도 화면의 query label과 결과가 서로 다른 요청을 가리키지 않게 한다.

- input draft와 마지막 submitted query를 구분해 결과 heading/state는 submitted query를 사용한다.
- 새 state framework나 request queue를 만들지 않는다.
- 현재 loading, cached, empty, rate-limited, error 접근성 문구를 유지한다.

## 인수 기준

- request A가 진행 중일 때 input을 B로 바꿔도 A 결과는 A로 표시된다.
- 다음 submit은 B를 사용하며 이전 응답이 새 결과를 덮어쓰지 않는다.
- keyboard submit, focus, screen-reader status가 유지된다.
- desktop과 mobile에서 input/result label mismatch가 없다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-search-ui.test.ts lib/blog-discovery-ui.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. in-flight 요청 중 input edit mismatch를 focused RED로 남긴다.
2. draft/submitted query 최소 state 분리로 GREEN을 만든다.
3. 개발 서버에서 desktop/mobile viewport와 keyboard 동작을 확인한다.
4. phase index status와 summary를 갱신한다.

## 하지 말 것

- debounce, request library, global store를 추가하지 말 것. Reason: 두 query 값을 구분하면 충분하다.
- 기존 접근성 status를 visual text만으로 대체하지 말 것. Reason: 검색 상태는 보조 기술에도 전달돼야 한다.
