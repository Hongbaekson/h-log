# Step 2: markdown-html-version-boundary

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
- `plans/automated-blog-publishing-plan.md`
- DB content model과 published route boundary 관련 파일

## 작업

DB canonical content와 공개 출력물의 version/hash 경계를 구현한다.

- 자동 writer의 입력은 Markdown으로 허용한다.
- DB 저장 전 `content_markdown -> sanitized content_html` 변환 경계를 둔다.
- 크롤러용 `.md` 출력은 canonical content에서 생성되도록 한다.
- `content_hash`가 HTML/Markdown 공개 결과와 어긋나면 검증 실패로 처리한다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. Markdown/HTML 변환 결과의 hash mismatch 실패 테스트를 먼저 작성한다.
2. sanitized HTML이 공개 렌더링의 기준이 되는지 확인한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- HTML을 신뢰하고 그대로 렌더링하지 말 것. 이유: 공개 페이지 XSS와 privacy risk가 있다.
- Markdown과 HTML을 서로 다른 source of truth로 두지 말 것. 이유: version drift가 생긴다.
- 원문 source 전체를 post content에 섞어 저장하지 말 것.
