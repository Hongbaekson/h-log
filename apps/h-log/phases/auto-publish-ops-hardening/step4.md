# Step 4: rollback-ops-smoke

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
- correction, unpublish, retract, crawler output, search index 관련 파일

## 작업

정정/비공개/retract 이후 public surface가 실제로 내려가는지 smoke test를 만든다.

- public URL, `.md` URL, sitemap, feed, llms, search index, related posts에서 내려간 글이 사라지는지 확인한다.
- rollback 결과는 publish_verifications와 admin_actions에 남긴다.
- 실패 시 Discord/운영 알림은 retryable로 처리한다.
- 실제 외부 알림은 adapter fake로 검증한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. retracted 글이 search/llms에 남는 실패 테스트를 먼저 작성한다.
2. rollback smoke 결과가 기록되는지 확인한다.
3. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- public URL만 내리고 sitemap/search/llms를 방치하지 말 것.
- 외부 알림 실패를 rollback 실패와 동일하게 취급하지 말 것.
- rollback smoke에 민감 본문을 출력하지 말 것.
