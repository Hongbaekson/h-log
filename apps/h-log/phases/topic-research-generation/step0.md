# Step 0: source-collector-and-ranking

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
- post publish automation, usage_events, topic candidate 관련 파일

## 작업

완전 자동 글 생성을 시작하기 전 주제 수집과 후보 점수화 contract를 만든다.

- GeekNews, 요즘IT, 기업 기술 블로그, 공식 release note, HN, GitHub, 보안/운영 feed를 source type으로 분리한다.
- GeekNews/HN/Reddit 같은 반응성 source는 discovery/reaction 신호로만 둔다.
- 후보 점수는 전문성 관련성, 원문 확인 가능성, 직접 검증 가능성, 운영 교훈, 중복/위험 감점을 반영한다.
- 일일 수집량, 중복 URL, source cache TTL, 비용 기록을 contract로 둔다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 중복 source가 topic candidate를 중복 생성하는 실패 테스트를 먼저 작성한다.
2. discovery-only source가 높은 score를 받더라도 claim source로 승격되지 않는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 원문 전체를 기본 저장하지 말 것. 이유: 저작권과 개인정보 리스크가 있다.
- GeekNews 같은 큐레이션을 official source로 취급하지 말 것.
- 수집 phase에서 바로 글을 생성하거나 발행하지 말 것.
