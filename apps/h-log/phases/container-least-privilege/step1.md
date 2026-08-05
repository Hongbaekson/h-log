# Step 1: remove-unused-redis-service

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
- `apps/h-log/compose.yaml`
- `apps/h-log/deploy/env.dev`
- `apps/h-log/package.json`
- Redis 또는 `REDIS_URL`을 참조하는 현재 source/config 전체

## 작업

Redis client, runtime command, deployment secret, 외부 consumer가 없다는 precondition을 다시 확인한 경우에만 Compose의 Redis topology를 제거한다.

- `hlog-redis`, `redis_data`, `REDIS_URL`, web/worker의 Redis `depends_on`만 범위로 둔다.
- 실제 code 또는 external deployment consumer가 확인되면 `clean-no-op`으로 종료하고 근거를 phase index에 남긴다.
- 제거를 실행하면 ADR/ARCHITECTURE/automated plan에서 Redis를 필수 현재 구성으로 서술한 부분을 실제 runtime에 맞게 최소 동기화한다.

## 인수 기준

- app source와 production dependency에 Redis client/connection이 없다.
- Compose config에 Redis service, volume, Redis dependency, unused `REDIS_URL`이 남지 않는다.
- web, worker, migrations, dry-run profile의 network/health dependency가 PostgreSQL과 Nginx 기준으로 정상 해석된다.

```bash
docker compose config --quiet
docker compose --profile worker config --quiet
docker compose --profile dry-run config --quiet
npm run test
npm run lint
npm run build
git diff --check
```

## 검증

1. source, `package.json`, production image config와 OCI server-local runtime 문서에서 consumer 부재를 확인한다.
2. 해당 precondition이 참일 때만 Compose/env/docs의 최소 변경을 적용한다.
3. 기존 `redis_data` Docker volume을 삭제하지 않는다. 실제 삭제는 별도 사용자 승인 대상이다.
4. phase index status와 summary를 갱신한다.

## 하지 말 것

- Redis를 캐시, lock, rate limit 용도로 대체 도입하지 말 것. Reason: 현재 사용처 없는 서비스를 제거하는 step이지 새 분산 설계를 만드는 step이 아니다.
- OCI에서 `docker compose down -v`를 실행하지 말 것. Reason: 범위를 벗어난 영구 데이터 삭제 위험이 있다.
