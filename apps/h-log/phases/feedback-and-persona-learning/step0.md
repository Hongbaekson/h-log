# Step 0: usage-and-performance-signals

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
- usage_events, published posts, search events 관련 파일

## 작업

성과 피드백에 필요한 공개-safe signal contract를 만든다.

- 조회, 검색 유입, 공유, 체류 시간, 검색 클릭 같은 aggregate signal을 정의한다.
- 개인식별 정보와 visitor session memory는 저장하지 않는다.
- 성과 좋은 글의 제목/구조/앵글만 학습 후보로 남긴다.
- 비용성 이벤트와 콘텐츠 성과 이벤트를 구분한다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. visitor 식별자를 signal에 저장하려는 실패 테스트를 먼저 작성한다.
2. aggregate signal만 persona learning 후보로 연결되는지 확인한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 방문자별 장기 메모리나 개인화 응답 데이터를 만들지 말 것.
- 개인정보를 성과 학습 데이터에 넣지 말 것.
- 조회수 기능을 공개 UI 핵심 기능으로 먼저 만들지 말 것.
