# Step 1: compose-service-boundary

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `.codex/skills/harness/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- existing Dockerfile, compose, package scripts, env examples

## 작업

OCI 배포에 사용할 Docker Compose service boundary를 만든다.

- web service는 Next.js standalone output 기준으로 둔다.
- worker service는 자동 발행 phase 전까지 disabled/manual entrypoint가 가능해야 한다.
- PostgreSQL + pgvector와 Redis는 private network와 persistent volume을 사용한다.
- Nginx는 web으로만 reverse proxy한다.
- production secret 값은 `.env.example` 형태의 key 이름만 남기고 실제 값은 저장하지 않는다.

## 인수 기준

```bash
docker compose config
npm run build
```

## 검증

1. compose config가 유효한지 확인한다.
2. 앱 build가 Docker runtime 전제와 충돌하지 않는지 확인한다.
3. secret, server IP, private URL이 diff에 없는지 확인한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 실제 운영 compose를 restart하지 말 것. 이유: 이 step은 repo config 작성 단계다.
- DB/Redis port를 public으로 열지 말 것. 이유: private service로만 접근해야 한다.
- worker가 자동 발행을 즉시 실행하게 만들지 말 것. 이유: 자동 발행 phase 전에는 side effect를 막아야 한다.
