# Step 4: public-blog-index-surface

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
- DB public route 관련 파일

## 작업

`/blog` 목록을 실제 탐색 화면으로 확장한다.

- 날짜, 제목, 요약, 태그, 태그별 카운트, 페이지네이션을 제공한다.
- 태그 카운트와 페이지네이션은 published 글만 기준으로 계산한다.
- 검색 UI는 이 phase에서 만들지 않고 다음 `search-and-related-posts` phase로 넘긴다.
- zerry식 참고 요소는 제품 표면만 가져오고 디자인/문체를 복제하지 않는다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. tag count와 pagination이 draft/failed 글을 제외하는 테스트를 먼저 작성한다.
2. UI 변경 후 lint/build를 실행한다.
3. desktop/mobile에서 목록 밀도와 overflow를 확인한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 카드 과다 또는 마케팅형 hero로 만들지 말 것. 이유: 블로그 목록은 반복 탐색 화면이다.
- 검색/임베딩 API를 이 step에 섞지 말 것. 이유: 비용 방어와 별도 contract가 필요하다.
- unpublished 글의 태그를 공개 카운트에 포함하지 말 것.
