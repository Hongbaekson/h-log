# Step 6: remove-test-only-repository-write-apis

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
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-postgres-repository.integration.test.ts`
- `apps/h-log/lib/blog-local-dry-run.integration.test.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/migrations/001_blog_core.sql`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`

## 작업

integration-test setup만을 위해 공개된 repository write API를 제거한다.

- `savePublishJob`과 `savePublishVerification`의 production, script, worker caller를 다시 확인한다.
- publish-job idempotency test는 production과 같은 `savePost` aggregate 경로를 우선 사용한다.
- rollback verification setup에 production write path가 없으면 test-local SQL fixture로 한정하고 새 production API를 만들지 않는다.
- public interface와 두 구현만 제거하고 `savePost`가 사용하는 internal `insertPublishJob`은 유지한다.

## 인수 기준

- `PostgresBlogRepository`에 test-only `savePublishJob`/`savePublishVerification` method가 없다.
- publish-job idempotency key 수렴, invalid-key 거부, version별 key 분리 검증이 유지된다.
- rollback eight-surface verification record와 local dry-run coverage가 유지된다.
- internal publish-job insertion, migrations, worker lease/retry/public transition은 변경하지 않는다.

```bash
npm run test:integration
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. 두 method의 non-test caller가 0건인지 repository-wide로 재확인한다.
2. integration test setup을 live aggregate path 또는 test-local SQL로 바꾸고 같은 assertion을 통과시킨다.
3. public interface와 구현만 삭제한 뒤 PostgreSQL integration aggregate gate를 실행한다.
4. worker, rollback, public read 전체 gate와 phase 문서를 동기화한다.

## 하지 말 것

- internal `insertPublishJob`을 삭제하거나 public method로 다시 노출하지 말 것. Reason: `savePost` aggregate persistence가 사용하는 live 경계다.
- idempotency 또는 rollback assertion을 삭제해 GREEN을 만들지 말 것. Reason: test setup API만 제거하는 step이다.
- migration이나 production PostgreSQL data를 변경하지 말 것. Reason: schema/data cleanup이 아니다.
