# Step 3: daily-cron-draft-to-publish

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
- topic collection, research pack, article generation, publish jobs 관련 파일

## 작업

일일 자동 작성 흐름을 하나의 bounded pipeline으로 연결한다.

- collectTopics -> rankTopics -> buildResearchPack -> applyToMyContext -> generateArticle -> validateArticle -> createPostVersion -> runRequiredPublishJobs -> markPublished를 순서대로 실행한다.
- 하루 publish 최대 1회와 retry limit을 적용한다.
- 좋은 후보가 없으면 `no_topic`으로 정상 종료한다.
- 외부 LLM/API 호출은 adapter와 usage_events 뒤에 둔다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 같은 cron이 중복 실행되어 중복 발행되는 실패 테스트를 먼저 작성한다.
2. no_topic, weak_sources, budget_exceeded가 public 글을 만들지 않는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 무한 반복 cron을 만들지 말 것. 이유: 비용과 중복 발행 위험이 있다.
- 외부 API key나 token을 fixture에 넣지 말 것.
- 사용자 승인 없이 실제 공개 발행 side effect를 실행하지 말 것.
