# Step 0: file-based-blog-loader

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
- `apps/h-log/package.json`
- 기존 `apps/h-log/app/blog`와 `apps/h-log/lib` 관련 파일

## 작업

파일 기반 블로그 MVP의 첫 단위로 blog content loader를 만든다.

- Markdown 또는 MDX frontmatter contract를 정한다.
- 공개 글만 목록/상세에서 읽히도록 loader 경계를 만든다.
- slug, published date 정렬, draft 제외, 잘못된 frontmatter 처리 테스트를 먼저 작성한다.
- DB, CMS, 관리자 화면은 추가하지 않는다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. Loader 테스트가 RED -> GREEN 순서로 작성됐는지 확인한다.
2. `npm run test`를 실행한다.
3. `npm run typecheck`를 실행한다.
4. 성공 시 `apps/h-log/phases/blog-public-mvp/index.json`의 step status를 갱신한다.

## 하지 말 것

- DB나 CMS를 추가하지 말 것. 이유: H-02는 파일 기반 MVP다.
- `/blog` UI와 상세 UI를 한 번에 완성하려 하지 말 것. 이유: loader 경계를 먼저 고정해야 한다.
- 개인정보, 내부 URL, 비공개 저장소명을 fixture에 넣지 말 것.
