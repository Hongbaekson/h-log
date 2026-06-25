# Step 0: diagram-trigger-policy

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
- article mode, post_assets, generation run 관련 파일

## 작업

아키텍처/흐름/인프라 글에서만 다이어그램 생성을 트리거하는 정책을 만든다.

- diagram_generation_max 같은 quota를 적용한다.
- 글 주제가 architecture, workflow, infra, data-flow일 때만 후보로 둔다.
- 다이어그램은 본문 이해를 돕는 보조 asset이며 claim 검증을 대체하지 않는다.
- 생성 실패는 retryable job으로 남기고 글 공개 여부와 분리한다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. 모든 글에서 다이어그램을 생성하려는 실패 테스트를 먼저 작성한다.
2. quota 초과 시 diagram job이 생성되지 않는지 확인한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 튜토리얼/단순 뉴스 요약 글에 자동으로 다이어그램을 붙이지 말 것.
- 다이어그램 실패 때문에 required publish를 실패 처리하지 말 것.
- 외부 이미지 생성 비용을 무제한 허용하지 말 것.
