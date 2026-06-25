# Step 0: hybrid-search-contract

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
- published route boundary와 post version model 관련 파일

## 작업

챗봇 없는 검색/관련 글 contract를 만든다.

- 키워드 매칭과 벡터 유사도 결과를 합치는 interface를 테스트로 정의한다.
- 관련 글 추천은 published 글만 대상으로 한다.
- `/api/search`는 cache, rate limit, 짧거나 반복적인 검색어 차단 기준을 둔다.
- 임베딩과 pgvector는 검색/관련 글 전용이며 방문자 대화 UI에 연결하지 않는다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 비공개 글이 검색/관련 글에 섞이는 실패 테스트를 먼저 작성한다.
2. 봇성 요청이나 중복 요청의 비용 방어 기준을 테스트한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 방문자 RAG 챗봇이나 SSE 대화 UI를 만들지 말 것. 이유: 제품 범위에서 제외됐다.
- 모든 검색마다 임베딩 호출을 강제하지 말 것. 이유: 비용 폭주 방어가 필요하다.
- draft, failed 상태 글을 검색 결과나 관련 글에 노출하지 말 것.
