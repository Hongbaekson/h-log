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

## 완료 기록 — 2026-10-16

- 변경: `app/blog/[slug]/page.tsx`의 제목·도입부·본문 최대 폭을 46rem(736px)로 맞췄다. 본문은 17px/32px, 제목은 모바일 36px·데스크톱 48px, H2는 24/28px·위 여백 48px, H3는 20px·위 여백 32px다. 첫 문단의 중복 위 여백을 제거하고 코드/그림/표 전후는 32px, 표/그림 설명은 15px로 조정했다. 코드 내부의 14px/24px와 기존 읽기 도구를 유지했다.
- 테스트: `lib/blog-detail-ui.test.ts`의 기존 읽기 폭 기대값을 갱신했다. 브라우저에서 16px 본문이 17px 기준에 실패하는 RED를 확인하고 같은 검증의 GREEN을 확인했다.
- 명령: 위 focused test 42/42, `npm run test` 213 pass/13 DB skip, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check` 통과. DB/repository/migration 변경은 없다.
- 화면: 격리 로컬 DB의 기존 검수 초안 2개와 합성 스트레스 글 1개를 1440/390/320px에서 확인했다. 본문 폭·글자·여백, 긴 제목, 페이지 가로 넘침 없음, sticky/접이식 목차, 키보드 anchor/focus와 별도 직접 링크 접근·새로고침, 코드 복사/내부 스크롤, semantic table/키보드 스크롤, 첫 H2 뒤 검증 diagram, 출처·관련 글을 검증했다. 실제 초안의 목록→본문 통합 편집 검토는 Step 1에 남긴다.
- 보존: raw Markdown HTTP 응답, 비공개/없는 글 404, 초안 원본 2개와 저장된 4개 version의 Markdown/HTML/content hash 일치를 확인했다. Home/레이더·Second Brain·공개 조회/자산 삽입 계약은 변경하지 않았다.
- 로컬 검증 스크립트·캡처·manifest는 Git 제외된 `private/blog-reading-check/`에 보관했다. 화면용 합성 그림은 검증 후 public에서 제거했다. 실제 공개 발행·운영 배포·외부 provider·OCI·timer는 실행하지 않았다.
- 다음: `blog-reading-polish / Step 1: real-content-reading-review`는 pending이다.
