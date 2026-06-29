# Step 0: approval-and-host-preflight

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `.codex/skills/harness/SKILL.md`
- `plans/automated-blog-publishing-plan.md`

## 작업

실제 OCI 서버 세팅을 시작하기 전에 승인 경계와 비밀정보 노출 방지 기준을 확인한다.

- 사용자에게 `ssh oci` 접속, Docker/Nginx/Compose 확인, firewall/security list 변경 가능성, production env 주입, compose restart 여부를 명시하고 승인받는다.
- 승인 전에는 `ssh oci`, 운영 서버 파일 수정, firewall/security list 변경, Docker Compose restart, Nginx production 변경을 실행하지 않는다.
- 저장소에는 서버 IP, SSH key 경로, DB password, API key, registry token, private URL을 기록하지 않는다.
- 승인 후 시작할 명령은 실행 전에 다시 사용자에게 짧게 공유한다.
- 로컬 검증은 운영 서버와 분리된 `apps/h-log` 기준으로 먼저 수행한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
docker compose config
```

## 검증

1. 사용자 승인 없이 OCI 서버에 접속하지 않았는지 확인한다.
2. 문서와 phase registry가 실제 OCI 세팅을 approval-required로 표시하는지 확인한다.
3. 로컬 앱 검증과 `docker compose config`를 통과한 뒤에만 서버 작업으로 넘어간다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- Do not run `ssh oci` before explicit user approval. Reason: this phase changes the real hosting boundary.
- Do not write server IPs, SSH key paths, DB passwords, API keys, registry tokens, or private URLs into the repository. Reason: H-Log is public.
- Do not restart production Compose or Nginx before a deploy smoke and rollback checkpoint is ready. Reason: the site must remain recoverable.
