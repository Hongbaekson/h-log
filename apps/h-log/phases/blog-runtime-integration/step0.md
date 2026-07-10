# Step 0: postgres-schema-and-migration-runner

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
- `apps/h-log/package.json`
- `apps/h-log/compose.yaml`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-content-model.test.ts`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`

## 작업

코드 contract를 실제 PostgreSQL schema로 옮기는 최소 migration 경계를 만든다.

- 현재 contract에 존재하는 핵심 blog table과 `vector` extension만 첫 migration에 포함한다.
- migration은 순서가 고정되고 두 번 실행해도 현재 version을 확인할 수 있어야 한다.
- query abstraction이나 ORM은 이 step에서 미리 만들지 않는다. 최소 PostgreSQL driver와 SQL migration으로 충분한지 먼저 검증한다.
- local Compose PostgreSQL에서만 적용/검증하고 OCI DB에는 접속하지 않는다.
- backup/restore runbook의 migration version 확인 항목을 실제 명령으로 갱신한다.

## 인수 기준

```bash
docker compose up -d hlog-postgres
npm run test
npm run typecheck
npm run lint
```

## 검증

1. schema가 없는 DB에서 repository contract가 실패하는 통합 테스트 또는 migration 검증을 먼저 만든다.
2. migration 적용 후 `vector` extension, 핵심 table, migration version을 확인한다.
3. 같은 migration을 다시 실행해 중복 table이나 version drift가 생기지 않는지 확인한다.
4. 성공 시 phase index의 step status와 summary를 갱신한다.

## 하지 말 것

- 운영 OCI DB에 migration을 적용하지 말 것. 이유: production DB 변경은 별도 승인 경계다.
- 아직 쿼리가 없는 table을 추측으로 추가하지 말 것. 이유: contract와 실제 사용 범위만 schema로 옮긴다.
- ORM, repository factory, 범용 migration framework를 미리 만들지 말 것. 이유: 첫 schema 적용에 필요한 최소 경계만 검증한다.
