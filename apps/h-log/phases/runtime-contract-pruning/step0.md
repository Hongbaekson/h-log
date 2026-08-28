# Step 0: remove-legacy-file-blog-loader

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
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/lib/blog.ts`
- `apps/h-log/lib/blog.test.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`

## 작업

file-based `getBlogPosts`/`getBlogPostBySlug` loader의 live caller와 실제 import/transition command를 다시 확인한다.

- production, script, fixture import consumer가 없으면 `blog.ts`와 전용 test를 삭제한다.
- public runtime은 현재 PostgreSQL-backed `blog-public-source.ts`를 그대로 사용한다.
- AGENTS/PRD/ADR/ARCHITECTURE의 "import/transition 지원" 표현을 실제 상태에 맞춘다.
- consumer가 발견되면 삭제하지 않고 필요한 전환 완료 조건을 이 step에 기록한다.

## 인수 기준

- 삭제 시 repository 전체에서 legacy loader import/call이 0건이다.
- `/blog`, slug detail, Markdown, crawler/search public source는 변하지 않는다.
- 대체 loader, adapter, compatibility wrapper를 추가하지 않는다.
- 실제 import workflow가 있으면 증거 없이 제거하지 않는다.

```bash
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. repository-wide caller, script, content migration path를 다시 검색한다.
2. live consumer가 없으면 전용 characterization test와 loader를 함께 삭제한다.
3. DB-backed public/crawler/search focused test와 기본 앱 gate를 통과시킨다.
4. phase index와 호환 이력 문서를 동기화한다.

## 하지 말 것

- 기존 Markdown 파일이나 사용자 콘텐츠를 삭제하지 말 것. Reason: loader contract 삭제와 content 삭제는 다른 범위다.
- 새 import CLI를 만들지 말 것. Reason: 실제 consumer 없는 호환 코드를 대신할 필요가 없다.
- caller가 발견됐는데 삭제를 강행하지 말 것. Reason: transition ownership을 먼저 끝내야 한다.
