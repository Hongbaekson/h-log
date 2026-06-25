# Step 3: blog-public-routes-and-md-endpoint

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
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `plans/automated-blog-publishing-plan.md`
- DB content model, renderer, published route boundary 관련 파일

## 작업

DB 기반 `/blog`, `/blog/[slug]`, `/blog/[slug].md` public surface를 만든다.

- 목록과 상세는 published 최신 version만 렌더링한다.
- `.md` endpoint는 AI crawler 친화 출력물이지만 public policy는 HTML 상세와 동일해야 한다.
- 상세에는 title, date, tags, description, source link 영역, OG metadata를 준비한다.
- UI 작업 시 desktop/mobile overflow와 링크 동작을 확인한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. published-only route behavior를 focused test로 확인한다.
2. UI 변경 후 `npm run lint`, `npm run build`를 실행한다.
3. 가능하면 dev server에서 desktop/mobile viewport를 확인한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- preview/admin route를 public route와 섞지 말 것. 이유: 비공개 글 노출 위험이 있다.
- 방문자 댓글, 조회수, 챗봇을 추가하지 말 것.
- 민감정보나 내부 URL을 fixture 또는 metadata에 넣지 말 것.
