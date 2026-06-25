# Step 4: deploy-smoke-rollback-runbook

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `.codex/skills/harness/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- CI/CD, Docker image, compose, Nginx, route smoke files

## 작업

OCI 배포 smoke와 rollback runbook을 만든다.

- registry pull, `docker compose up -d`, health check, log check 순서를 문서화한다.
- public smoke는 `/`, `/resume`, `/portfolio`, `/blog`, `/blog/:slug`, `/blog/:slug.md`, sitemap/feed/llms를 포함한다.
- DB migration이 있는 배포는 rollback 가능 여부를 먼저 판단하도록 한다.
- rollback은 이전 image tag와 compose env를 기준으로 한다.
- 실제 SSH deploy는 사용자 승인 후에만 수행한다.

## 인수 기준

```bash
npm run lint
npm run build
git diff --check
```

## 검증

1. deploy smoke 항목이 public/private route boundary와 맞는지 확인한다.
2. rollback 시 DB migration, content_hash, public route 노출 상태를 확인하는 절차가 있는지 확인한다.
3. `npm run lint`, `npm run build`, `git diff --check`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 사용자 승인 없이 OCI 서버에 접속하거나 compose restart를 실행하지 말 것.
- 운영 서버 IP, SSH command의 private key path, secret 값을 문서에 고정하지 말 것.
- smoke 실패를 무시하고 publish job 또는 자동 발행을 계속하지 말 것.
