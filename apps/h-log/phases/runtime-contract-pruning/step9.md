# Step 9: deduplicate-container-runtime-defaults

## 읽을 파일

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/Dockerfile`
- `apps/h-log/Dockerfile.auto-publish`
- `apps/h-log/compose.yaml`
- `apps/h-log/package.json`
- `apps/h-log/deploy/systemd/hlog-auto-publish.service`
- `apps/h-log/lib/blog-auto-publish-scheduler.test.ts`
- `apps/h-log/lib/blog-hermes-article-provider.ts`
- `apps/h-log/scripts/blog-hermes-auth-preflight.mjs`

## 작업

image가 이미 소유하는 container command/environment default를 Compose와 systemd에서 반복하지 않도록 단일화한다.

- worker target의 `CMD ["npm", "run", "worker:once"]`와 같은 `hlog-worker.command`를 Compose에서 제거하고 image CMD를 사용한다.
- `Dockerfile.auto-publish`가 제공하는 `HERMES_HOME=/opt/data`를 Compose에서 반복하지 않는다.
- provider와 auth preflight의 기본 executable이 이미 `hermes`인 상태에서 Compose의 고정 `HLOG_HERMES_COMMAND=hermes`를 제거한다. Server-local override 가능성은 유지한다.
- systemd `ExecStart`는 별도 command를 반복하지 않고 `hlog-auto-publish` image의 `npm run auto-publish:cycle` CMD를 실행하게 한다.
- scheduler packaging test를 image default가 source of truth이고 systemd가 이를 override하지 않는 contract로 갱신한다.

## 인수 기준

- worker와 auto-publish image inspect 결과에 기존 one-shot/cycle CMD가 각각 한 번 정의된다.
- rendered Compose에서 worker command, `HERMES_HOME`, 기본 `HLOG_HERMES_COMMAND`의 동일값 override가 사라진다.
- systemd `ExecStart`는 image default cycle을 사용하고 `ExecStartPre`의 container-local OAuth preflight는 유지된다.
- `HLOG_WORKER_PUBLIC_BASE_URL`, Hermes OAuth volume, service dependency, network, restart와 timer 정책은 변경하지 않는다.
- custom Hermes executable이 필요한 test 또는 server-local runtime은 `HLOG_HERMES_COMMAND`를 명시해 계속 override할 수 있다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-auto-publish-scheduler.test.ts lib/blog-hermes-article-provider.test.ts lib/blog-hermes-auth-preflight.test.ts
docker compose --profile worker --profile scheduler config --format json
docker compose --profile worker --profile scheduler config --quiet
docker compose --profile worker build hlog-worker
docker compose --profile scheduler build hlog-auto-publish
docker image inspect hlog-worker:dev --format '{{json .Config.Cmd}}'
docker image inspect hlog-auto-publish:dev --format '{{json .Config.Cmd}} {{json .Config.Env}}'
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. Dockerfile, rendered Compose, systemd에 반복된 command/environment default를 focused packaging test로 RED 고정한다.
2. image CMD/ENV를 single source로 남기고 exact-value override만 제거한다.
3. image inspect와 Compose config에서 worker one-shot 및 auto-publish cycle default를 확인한다.
4. OAuth preflight가 cycle 전에 실행되고 custom command injection test가 그대로 통과하는지 확인한다.

## 하지 말 것

- OAuth `ExecStartPre`를 제거하거나 image CMD에 합치지 말 것. Reason: Hermes가 logged-out 상태에서도 exit code 0을 낼 수 있는 fail-closed 인증 경계다.
- `HLOG_WORKER_PUBLIC_BASE_URL` 같은 topology-specific override를 제거하지 말 것. Reason: canonical public origin과 container 내부 fetch origin은 의도적으로 분리돼 있다.
- image CMD 자체를 삭제하지 말 것. Reason: Compose와 systemd가 의존할 runtime source of truth다.
- auto-publish cycle을 host Node/npm/Hermes 실행으로 바꾸지 말 것. Reason: OAuth state와 dependency는 container 경계에 고정돼 있다.
- OCI service, timer enablement 또는 OAuth state를 직접 변경하지 말 것. Reason: production activation은 별도 승인 대상이다.
