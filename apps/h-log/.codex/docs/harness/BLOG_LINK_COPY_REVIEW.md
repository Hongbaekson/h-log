# 블로그 글·소제목 주소 복사 검수

2026-11-11(KST), [R4 Step 2](../../../phases/blog-tag-and-link-polish/step2.md)을 완료했다. 기준 commit은 `6ad8e50b2bd325f6f14b5a454dba66b79bd87de6`다.

## 구현과 경계

- 글 상단은 기존 `postUrl`을 가진 일반 링크와 복사 버튼을 제공한다. H2/H3는 기존 고유 ID·# anchor를 유지하고 공개 URL에 인코딩한 ID를 붙여 복사한다. 인용/목록 안의 제목도 같은 경로를 사용한다.
- 복사 주소는 서버의 `resolvePublicSiteOrigin`과 공개 글 `post.href`에서 만들어진다. 현재 브라우저 주소·검색 query·기존 hash·관리자 경로를 읽거나 공유하지 않는다. 새 URL 생성 규칙이나 origin 추측은 추가하지 않았다.
- `BlogLinkCopy`만 client component이며 Clipboard API 완료 후 성공을 알린다. 거부/미지원은 실패 안내와 canonical 일반 링크를 제공한다. 키보드 초점을 유지하고 외부 공유 SDK·추적기·권한 선요청을 넣지 않았다.
- 기존 hydration 패턴으로 JS OFF에는 복사 버튼이 나타나지 않는다. 서버의 글 주소 링크·# 이동·목차는 유지한다. 관리자 `BlogContent` caller는 articleUrl을 전달하지 않아 공유 버튼이 추가되지 않는다.
- 새 DB/repository·schema·API·공통 Badge·Brain/Home 소스 변경은 없다. 원문/과거 버전의 Markdown·HTML·hash를 다시 쓰지 않는다.

## RED → GREEN

앱 코드 변경 전에 기존 production 빌드에서 [브라우저 검사](../../../scripts/blog-link-copy.browser-check.mjs)를 실행했다. 1440/390/320px × 복사 성공/거부/미지원/JS OFF의 **12표본 모두 글 canonical 링크가 0개라는 예상 이유로 실패**했다. 구현 후 개발 서버 12표본이 통과했고 최종 production/dev에서도 각각 12표본, **총 24표본**을 통과했다.

성공 표본은 브라우저의 실제 Clipboard API로 복사한 문자열을 읽어 비교했다. 거부는 `NotAllowedError`, 미지원은 API 없음으로 주입해 실패 상태와 fallback href를 검사했다. 브라우저 권한 UI를 수동으로 조작한 결과는 아니다. 페이지에 검색·관리자 경로를 담은 query와 무관한 hash를 넣은 뒤에도 공개 canonical 주소만 복사됐다.

한글 제목과 같은 제목의 두 번째 ID, 인용 안의 H3를 확인했다. 버튼 Enter·focus 유지·URL 미변경, # 클릭·뒤로가기·직접 hash 진입·새로고침 뒤 같은 제목 도착, 가로 넘침·pageerror 없음과 JS OFF native anchor를 검사했다. 소제목/목차의 생성 규칙은 변경하지 않았다.

| 검사 | 결과 |
| --- | --- |
| 가까운 단위 | `blog-detail-ui.test.ts`, `blog-public.test.ts` **49/49** |
| 전체 단위 | `npm run test` **294 pass / 28 DB skip / 0 fail** |
| 격리 DB | `blog-public-read-path.integration.test.ts` **2/2**, skip 0 |
| 브라우저 | production/dev 각 12표본, 총 **24/24**. 1440/390/320px·성공/거부/미지원/JS OFF |
| 타입·build | `npm run typecheck`, `npm run build` 통과. 기존 blog-thumbnails 동적 filesystem tracing 경고 2건 |
| lint | 기본 `npm run lint`는 기존 Git 제외 private helper 오류 10개·경고 6개로 실패. private 제외 소스 lint는 통과 |
| 공개 경계·원문 | 합성 공개 8·비공개 1·철회 1, 비공개 제목 제외·철회 후 검색 8→7, 조회/복사 전후 Markdown·HTML·hash 보존 |
| 기존 화면 | production/dev Home 레이더·Brain canvas의 세 폭과 가로 넘침 확인. 관련 소스 변경 없음 |

## 재현과 남은 범위

`verifyBlogLinkCopy(browser, origin, fixture, output)`의 caller는 격리 loopback 앱·브라우저·공개 합성 글을 준비한다. fixture의 `slugs[0]`과 `headingIds`는 한글·중복·중첩 heading을 포함한다. 공개 origin은 `https://hlog.example.org`로 고정하며 브라우저의 외부 요청을 차단한다. 실제 운영 데이터나 원격 공개 사이트에서 실행하지 않는다.

```powershell
node --no-warnings --experimental-strip-types --test lib/blog-detail-ui.test.ts lib/blog-public.test.ts
npm run test
npm run lint
node node_modules/eslint/bin/eslint.js . --ignore-pattern "private/**"
npm run typecheck
npm run build
node --no-warnings --experimental-strip-types private/r4-copy-2026-11-11/run.mjs
git diff --check
```

합성 fixture runner·로그·스크린샷은 Git/Docker 제외 `private/r4-copy-2026-11-11/`에 있다. 임시 컨테이너·서버·브라우저·credential 파일은 정리했다. 실제 발행·운영 DB·배포는 수행하지 않았다.

R4 전체 완료, **R completed 11 / pending 3**. 다음은 **R5 Step 0 `manual-review-contract`**다. F 22개 pending과 기존 운영 보류는 유지한다.
