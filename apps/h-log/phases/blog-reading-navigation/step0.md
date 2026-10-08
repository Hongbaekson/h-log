# Step 0: heading-anchors-and-toc

## 개선 사항

제목 링크와 목차. 이전 phase `blog-reading-foundation` 완료 후 실행한다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 아래 파일과 수정 대상의 실제 caller를 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`
- `apps/h-log/phases/blog-reading-navigation/index.json`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

실제 본문 heading에 안정적인 ID를 부여하고 desktop sticky 목차와 mobile 접이식 목차를 연결한다. 출처는 본문 하단으로 이동한다. 중복/한글 제목과 고정 헤더 offset을 다루며 code 내부 heading은 제외한다.

## 인수 기준

목차 클릭·직접 hash 접근·새로고침·키보드 이동이 맞는 본문 제목을 가리킨다. 짧은 글은 불필요한 빈 목차를 만들지 않는다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 바꾸는 public behavior의 RED를 확인한 뒤 최소 구현으로 같은 테스트의 GREEN을 확인한다. 순수 콘텐츠/문서 변경은 파서·링크·형식 검증으로 대체한다.
2. UI는 개발 서버와 격리 local DB의 synthetic fixture로 1440/390/320px, focus, 긴 글, 빈/오류 상태를 확인한다. DB/repository/worker/migration 변경 시 `npm run test:integration`을 추가한다.
3. phase index와 이 step에 실제 결과·검증 command·다음 단계를 기록한다. 완료된 기능만 completed로 표시한다.

## 하지 말 것

- 레이더의 데이터·축·형태·배치·주변 영역을 변경하지 말 것. 사용자가 명시적으로 보존을 요청했다.
- 저장 Markdown/HTML/hash나 기존 URL을 무단 재작성하지 말 것. 발행 무결성과 기존 링크를 유지해야 한다.
- raw HTML 주입, private 글/내부 evidence/근거 없는 실적 노출을 허용하지 말 것. 공개 콘텐츠 경계를 유지해야 한다.
- OCI·DNS/TLS·운영 timer·실제 provider 호출·공개 발행을 실행하지 말 것. 로컬 개선 계획이며 기존 OCI 보류는 유지된다.

## 완료 기록 (2026-10-08)

- `lib/blog-public.ts`는 heading의 표시 문자열로 NFC/소문자 slug와 `section-` 접두어를 만들고 중첩 블록까지 중복을 확인한다. `PublicBlogPost.tableOfContents`에는 최상위 H2/H3만 포함한다. 원문/HTML/hash는 그대로다.
- 상세 page는 native hash anchor와 focus 가능한 제목, 112px scroll margin, 데스크톱 sticky 목차와 모바일 details/summary를 제공한다. 긴 목차는 내부 스크롤하고 제목이 없는 글은 목차를 만들지 않는다. 출처와 Markdown 링크는 본문 아래로 이동했다.
- RED: outline/한글·중복 제목/짧은 글 모델 3개 실패와 브라우저 목차 0개를 확인했다. 첫 UI 검증에서 상위 `overflow-x: hidden`으로 sticky top이 -853px까지 밀리는 실패를 확인하고 Blog detail에만 `overflow-x: clip`을 적용했다.
- GREEN: focused 28/28, `npm.cmd run test` 199 pass/13 DB skip, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, phase JSON/path 검사와 `git diff --check`를 통과했다.
- 격리 local PostgreSQL의 synthetic 글로 1440/390/320px에서 목차 19개와 고유 ID, 링크가 있는 제목의 중첩 anchor 방지, 키보드 목차 이동/제목 focus/다음 Tab, 직접 hash·새로고침·고정 헤더 여백, 중첩 제목 링크, 긴 목차 스크롤, 모바일 접기/펼치기와 가로 넘침 없음을 확인했다. 짧은 글 목차 생략, 하단 출처, 원문 일치, private/missing 404와 Home overflow 유지도 통과했다. 브라우저 오류는 없었다.
- 새 client 상태·의존성·DB/repository/worker/migration 변경은 없다. 다음은 [Step 1: 코드 언어와 복사](step1.md)다. Home/레이더·Second Brain·OCI 보류는 유지한다.
