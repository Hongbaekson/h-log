# Step 2: nginx-tls-security-boundary

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `.codex/skills/harness/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- existing Nginx, Docker, route, metadata, robots, sitemap files

## 작업

OCI Nginx reverse proxy와 TLS/security boundary를 정의한다.

- 80/443 ingress, TLS termination, HTTP to HTTPS redirect 기준을 둔다.
- app container는 private network에서만 접근하도록 한다.
- body size, timeout, cache header, security header의 최소 정책을 정한다.
- upstream은 `hlog-web:3000`으로 고정하고 request `Host`와 `Upgrade`/`Connection` header를 기본 public route에 그대로 전달하지 않는다.
- `X-Real-IP`와 `X-Forwarded-For`는 Nginx의 `$remote_addr` 기준으로 설정한다.
- `/blog`, `/blog/:slug`, `/blog/:slug.md`, sitemap/feed/llms 같은 public crawler surface를 막지 않도록 확인한다.
- admin/internal route는 별도 보호 전까지 public 노출하지 않는다.

## 인수 기준

```bash
nginx -t
npm run build
```

## 검증

1. Nginx config 문법을 확인한다.
2. build 결과 public route가 의도대로 남는지 확인한다.
3. crawler surface와 bot/cost guard 정책이 충돌하지 않는지 확인한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 운영 Nginx를 reload하지 말 것. 이유: 실제 트래픽 영향이 있다.
- `/api/search` 같은 비용성 endpoint를 무제한 공개하는 설정을 두지 말 것.
- server IP나 certificate private key를 저장소에 남기지 말 것.
