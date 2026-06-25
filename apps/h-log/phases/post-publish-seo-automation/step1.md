# Step 1: crawler-output-generation

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
- sitemap, feed, llms, `.md` endpoint 관련 파일

## 작업

AI crawler와 검색 엔진을 위한 공개 산출물을 생성한다.

- `sitemap.xml`, `feed.xml`, `llms.txt`, `llms-full.txt`는 published 글만 포함한다.
- `/blog/:slug.md`와 HTML 상세의 content_hash 일치를 검증할 수 있게 한다.
- canonical URL, OG metadata, Article metadata를 published 최신 version 기준으로 만든다.
- 비공개 source raw text나 내부 evidence path를 공개 산출물에 포함하지 않는다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. draft/failed 글이 crawler output에 포함되는 실패 테스트를 먼저 작성한다.
2. sitemap/feed/llms가 published 최신 version만 참조하는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 비공개 글 또는 admin preview URL을 crawler output에 넣지 말 것.
- 원문 전체 snapshot을 `llms-full.txt`에 그대로 싣지 말 것.
- SEO metadata에 내부 URL, 서버 IP, 고객사명을 넣지 말 것.
