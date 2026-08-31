# Step 8: prune-unused-worker-capabilities

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
- `apps/h-log/compose.yaml`
- `apps/h-log/deploy/env.dev`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/scripts/blog-worker.mjs`
- `apps/h-log/lib/blog-required-publish-job-adapter.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.test.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-persistent-worker.test.ts`

## 작업

현재 manual `--once` worker가 사용하지 않는 configuration과 outbound capability를 제거한다.

- `HLOG_WORKER_MODE`의 production/test/document caller가 0건인지 확인하고 `deploy/env.dev`에서 삭제한다.
- required adapter가 PostgreSQL과 internal Nginx만 사용한다는 characterization을 고정하고 `hlog-worker`의 `egress_net` membership을 제거한다.
- `app_net`, `data_net`, profile-gated manual 실행, server-local secret 주입, privacy scanner와 public verification 경계는 유지한다.
- ARCHITECTURE와 deployment runbook의 worker network 설명을 rendered Compose와 동기화한다.

## 인수 기준

- `HLOG_WORKER_MODE`는 source, test, Compose, sample env, 운영 문서 어디에도 남지 않는다.
- `hlog-worker`는 `app_net`과 `data_net`만 사용하며 public host port와 outbound network를 갖지 않는다.
- worker required job은 PostgreSQL claim/transition과 internal Nginx pre/post verification을 기존과 동일하게 수행한다.
- `hlog-auto-publish`의 Hermes outbound access와 PostgreSQL/Nginx/privacy/security boundary는 변경하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-required-publish-job-adapter.test.ts lib/blog-persistent-worker.test.ts
docker compose --profile worker config --format json
docker compose --profile worker config --quiet
npm run test:integration
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. worker environment key와 network 목록을 rendered Compose 기준으로 characterization한다.
2. `HLOG_WORKER_MODE`의 caller 0건과 worker outbound caller 0건을 다시 확인한다.
3. dead flag와 worker egress membership만 제거하고 focused 및 PostgreSQL integration GREEN을 확인한다.
4. auto-publish egress, internal Nginx fetch, canonical public origin, privacy 목록 주입이 그대로인지 확인한다.

## 하지 말 것

- `hlog-auto-publish`에서 `egress_net`을 제거하지 말 것. Reason: Hermes OAuth writer는 실제 outbound access가 필요하다.
- `app_net`이나 `data_net`을 제거하지 말 것. Reason: required adapter의 internal Nginx와 PostgreSQL runtime 경계다.
- privacy 목록, canonical origin, database credential 검증을 약화하지 말 것. Reason: 외부 입력, 개인정보, 공개 상태, 데이터 경계다.
- future external adapter를 위한 worker flag나 network를 남기지 말 것. Reason: 실제 caller가 생길 때 명시적으로 추가한다.
- OCI env 파일, Compose service, firewall 또는 timer를 직접 바꾸지 말 것. Reason: production mutation은 별도 승인 대상이다.
