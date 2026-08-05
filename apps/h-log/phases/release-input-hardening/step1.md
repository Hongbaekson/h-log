# Step 1: reproducible-production-build-inputs

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
- `apps/h-log/package-lock.json`
- deployment and rollback runbooks

## 작업

production build에 쓰는 base image와 dependency audit의 재현 가능성을 강화한다.

- 실제 사용하는 image만 immutable digest로 pin하고, digest의 version/architecture와 rollback 기록 방식을 함께 남긴다.
- Redis 제거 phase가 완료되지 않았다면 그 결과를 먼저 반영한 service만 대상으로 한다.
- `npm audit --omit=dev` live 실행은 registry에 dependency metadata를 전송하므로 사용자 명시 승인 후에만 수행한다. 승인 전에는 lockfile 기반 정적 검토와 기존 audit 기록을 구분해 적는다.

## 인수 기준

- Compose/Dockerfile의 production base image는 mutable tag만으로 release를 결정하지 않는다.
- image digest 변경은 명시적인 source artifact와 rollback reference를 가진다.
- production dependency audit 결과의 날짜와 실행 조건이 기록되며, 실행하지 못한 경우 이를 0건으로 주장하지 않는다.

```bash
docker compose config --quiet
npm run test
npm run lint
npm run build
git diff --check
```

## 검증

1. production image와 tag-only reference를 목록화한다.
2. 필요한 digest와 해당 platform이 확인된 것만 pin한다.
3. live audit이 필요하면 dependency metadata 전송 범위를 사용자에게 알리고 명시 승인을 받는다.
4. phase index status와 summary를 갱신한다.

## 하지 말 것

- 최신 tag로 무작정 dependency/image를 올리지 말 것. Reason: 이 step은 upgrade가 아니라 재현 가능한 release input 고정이다.
- OCI image pull, Compose restart, timer activation을 실행하지 말 것. Reason: production mutation은 별도 승인 경계다.
