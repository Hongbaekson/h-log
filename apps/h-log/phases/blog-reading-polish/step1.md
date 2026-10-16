# Step 1: real-content-reading-review

## 개선 사항

실제 기술 초안으로 목록부터 본문까지 검토. 같은 phase Step 0과 앞선 T1/T2를 완료한 뒤 실행한다.

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
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/components/blog/BlogSearchPanel.tsx`
- `apps/h-log/lib/blog-discovery-ui.test.ts`
- `apps/h-log/lib/blog-detail-ui.test.ts`
- `apps/h-log/lib/blog-public-read-path.integration.test.ts`
- `apps/h-log/phases/editorial-trust-and-series/step2.md`

## 작업

1. T1에서 검토한 초안 2~3개를 격리된 로컬 미리보기에서 확인한다. 실제 공개 글로 자동 저장/발행하거나 기존 DB 글을 일괄 삭제하지 않는다.
2. 1440/390/320px에서 목록→검색/태그→본문→관련 글/뒤로 이동을 확인한다. 제목·요약·도입부가 같은 문제를 가리키는지, 이미지와 설명이 연결되는지 수동 검토한다.
3. 기존 키보드·목차·코드 복사·표·이미지 없는 글·긴 제목/본문과 빈/오류 상태를 검증한다. 스타일 수정이 필요하면 가장 가까운 RED/GREEN과 기본 gate를 거쳐 해당 범위만 고친다.
4. 공개 가능한 검수 기록, 실제 초안/fixture 구분, 남은 사실 확인·발행 준비 항목을 남긴다. 시리즈·수정 이력·실제 발행은 기존 phase와 운영 절차에 연결한다.

## 인수 기준

초안별 문체·사실 보존·화면 검수 결과와 viewport/명령/오류 유무를 기록한다. 3개 phase의 완료 범위와 실제 배포·공개 여부를 구분하고 미해결 인수 항목이 있으면 완료 처리하지 않는다.

## 검증

앱 명령은 `apps/h-log`에서 실행한다. 문서/콘텐츠 검토와 runtime 검증 결과를 구분한다.

node --no-warnings --test --experimental-strip-types lib/blog-discovery-ui.test.ts lib/blog-detail-ui.test.ts lib/blog-public.test.ts lib/blog-search-ui.test.ts

격리 DB public read 경로는 npm run test:public-read-path로 확인한다. 순수 검토면 문서 파싱과 git diff --check, UI/production 수정이 생기면 TDD와 npm run test/lint/typecheck/build를 추가한다.

개발 서버의 1440/390/320px에서 화면과 키보드를 확인한다. 로컬 fixture·DB만 사용하고 Home/레이더 및 Second Brain 변경이 없는지 diff를 확인한다.

완료 시 이 파일과 phase index에 변경 파일·명령·실제 결과·다음 step을 기록하고 전체 registry와 관련 계획을 동기화한다. 아직 실행하지 않은 항목은 pending으로 둔다.

## 하지 말 것

- 확인되지 않은 경험·성과·감정을 추가하지 말 것. 이유: 개인 기록의 사실 범위를 보존해야 한다.
- 회사 원문·내부 식별자·private 버전·토스 원문/이미지를 공개 콘텐츠로 복사하지 말 것. 이유: 승인된 근거와 자산만 사용한다.
- Home/레이더·Second Brain·무관한 schema나 기능을 변경하지 말 것. 이유: 이번 단위는 Blog의 문체와 읽기 개선이다.
- 저장 글을 일괄 수정/삭제하거나 OCI·실제 provider·자동 공개 발행·timer를 실행하지 말 것. 이유: 이 로컬 개선 계획은 기존 운영 보류와 발행 경계를 변경하지 않는다.

## 완료 기록 — 2026-10-16

- [공개 가능한 검수 기록](../../.codex/docs/harness/BLOG_READING_REVIEW.md)에 초안별 제목·요약·도입부/문체·사실 보존, 화면 검수와 남은 발행 준비 항목을 정리했다. T1 Step 2 최종 교정본 2개와 메타정보를 원문 그대로 재사용했고 추가 교정은 없다. 가상 글·이미지는 실제 초안과 구분했다.
- 개발 서버 1440/390/320px에서 목록→검색/태그→본문→관련 글/뒤로, 키보드, 목차/직접 anchor, 코드 복사/실패/재시도, 표·그림, 긴 제목과 이미지 없는 글, 빈 목록/태그/검색 및 오류 복구를 통과했다. 정상 탐색·본문의 브라우저 오류는 0건이다.
- 발견/수정: DB 복구 뒤 `reset()`만 호출한 버튼이 서버를 다시 조회하지 않는 RED를 재현했다. `app/blog/error.tsx`에서 현재 URL을 새로 요청하도록 바꾸고 `lib/blog-discovery-ui.test.ts`의 기존 계약을 갱신했다. 같은 브라우저 검사의 GREEN과 개발/로컬 production mode의 세 폭 목록·상세 재시도, query/tag/page/hash 보존을 확인했다.
- 검증: 위 focused 52/52, `npm run test:public-read-path` 1/1, `npm run test` 213 pass/13 DB skip, lint/typecheck/build, Markdown/JSON/링크 및 `git diff --check` 통과. 비공개/없는 글 404, raw Markdown, 11개 기존 claim과 저장된 4개 version의 원문/HTML/hash 보존, source 확인 시각 유지, 발행 작업 0건도 확인했다.
- 동기화: 검수 기록, 작성 가이드, PRD/ARCHITECTURE/IMPLEMENTATION_PLAN, 문체·읽기 계획과 phase index/전체 registry. 검증 자료는 Git/Docker 제외된 `private/blog-reading-review/`에 보관하며 합성 public 자산은 제거했다. Home/레이더·Second Brain·운영 DB/OCI/실제 발행은 변경하지 않았다.
- T1/T2/T3의 7개 step을 완료했다. 다음은 기존 `blog-discovery-and-home / Step 3: rss-and-work-evidence-links`이며 이번에 시작하지 않았다. 실제 모델 문체 평가·발행 전 근거 갱신·실물 자산·운영 측정·시리즈/수정 이력은 검수 기록의 별도 후속 범위다.
