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

일일 자동 작성 흐름을 bounded generation pipeline과 persistent worker handoff로 연결한다.

- Generation pipeline은 collectTopics -> rankTopics -> buildResearchPack -> applyToMyContext -> generateArticle -> validateArticle -> createPostVersion -> private `publishing` aggregate와 queued required jobs 저장까지만 실행한다.
- 서울 날짜별 advisory lock과 결정적 post ID로 하루 생성을 멱등 처리하고, 생성 slug는 PostgreSQL 존재 조회로 중복을 차단한다.
- Required publish job, retry stop, public 전이는 persistent worker만 실행한다.
- 좋은 후보가 없으면 `no_topic`으로 정상 종료한다.
- 외부 LLM/API 호출은 adapter와 usage_events 뒤에 둔다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 같은 cron이 중복 실행되어 중복 저장되는 실패 테스트를 먼저 작성한다.
2. no_topic, weak_sources, budget_exceeded가 public 글을 만들지 않는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 무한 반복 cron을 만들지 말 것. 이유: 비용과 중복 발행 위험이 있다.
- 외부 API key나 token을 fixture에 넣지 말 것.
- 사용자 승인 없이 실제 공개 발행 side effect를 실행하지 말 것.
