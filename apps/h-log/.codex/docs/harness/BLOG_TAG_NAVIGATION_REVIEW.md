# 블로그 태그 배지 탐색 검수

2026-11-11(KST), [R4 Step 1](../../../phases/blog-tag-and-link-polish/step1.md)을 완료했다. 기준 commit은 `2ddceb66ae9a565ba125983e2b2f4bac87ecb21d`다. [Step 0의 별칭 사전과 URL 계약](BLOG_TAG_ALIAS_REVIEW.md)을 재사용했다.

## 달라진 동작

| 위치 | 태그를 선택했을 때 |
| --- | --- |
| 일반 목록 | 해당 태그의 첫 페이지로 이동 |
| 검색 결과 | **제출된 검색어**를 유지하고 선택한 태그의 첫 페이지로 이동. 입력란에만 적어 둔 미제출 문구는 사용하지 않음 |
| 글 상세 | 검색어 없는 해당 태그의 일반 목록으로 이동 |

`components/blog/BlogTagLink.tsx`는 기존 `Badge`를 Next `Link`로 감싸 실제 `<a href>`를 제공한다. `buildBlogBrowseHref({ query, tag, page: 1 })`이 별칭·특수문자 인코딩을 처리한다. 행의 제목 링크와 태그 링크는 서로 독립적이며 anchor를 중첩하지 않는다. 상세의 DB/OCI cyan 색과 다른 태그의 slate 색, 기존 행 구조·배지 모양을 유지했다. 키보드 focus outline과 hover border, 긴 태그 줄바꿈을 제공한다.

`BlogPostRow`는 검색 결과에서 받은 `snapshot.query`만 링크에 전달한다. 일반 목록과 상세의 query 기본값은 빈 문자열이다. 별도 이벤트 핸들러·클라이언트 상태·태그 route·API·redirect·DB 변경을 추가하지 않았다. 검색/태그의 noindex·follow, 현재 공개 결과 선택·태그 집계는 이전 계약을 따른다. 공개 Brain UI·Home 레이더와 공유 `Badge` 자체는 변경하지 않았다.

## RED → GREEN

앱 동작을 바꾸기 전에 기존 production 빌드에서 [브라우저 회귀 검사](../../../scripts/blog-tag-badges.browser-check.mjs)를 실행했다. 1440/390/320px의 일반 목록·상세(JS ON/OFF)와 검색(JS ON) **15표본 모두 ‘태그의 native anchor가 0개’라는 예상 이유로 실패**했다. 소스 문자열의 존재 여부로 대체하지 않았다.

공통 링크를 구현한 뒤 개발 서버의 같은 15표본이 통과했다. 최종 production/dev 실행은 각 15표본, **총 30표본**을 통과했다. 각 표본에서 대표 태그, `C++ # &?`, 한글 태그, 긴 태그 4개의 실제 href를 확인하고 키보드 Enter·뒤로가기·Ctrl+클릭 새 탭·가로 넘침·pageerror를 검사했다. 검색 표본은 입력란에 미제출 문구를 적은 뒤에도 제출된 검색어를 유지하는지 확인했다.

| 검사 | 결과 |
| --- | --- |
| 가까운 단위/UI 계약 | `blog-search-ui`, `blog-discovery-ui`, `blog-detail-ui` **16/16**. URL 인코딩·q 보존·1페이지 이동은 기존 builder의 실행 결과로 확인 |
| 전체 단위 | `npm run test` **294 pass / 28 DB skip / 0 fail** |
| 격리 DB | `blog-public-read-path.integration.test.ts` **2/2**, skip 0 |
| 타입·build | `npm run typecheck`, `npm run build` 통과. 기존 `blog-thumbnails.ts` 동적 파일 tracing 경고 2건 유지 |
| lint | 기본 `npm run lint`는 기존 Git 제외 private helper의 오류 10개·경고 6개로 실패. private를 제외한 앱·회귀 script lint는 통과 |
| 공개 경계 | 공개 8개·비공개 1개·철회 1개의 합성 자료. 새 링크의 태그 결과에서 비공개 제목 제외, 공개 해제 후 검색 결과 8→7 확인 |
| 상태와 탐색 | 선택 태그·결과 개수·noindex·페이지 초기화, 한글/특수문자/긴 태그 인코딩, focus 표시, 중첩 anchor 없음 확인 |
| 기존 화면 | production/dev 각각 Home 레이더·Brain canvas의 1440/390/320px 표시와 가로 넘침 확인. 해당 소스 파일은 변경 없음 |
| 문서·범위 | Markdown 11개·phase JSON 61개·추가/변경 상대 링크 22개 검사. 전체 60 phase/209 step, R 10 완료/4 대기, F 22 대기와 다른 phase 상태 보존, `git diff --check` 통과 |
| 원문 | 조회와 탐색 전후 격리 DB의 본문 Markdown·HTML·hash 일치 |

JavaScript를 끈 검증은 서버가 렌더링하는 일반 목록과 상세의 태그 링크에 적용했다. 기존 검색 결과는 클라이언트 요청으로 로드하므로 JS OFF 검색 결과를 새로 구현하거나 검증 완료로 표시하지 않는다. 같은 브라우저의 기존 읽기/history 동작을 유지하며 이미 열린 과거 응답을 회수하는 기능은 아니다.

## 재현과 범위

`verifyBlogTagBadges(browser, origin, fixture, output)`는 caller가 준비한 격리 loopback 앱·브라우저를 사용한다. fixture는 `tags`, `slugs`, 제출할 `query`, 공개 결과 수 `publicCount`를 받는다. 태그 4개를 가진 공개 글 8편과 비공개/철회 각 1편으로 실행했다. 테스트가 모든 태그를 임의로 생성·발행하는 것은 아니며 원격 사이트에는 실행하지 않는다.

```powershell
node --no-warnings --experimental-strip-types --test lib/blog-search-ui.test.ts lib/blog-discovery-ui.test.ts lib/blog-detail-ui.test.ts
npm run test
npm run lint
node node_modules/eslint/bin/eslint.js . --ignore-pattern "private/**"
npm run typecheck
npm run build
# 임시 loopback DB와 로컬 브라우저를 준비한 caller
node --no-warnings --experimental-strip-types private/r4-badges-2026-11-11/run.mjs
git diff --check
```

로그·합성 fixture runner·스크린샷은 Git/Docker 제외 `private/r4-badges-2026-11-11/`에 있다. 사용한 임시 컨테이너·서버·브라우저·credential 파일은 정리했다. 실제 운영 DB·provider·콘텐츠 발행·배포는 실행하지 않았다.

R4 Step 1 완료, **R completed 10 / pending 4**. 다음은 **R4 Step 2 `article-and-section-link-copy`**다. F 22개 pending과 기존 운영 보류는 유지한다.
