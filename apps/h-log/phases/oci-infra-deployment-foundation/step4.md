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

## 완료 기록

- Deploy smoke/rollback 기준 runbook을 `.codex/docs/deploy-smoke-rollback-runbook.md`에 추가한다.
- Public smoke는 현재 구현된 `/`, `/resume`, `/portfolio`, `/blog`, `/blog/:slug`, `/blog/:slug.md`와 Nginx의 `/admin`, `/api/internal/*` 차단을 기준으로 둔다.
- `sitemap.xml`, `feed.xml`, `llms.txt`, `llms-full.txt`는 아직 route가 없으므로 이후 SEO phase에서 route 추가 시 필수 smoke로 승격한다.
- Rollback은 이전 image tag와 server-local env 기준으로 수행하고, DB migration이나 `content_hash` 변경이 있으면 migration rollback 또는 restore rehearsal 확인 전에는 완료 처리하지 않는다.
- 실제 OCI 접속, registry pull, compose restart, rollback은 사용자 승인 후에만 수행한다.

## 하지 말 것

- 사용자 승인 없이 OCI 서버에 접속하거나 compose restart를 실행하지 말 것.
- 운영 서버 IP, SSH command의 private key path, secret 값을 문서에 고정하지 말 것.
- smoke 실패를 무시하고 publish job 또는 자동 발행을 계속하지 말 것.
