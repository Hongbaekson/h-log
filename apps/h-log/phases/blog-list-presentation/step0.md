# Step 0: readable-post-rows

## 개선 사항

일반 목록과 검색 결과의 읽기 위계. blog-writing-quality Steps 0~2의 초안과 작성 기준을 재사용한다.

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
- `apps/h-log/phases/blog-list-presentation/index.json`
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/components/blog/BlogSearchPanel.tsx`
- `apps/h-log/components/blog/BlogTopicFilters.tsx`
- `apps/h-log/lib/blog-discovery-ui.test.ts`
- `apps/h-log/lib/blog-search-ui.test.ts`
- `apps/h-log/lib/blog-public.test.ts`

## 작업

1. 일반 목록과 검색 결과를 제목·요약 중심의 단순한 행으로 맞춘다. 제목은 데스크톱 22~24px/모바일 19~20px, 요약은 16~17px을 시작값으로 실제 한글 글과 긴 제목에서 조정한다.
2. 요약은 두 줄을 기본으로 하고 날짜·현재 article mode·태그의 역할을 구분한다. 검색 일치 정보는 요약 잘림과 별개로 읽을 수 있게 유지하며 작성자 배지를 반복 추가하지 않는다.
3. visible search, compact topic filters, q/tag/page·history·pagination·빈/제한/오류 상태를 유지한다. 제목은 semantic heading/link로 남기고 실제 중복이 있을 때만 표시 컴포넌트를 공유한다.
4. 이 step은 목록 표현만 변경한다. Home 최근 글, 본문, 검색 알고리즘, taxonomy/DB와 썸네일은 범위에 넣지 않는다.

## 인수 기준

일반 목록과 검색 결과에서 긴 제목·요약·메타정보가 잘리지 않고 링크와 필터를 키보드로 사용할 수 있다. 1440/390/320px에서 페이지 가로 넘침이 없고 URL 검색 상태와 공개 글 개수 의미가 유지된다.

## 검증

앱 명령은 `apps/h-log`에서 실행한다. production behavior 변경은 가까운 실패를 먼저 확인한 뒤 같은 검증의 GREEN을 남긴다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-discovery-ui.test.ts lib/blog-search-ui.test.ts lib/blog-public.test.ts
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
