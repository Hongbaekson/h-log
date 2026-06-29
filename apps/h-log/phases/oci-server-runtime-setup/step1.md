# Step 1: server-compose-runtime

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/phases/oci-server-runtime-setup/step0.md`
- `Dockerfile`
- `compose.yaml`
- `deploy/env.dev`

## 작업

승인 후 OCI 서버에서 Docker Compose runtime boundary를 확인하고 필요한 server-local 파일만 준비한다.

- `ssh oci` 접속 전 실행 명령을 사용자에게 다시 알린다.
- server-local env는 저장소 밖에 두고 secret 값을 출력하거나 커밋하지 않는다.
- web, worker, PostgreSQL + pgvector, Redis, Nginx service boundary가 `compose.yaml`과 맞는지 확인한다.
- DB/Redis는 public port를 열지 않는다.

## 인수 기준

```bash
docker compose config
docker compose ps
```

## 검증

1. local `docker compose config`를 먼저 통과한다.
2. 승인된 OCI 서버에서 Compose config와 service 상태를 확인한다.
3. secret 값, server IP, SSH key path가 출력 로그나 문서에 남지 않았는지 확인한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- Do not commit production env files. Reason: they contain secrets.
- Do not expose PostgreSQL or Redis to the public internet. Reason: only Nginx should be public ingress.
