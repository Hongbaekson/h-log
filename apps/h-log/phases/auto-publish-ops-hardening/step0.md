# Step 0: idempotency-key-contract

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- `apps/h-log/lib/blog-post-publish-retryable-jobs.ts`
- `apps/h-log/lib/blog-diagram-assets.ts`
- `apps/h-log/phases/blog-runtime-integration/index.json`
- runtime persistence phase의 publish job repository 관련 파일

## 작업

모든 persisted publish job이 공유하는 deterministic idempotency key 규칙을 고정한다.

- key는 최소 `job_type`, `post_version_id`, `content_hash`를 반영한다.
- 같은 logical job 재요청은 새 row/side effect 대신 기존 결과를 반환한다.
- content version이 바뀌면 이전 version의 key를 재사용하지 않는다.
- lock, retry, quota, 비용 집계는 이후 step에서 각각 구현한다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. 같은 logical job이 서로 다른 key로 두 번 저장되는 실패 테스트를 먼저 작성한다.
2. 같은 version/job/content hash 조합이 하나의 결과로 수렴하는지 확인한다.
3. version 또는 content hash가 바뀐 경우 새 key가 생성되는지 확인한다.
4. `npm run test`, `npm run typecheck`를 실행한다.
5. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 랜덤 UUID만 idempotency key로 사용하지 말 것.
- 이 step에서 lock, quota, cost ledger를 함께 구현하지 말 것.
- 외부 알림이나 실제 발행을 수행하지 말 것.
