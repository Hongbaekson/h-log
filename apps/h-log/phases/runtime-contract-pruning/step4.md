# Step 4: remove-test-only-model-mirrors

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
- `apps/h-log/migrations/001_blog_core.sql`
- `apps/h-log/migrations/002_publish_job_leases.sql`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-content-model.test.ts`
- `apps/h-log/lib/blog-article-generation.ts`
- `apps/h-log/lib/blog-article-generation.test.ts`

## 작업

runtime source of truth가 아닌 test-only model mirror 두 개를 제거한다.

- 실제 migration과 맞지 않는 `BLOG_CONTENT_MODEL_TABLES` 및 field-list assertions를 삭제한다.
- live caller가 없는 `createArticleGenerationRunRecord` factory와 전용 test/input type을 삭제한다.
- live domain record type, status transition, content hash, quality gate validation, repository persistence는 유지한다.
- 문서의 미래 table 목록은 구현 완료로 표현하지 않고 target model임을 분명히 한다.

## 인수 기준

- 실제 DB table/column source of truth는 migration과 repository query다.
- `PostGenerationRunRecord` 등 live import가 있는 type은 caller 확인 없이 삭제하지 않는다.
- article validation과 generation-integrity phase 결과가 그대로 통과한다.
- 누락된 미래 table을 맞추기 위한 migration은 추가하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-content-model.test.ts lib/blog-article-generation.test.ts lib/blog-daily-auto-article.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. 두 export의 non-test caller가 0건인지 다시 확인한다.
2. mirror 전용 assertions/factory만 제거하고 focused GREEN을 확인한다.
3. migrations, repository, generation pipeline 기본 gate를 재검증한다.
4. PRD/ARCHITECTURE/장기 계획에서 current schema와 future target을 구분한다.

## 하지 말 것

- mirror에 적힌 미구현 table을 생성하지 말 것. Reason: stale 목록을 schema 요구사항으로 승격시키면 안 된다.
- live record type을 일괄 삭제하지 말 것. Reason: 저장소와 pipeline caller가 있는 type이 섞여 있다.
- 새 schema registry를 만들지 말 것. Reason: migrations가 이미 source of truth다.
