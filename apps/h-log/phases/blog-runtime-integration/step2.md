# Step 2: db-backed-public-read-path

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
- `apps/h-log/lib/blog-public-data.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/app/blog/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`
- crawler/search route 관련 파일
- Step 1 PostgreSQL repository 파일

## 작업

production public blog read path를 정적 `blogContentStore` fixture에서 PostgreSQL repository로 전환한다.

- `/blog`, `/blog/[slug]`, `/blog/:slug.md`, sitemap/feed/llms/search가 같은 DB-backed published-only source를 사용한다.
- fixture store는 단위 테스트와 import/transition 지원으로만 남긴다.
- DB 연결 실패를 draft 공개나 stale fixture fallback으로 숨기지 않는다.
- Next.js rendering/cache 방식은 현재 route behavior를 유지하는 최소 변경으로 결정한다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## 검증

1. DB에만 존재하는 published 글이 public route에 보이지 않는 RED를 먼저 만든다.
2. DB-backed 목록, 상세, Markdown, crawler surface가 같은 current version을 읽는지 확인한다.
3. draft, failed, corrected-before-republish, retracted 글이 모든 public surface에서 제외되는지 확인한다.
4. 성공 시 phase index의 step status와 summary를 갱신한다.

## 하지 말 것

- DB 실패 시 정적 fixture를 production fallback으로 노출하지 말 것.
- route마다 published 판정 로직을 따로 복제하지 말 것.
- 이 step에서 관리자 UI나 외부 provider 호출을 추가하지 말 것.
