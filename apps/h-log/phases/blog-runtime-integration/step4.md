# Step 4: local-end-to-end-dry-run

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
- `apps/h-log/compose.yaml`
- Steps 0-3의 migration, repository, public route, worker 파일
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`

## 작업

local Compose에서 fake provider만 사용해 DB persistence부터 public surface까지 한 번의 bounded dry-run을 검증한다.

- migration 적용, seed topic, draft/version 생성, required job 처리, published 전이, public/crawler 조회를 한 runbook으로 연결한다.
- 성공 결과가 PostgreSQL에 남고 web container가 같은 version을 읽는지 확인한다.
- 실패 fixture는 public route에 노출되지 않고 retry/terminal 상태가 DB에 남아야 한다.
- 실행 command와 기대 결과를 local dry-run 문서에 기록한다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run lint
npm run build
docker compose config
docker compose --profile worker config
```

## 검증

1. local fake run 하나가 DB row와 public route까지 이어지지 않는 RED 또는 smoke 실패를 먼저 확인한다.
2. 성공 run의 current version/content hash/public URL/Markdown/crawler output을 확인한다.
3. 실패 run이 비공개 상태로 남는지 확인한다.
4. 성공 시 phase index와 top-level phase status/summary를 갱신한다.

## 하지 말 것

- OCI, production domain, 실제 LLM/embedding/IndexNow/Discord를 호출하지 말 것.
- local dry-run 성공을 production 자동 발행 완료로 기록하지 말 것.
- secret이나 실제 서버 정보를 runbook에 기록하지 말 것.
