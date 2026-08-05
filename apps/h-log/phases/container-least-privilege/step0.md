# Step 0: rootless-job-images

## 읽을 파일

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/Dockerfile`
- `apps/h-log/Dockerfile.auto-publish`
- `apps/h-log/compose.yaml`
- `apps/h-log/package.json`

## 작업

`migrations`, `worker`, `dry-run` image target을 production dependency만 가진 non-root runtime으로 분리한다.

- build 단계의 root 사용은 유지할 수 있지만, DB credential을 사용하는 실행 command는 non-root UID로 동작해야 한다.
- `Dockerfile.auto-publish`의 `npm ci --omit=dev`와 non-root pattern을 참고하되, 불필요하게 Dockerfile 전체를 재구성하지 않는다.
- web runner의 현재 non-root 설정을 바꾸지 않는다.

## 인수 기준

- worker, migrations, dry-run target에 dev dependency가 없다.
- 각 target의 기본 실행 사용자와 필요한 파일 권한이 non-root에서 동작한다.
- Compose profile config와 local dry-run/worker command contract가 유지된다.

```bash
docker compose config --quiet
docker compose --profile worker config --quiet
docker compose --profile dry-run config --quiet
docker build --target worker -t hlog-worker:local .
docker build --target migrations -t hlog-migrate:local .
docker build --target dry-run -t hlog-dry-run:local .
npm run test
npm run lint
npm run build
```

## 검증

1. target image metadata로 root 실행과 dev dependency 포함을 먼저 확인한다.
2. rootless runtime target만 추가 또는 교체한 뒤 각 target build와 non-root command smoke를 확인한다.
3. OCI deploy, scheduler, credential, volume, running container는 건드리지 않는다.
4. phase index status와 summary를 갱신한다.

## 하지 말 것

- production server에서 image를 build, pull, restart, deploy하지 말 것. Reason: 이 step은 repository-local image hardening만 다룬다.
- Dockerfile.auto-publish의 Hermes OAuth volume 권한을 함께 바꾸지 말 것. Reason: 별도 runtime credential boundary다.
