# Step 3: published-only-search-ui

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `plans/automated-blog-publishing-plan.md`
- search API, blog list, related posts 관련 파일

## 작업

블로그 검색 UI를 공개 탐색 기능으로 제공한다.

- 검색 결과는 published 글만 보여준다.
- 빈 결과, rate limited, cached result, loading, error 상태를 만든다.
- 검색 결과에는 title, description, date, tags, score 또는 match reason을 표시한다.
- 방문자와 대화하는 챗봇 UI, SSE stream, session memory는 만들지 않는다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. search result filtering utility를 test-first로 검증한다.
2. UI 상태가 버튼/입력/결과 영역에서 overflow 없이 보이는지 확인한다.
3. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 자연어 답변 생성 영역을 추가하지 말 것. 이유: 챗봇은 제외 범위다.
- 검색 UI에서 draft/failed 글의 제목이나 slug를 노출하지 말 것.
- 비용 방어 실패를 UI로 숨기고 넘어가지 말 것.
