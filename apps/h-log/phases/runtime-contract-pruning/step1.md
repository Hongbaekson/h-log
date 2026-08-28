# Step 1: shrink-post-publish-verification-contract

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
- `apps/h-log/lib/blog-post-publish-verification.ts`
- `apps/h-log/lib/blog-post-publish-verification.test.ts`
- `apps/h-log/lib/blog-crawler-output.ts`
- `apps/h-log/lib/blog-crawler-output.test.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`

## 작업

`blog-post-publish-verification.ts`를 실제 crawler manifest 책임만 남도록 줄인다.

- `buildPostPublishCrawlerOutputManifest`와 production caller가 쓰는 manifest type은 유지한다.
- live caller가 없는 `verifyPostPublishPublicSurface`, `createPostPublishVerificationJobs`, `decidePostPublishFailure`와 전용 type/test만 제거한다.
- 실제 required publish verification은 existing adapter/worker 경계를 그대로 사용한다.

## 인수 기준

- sitemap/feed/llms crawler output이 기존 published-only manifest를 유지한다.
- required pre/post publish job과 rollback behavior는 변하지 않는다.
- 제거 대상의 non-test caller가 0건임을 다시 확인한다.
- 대체 verification facade를 추가하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-post-publish-verification.test.ts lib/blog-crawler-output.test.ts lib/blog-required-publish-job-adapter.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. crawler manifest focused test를 삭제 전 characterization으로 통과시킨다.
2. live export만 남기고 isolated tests를 제거한다.
3. crawler, required adapter, worker 기본 gate를 재검증한다.
4. phase index와 architecture 책임 설명을 동기화한다.

## 하지 말 것

- manifest builder를 crawler output에 복사하지 말 것. Reason: 현재 한 곳의 published-only 경계를 재사용하면 된다.
- required publish adapter나 persistent worker를 삭제하지 말 것. Reason: 실제 production caller가 있다.
- 제거한 API를 deprecated wrapper로 남기지 말 것. Reason: caller가 없다.
