# Step 0: article-reading-rhythm

## 개선 사항

긴 기술 글의 본문 폭과 간격. blog-writing-quality와 blog-list-presentation을 완료한 뒤, 준비한 초안으로 확인한다.

## 읽을 파일

경로는 저장소 루트 기준이다. 수정 전 아래 파일과 실제 caller를 확인한다. T1 Step 0 이후에는 그 단계에서 만든 작성 가이드와 비공개 검수 초안도 읽는다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/BLOG_EDITORIAL_READING_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/phases/blog-reading-polish/index.json`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-detail-ui.test.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/lib/blog-diagram-assets.ts`

## 작업

1. 현재 72ch 본문과 desktop TOC 배치를 확인하고, 읽기 폭 700~760px·본문 17px·줄 간격 1.7~1.9를 시작값으로 한국어 긴 문단에서 조정한다. 수치를 그대로 복제하는 대신 모바일 320px까지 읽을 수 있는지 확인한다.
2. 제목·날짜·도입부에서 본문으로 이어지는 간격과 H2/H3·문단·코드·표·기존 diagram의 여백을 맞춘다. 큰 장식 이미지나 새 요약 카드를 필수로 추가하지 않는다.
3. sticky/collapsible TOC, anchor 직접 접근·focus, 코드 복사·내부 스크롤, semantic table, 출처와 관련 글은 유지한다. 토스의 목차 유무와 무관하게 현재 읽기 기능을 보존한다.
4. 기존 Markdown/HTML/hash와 자산 삽입 위치 계약을 바꾸지 않고 상세 화면의 표현에 한정한다. 저장 콘텐츠 이동이 필요하면 별도 편집 작업으로 기록한다.

## 인수 기준

1440/390/320px의 긴 실제 초안에서 본문·코드·표가 읽히고 페이지 전체 가로 스크롤이 없다. 목차/anchor·코드 복사·키보드와 private/missing 404, raw Markdown 및 content hash는 유지된다.

## 검증

앱 명령은 `apps/h-log`에서 실행한다. production behavior 변경은 가까운 실패를 먼저 확인한 뒤 같은 검증의 GREEN을 남긴다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-detail-ui.test.ts lib/blog-public.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```



개발 서버의 1440/390/320px에서 화면과 키보드를 확인한다. 로컬 fixture·DB만 사용하고 Home/레이더 및 Second Brain 변경이 없는지 diff를 확인한다.

완료 시 이 파일과 phase index에 변경 파일·명령·실제 결과·다음 step을 기록하고 전체 registry와 관련 계획을 동기화한다. 아직 실행하지 않은 항목은 pending으로 둔다.

## 하지 말 것

- 확인되지 않은 경험·성과·감정을 추가하지 말 것. 이유: 개인 기록의 사실 범위를 보존해야 한다.
- 회사 원문·내부 식별자·private 버전·토스 원문/이미지를 공개 콘텐츠로 복사하지 말 것. 이유: 승인된 근거와 자산만 사용한다.
- Home/레이더·Second Brain·무관한 schema나 기능을 변경하지 말 것. 이유: 이번 단위는 Blog의 문체와 읽기 개선이다.
- 저장 글을 일괄 수정/삭제하거나 OCI·실제 provider·자동 공개 발행·timer를 실행하지 말 것. 이유: 이 로컬 개선 계획은 기존 운영 보류와 발행 경계를 변경하지 않는다.
