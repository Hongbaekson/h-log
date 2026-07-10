# Step 4: production-activation-and-rollback-smoke

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
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/phases/blog-runtime-integration/index.json`
- correction, unpublish, retract, crawler output, search index 관련 파일

## 작업

사용자 승인 후에만 production provider와 scheduler를 canary로 활성화하고 rollback까지 검증한다.

- 실제 provider credential은 서버/CI secret으로만 주입하고 저장소에는 기록하지 않는다.
- 먼저 dry-run과 단일 수동 run을 확인한 뒤 scheduled run을 활성화한다.
- 첫 canary는 publish 최대 1개, retry 최대 1회로 제한한다.
- public URL, `.md` URL, sitemap, feed, llms, search index, related posts에서 내려간 글이 사라지는지 확인한다.
- rollback 결과는 publish_verifications와 admin_actions에 남긴다.
- 실패 시 Discord/운영 알림은 retryable로 처리한다.
- provider, scheduler, 공개 발행, OCI compose 변경은 각각 승인된 범위 안에서만 실행한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. local/fake 환경에서 retracted 글이 search/llms에 남는 실패 테스트를 먼저 작성한다.
2. 사용자에게 실제 provider, OCI, scheduler, public publish 변경 범위를 알리고 승인을 받는다.
3. 승인된 canary 1회를 실행하고 public/crawler/search/usage event를 확인한다.
4. canary 정정 또는 retract 후 모든 public surface에서 제거되는지 확인한다.
5. rollback smoke 결과가 publish_verifications와 admin_actions에 기록되는지 확인한다.
6. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
7. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- public URL만 내리고 sitemap/search/llms를 방치하지 말 것.
- 외부 알림 실패를 rollback 실패와 동일하게 취급하지 말 것.
- rollback smoke에 민감 본문을 출력하지 말 것.
- 사용자 승인 없이 provider credential, scheduler, OCI runtime, 실제 공개 발행을 활성화하지 말 것.
