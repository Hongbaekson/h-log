# Step 2: nginx-domain-tls-smoke

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/phases/oci-server-runtime-setup/step0.md`
- `deploy/nginx/conf.d/hlog.conf`

## 작업

승인 후 OCI Nginx public ingress, domain, TLS, proxy 보안 경계를 확인한다.

- production `server_name`, certificate path, private key path는 저장소에 기록하지 않는다.
- public ingress는 80/443만 기본으로 둔다.
- `/admin`과 `/api/internal/*`은 인증/접근 제어가 확정될 때까지 production에서도 차단한다.
- upstream은 Compose service 경계와 맞게 고정한다.

## 인수 기준

```bash
docker compose config
```

운영 smoke는 승인된 domain 기준으로 `/`, `/resume`, `/portfolio`, `/blog`, `/blog/:slug`, `/blog/:slug.md`, `/admin`, `/api/internal/*`를 확인한다.

## 검증

1. Nginx config가 fixed upstream과 security header 기준을 유지하는지 확인한다.
2. admin/internal route가 public에서 노출되지 않는지 확인한다.
3. TLS/domain 값이나 서버 IP가 저장소에 기록되지 않았는지 확인한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- Do not commit domain-specific certificate paths or private key paths. Reason: deployment secrets belong outside the repo.
- Do not open admin/internal routes publicly. Reason: auth and access control are not decided.
