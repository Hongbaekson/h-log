# Step 2: related-posts-similarity

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
- post_chunks, embeddings, published route 관련 파일

## 작업

상세 페이지 하단의 관련 글 추천을 embedding similarity 중심으로 만든다.

- `post_chunks`는 `post_version_id`와 `content_hash`를 가진다.
- 관련 글 후보는 published 글만 대상으로 한다.
- 유사도 퍼센트 또는 유사도 근거를 UI에 표시할 수 있는 contract를 만든다.
- tag 기반 fallback은 허용하되 primary ranking과 섞이는 규칙을 테스트한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. draft/failed 글이 related 결과에 섞이는 실패 테스트를 먼저 작성한다.
2. content_hash 변경 시 stale similarity가 배제되는지 확인한다.
3. UI 변경 시 lint/build와 viewport 확인을 수행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 관련 글 추천을 챗봇 답변 생성에 연결하지 말 것.
- 현재 글 자신을 관련 글로 노출하지 말 것.
- stale embedding을 최신 version 결과처럼 보여주지 말 것.
