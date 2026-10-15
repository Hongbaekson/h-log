# Step 2: home-recent-posts

## 개선 사항

홈에서 최근 글 발견. 같은 phase의 Step 1 완료 후 실행한다.

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
- `apps/h-log/phases/blog-discovery-and-home/index.json`
- `apps/h-log/app/page.tsx`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`

## 작업

현재 소개·CTA·레이더 영역 아래에 최신 published 글 최대 3개를 연결한다. 빈 상태는 섹션을 생략하며 실제 DB 실패와 글 0건은 구분한다. 홈의 정적 소개가 DB 장애 때문에 모두 사라지지 않도록 오류 경계를 설계한다.

## 인수 기준

draft/철회 글은 보이지 않고 날짜순 최대 3개만 표시된다. 글 0건·DB 실패·긴 제목·desktop/mobile를 검증하고 레이더 영역의 값·배치·시각 형태가 이전과 같다.

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

## 완료 기록 — 2026-10-15

- `app/page.tsx`의 기존 마지막 section 뒤에 `HomeRecentPosts`와 `Suspense fallback={null}`을 추가하고 요청 시 렌더링을 명시했다. 레이더/소개/대표 사례/일하는 방식의 markup과 스타일은 수정하지 않았다.
- `components/blog/HomeRecentPosts.tsx`는 공통 `loadPublicBlogContentStore` → `getPublicBlogIndex({ pageSize: 3 })`를 재사용한다. 현재 제목·요약·발행일·글 유형, 상세/전체 글 링크를 표시하고 성공한 0건은 섹션을 생략한다.
- 조회/모델 오류는 최근 글 영역의 일반 안내와 native GET 재시도로 한정한다. 서버에는 원문 없는 `home_recent_posts_unavailable`만 기록한다. DB 지연 중에도 기존 홈은 먼저 전송된다. 새 DB query/API/cache/client state는 없다(ADR-032).
- RED: 격리 local DB 가상 글을 준비한 뒤 브라우저에서 최근 글 영역 수 `0 !== 1`로 실패했다. 동일 검사 GREEN에서 최신 3개의 현재 버전 제목·링크·날짜를 확인했다. `lib/blog-public.test.ts`에는 기존 selector의 3개 제한·날짜순·비공개/철회/없는 현재 버전 제외·0건을 고정하는 characterization을 추가했다.
- `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts`: **35/35 통과**.
- `npm run test`: **209 pass / 13 DB skip / 0 fail**.
- 격리 DB `lib/blog-public-read-path.integration.test.ts`: **1/1 통과**. DB/schema/repository/worker 변경이 없어 전체 integration 재실행은 생략했다.
- `npm run lint`, `npm run typecheck`, `npm run build` 통과. 첫 lint의 내부 `<a>` 안내에 따라 재시도는 전체 GET 요청을 하는 native form으로 수정한 뒤 재검증했다.
- 로컬 ignored `.codex/tmp/home-recent/check.mjs`, `states.mjs`, `failure.mjs` 통과. 1440/390/320px의 긴 제목/요약·줄바꿈·키보드 focus/Enter·상세/전체 글 이동, 철회 후 다음 글 교체, 공개 글 0건 생략, 비공개/철회/privacy/없는 버전404, 레이더/소개 geometry와 SVG 전후 일치를 검증했다.
- DB table lock을 짧게 유지한 격리 검사에서 본문 조회가 끝나기 전에 소개·레이더·일하는 방식 HTML이 전송됐다. 별도 local production 서버의 실패하는 DB 연결에서 홈 HTTP 200, 영역별 오류 안내·전체 GET 재시도, 접속 정보 미노출과 모바일 넘침 없음도 확인했다. 첫 실행에서 빠진 테스트용 public origin을 보완한 뒤 검증했다.
- Phase JSON 38개/step 138개, 공개 경험 계획의 19개 step 읽기 경로, 변경한 Harness 문서의 상대 링크 34개와 `git diff --check`를 확인했다. PRD/ADR/ARCHITECTURE/공개 경험·구현 계획 및 phase registry를 동기화했다.

다음 단계는 **Step 3: rss-and-work-evidence-links**다. 이번 cycle에서 시작하지 않았다. Second Brain과 운영 배포·OCI 보류는 유지한다.
