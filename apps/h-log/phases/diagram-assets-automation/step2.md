# Step 2: article-diagram-insertion-gate

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
- post renderer, post_assets, markdown/html conversion 관련 파일

## 작업

검증된 diagram asset만 본문 적절한 위치에 삽입한다.

- renderer가 post_assets를 안전한 figure/alt 형태로 출력한다.
- missing asset은 본문 렌더링을 깨지 않고 fallback을 제공한다.
- diagram insertion은 content_hash와 version 정책에 맞아야 한다.
- SEO/llms output에서 diagram 설명이 과하게 중복되지 않도록 한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 검증되지 않은 asset이 본문에 삽입되는 실패 테스트를 먼저 작성한다.
2. missing asset fallback과 content_hash 정책을 확인한다.
3. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- public renderer에서 raw SVG string을 무검증 삽입하지 말 것.
- 다이어그램 설명으로 본문 claim을 대체하지 말 것.
- asset 오류를 사용자에게 빈 깨진 이미지로 노출하지 말 것.
