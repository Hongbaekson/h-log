# Step 7: blog-detail-readability

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/lib/blog-public-source.ts`
- 공개된 실제 Blog fixture 또는 DB post

## 작업

Blog 상세의 읽기 폭과 보조 문구를 정리하되 renderer 기능은 실제 콘텐츠 요구만큼만 유지한다.

- 본문 폭을 약 65-75자로 제한하고 heading, paragraph, code block 간격을 모바일과 데스크톱에서 확인한다.
- Markdown 원문, 출처, 공개 정책처럼 사용자에게 보이는 보조 문구를 한국어 UI copy로 통일한다.
- Source link의 목적과 외부 이동 여부를 명확하게 하고 keyboard focus를 유지한다.
- 실제 공개 post가 list, link, inline code 같은 미지원 문법을 포함할 때만 해당 fixture로 RED를 만든 뒤 safe typed renderer를 최소 확장한다.
- `content_markdown` canonical input, React escaping, published-current boundary는 유지한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 실제 공개 fixture가 요구하는 읽기/renderer behavior의 RED 또는 현재 renderer characterization test를 먼저 확인한다.
2. 필요한 범위만 구현하고 `lib/blog-public.test.ts`를 GREEN으로 만든다.
3. 긴 제목, 긴 코드 줄, source link를 모바일/데스크톱에서 확인한다.
4. 저장 HTML 직접 주입과 비공개 source/evidence 노출이 없는지 정적 보안 테스트를 확인한다.
5. 성공 시 phase index의 Step 7을 `completed`로 갱신한다.

## 하지 말 것

- 실제 글이 요구하지 않는 Markdown 표, footnote, TOC, code-copy 기능을 선행 구현하지 말 것. 이유: 현재 공개 콘텐츠의 문제를 해결하지 않는다.
- Markdown rendering dependency를 추가하지 말 것. 이유: 현재 allowlist renderer의 보안 경계를 불필요하게 넓힌다.
- `dangerouslySetInnerHTML`을 다시 사용하지 말 것. 이유: 저장/생성 HTML을 XSS sink로 만든다.
