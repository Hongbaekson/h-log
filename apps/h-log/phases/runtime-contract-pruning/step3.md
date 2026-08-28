# Step 3: shrink-admin-contract

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
- `apps/h-log/lib/blog-admin.ts`
- `apps/h-log/lib/blog-admin.test.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-postgres-repository.integration.test.ts`

## 작업

admin module을 PostgreSQL repository가 실제 사용하는 retract/audit contract로 축소한다.

- `retractAdminPost`, `AdminPostVisibilityInput`과 필요한 최소 shared type을 유지한다.
- live caller가 없는 preview, save draft, publish, correction, unpublish, generic operational action 함수/type/test를 제거한다.
- repository transaction의 retract + `admin_actions` atomic write와 public/crawler/search 제거는 유지한다.
- `/admin`, auth, Discord command, 새 API는 추가하지 않는다.

## 인수 기준

- repository-backed retract가 기존 status/audit record를 생성한다.
- audit 저장 실패 시 retract도 rollback되는 원자성이 유지된다.
- retracted post는 public/crawler/search/related surface에 남지 않는다.
- 삭제 대상의 non-test caller가 0건이다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-admin.test.ts
npm run test:integration
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. retract/audit behavior를 focused 및 PostgreSQL integration characterization으로 고정한다.
2. live retract path에 필요한 최소 export만 남긴다.
3. atomic rollback과 여덟 public surface 제거 회귀를 확인한다.
4. PRD/ADR/ARCHITECTURE의 "최소 관리자" 범위를 실제 runtime과 동기화한다.

## 하지 말 것

- auth 없는 admin route를 추가하지 말 것. Reason: 보안/공개 정책 결정이 필요한 별도 범위다.
- repository retract를 직접 SQL helper로 중복 구현하지 말 것. Reason: 현재 transaction 경계를 유지해야 한다.
- future correction workflow를 위한 interface를 남기지 말 것. Reason: 실제 caller가 생길 때 설계한다.
