# Step 1: required-vs-retryable-jobs

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
- DB 수동 발행 phase의 model, route, admin 관련 파일

## 작업

발행 job의 중요도를 required와 retryable로 분리한다.

- required: public_url, md_url, render, privacy_scan, sitemap, content_version_match
- retryable: embedding, search_index, related_posts, llms, feed, IndexNow, Discord, OG, diagram
- required job 실패 시 `failed_publish` 또는 `failed_verification`으로 남긴다.
- retryable job 실패는 published 상태를 유지하되 실패 사유와 retry count를 기록한다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. required job 실패가 공개 전환을 막는 실패 테스트를 먼저 작성한다.
2. retryable job 실패가 published 상태를 유지하는 테스트를 작성한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- optional job 실패 때문에 무조건 비공개 처리하지 말 것. 이유: 발행 후 재시도로 처리 가능한 작업이다.
- required job을 임의로 retryable로 낮추지 말 것. 이유: public exposure 검증이 약해진다.
- 외부 IndexNow/Discord를 실제로 호출하지 말 것.
