# 블로그 태그 대표 표기와 별칭 검수

2026-11-11(KST), [R4 Step 0](../../../phases/blog-tag-and-link-polish/step0.md)을 완료했다. 기준 commit은 `5144c71e5ee5c77c884eaa1da271d2e1c66affe5`다. 이번 변경은 블로그 태그의 표시·필터·집계와 새 초안 저장에 같은 규칙을 적용하는 작업이다.

## 선정한 사전

기존 검수 원고의 태그를 조사했다. `private/blog-editorial-pilot-2026-10-15/manifest.json`에는 Next.js, PostgreSQL, Redis, 개발 기록, 메시징, 설계가 있고, `private/series-manuscripts-2026-10-21/manifest.json`에는 PostgreSQL, 개발 기록, 검증 기록, 공개 조회, 콘텐츠 모델이 있다. 운영 DB의 전체 분포나 실제 중복 발생 건수를 조사한 것은 아니다. 해당 원고에서 쓰는 기술 이름 중 두 묶음만 명시 사전으로 정했다.

| 대표 표기 | 허용 별칭 | 경계 |
| --- | --- | --- |
| `Next.js` | `next.js`, `nextjs` 및 이 값들의 대소문자 변형 | `next-js`, `Next JS`는 추측해서 합치지 않음 |
| `PostgreSQL` | `postgresql`, `postgres` 및 이 값들의 대소문자 변형 | SQL, MySQL, pgvector는 다른 값 |

[blog-tags.ts](../../../lib/blog-tags.ts)의 작은 Map을 공유한다. 양끝 공백을 제거하고 사전 밖 값은 대소문자·내부 공백·구두점을 보존한다. `C`, `C++`, `C#`, `Spring`, `Spring Boot`, `custom`, `Custom`을 합치지 않는다. 태그 배열은 빈 값을 제외하고 대표 표기별 첫 항목 순서로 중복 제거한다.

## 적용 경로와 저장 경계

- 공개 목록/상세의 태그와 태그별 개수, 검색 결과의 태그, 관련 글의 태그 겹침에 같은 투영을 적용했다. 한 글에 `nextjs`와 `Next.js`가 모두 있어도 `Next.js` 개수는 한 번만 늘어난다.
- `parseBlogBrowseParams`와 `buildBlogBrowseHref`가 대표 태그를 사용한다. 기존 `?q=…&tag=nextjs&page=2`도 같은 결과를 읽으며 새 탐색 링크에는 `tag=Next.js`가 들어간다. q와 페이지 복원, 필터 후 페이지 계산, 검색/태그의 noindex·follow 정책은 유지한다. URL redirect나 새 색인 페이지는 없다.
- 검색의 태그 비교와 태그 일치 설명에 별칭을 적용한다. 자유 입력 q 자체, 본문·제목, embedding cache key를 전역 치환하지 않는다. 태그가 없는 글의 본문 단어까지 모든 동의어가 같아지는 검색 사전은 아니다.
- `validateArticleWriterOutput`은 원래 출력의 개인정보 검사 후 태그를 정규화한다. 관리자 초안 요청과 기존 자동 작성 경로는 이 결과를 통해 새 `post_tags`를 저장한다. 중복 별칭을 저장 전에 제거해 같은 대표 태그가 두 행으로 만들어지지 않는다.
- 현재 관리자 본문 편집 계약에는 태그 입력 필드가 없다. `blog-admin-review`는 읽기 전용이고 `blog-editorial-actions`의 save는 새 본문 버전만 만든다. 이번에는 태그 편집 API/UI를 추가하거나 기존 편집 저장에서 과거 태그를 일괄 수정하지 않았다. 새 관리자 초안 저장은 실제 DB 통합 테스트로 확인했다.
- 기존 repository·schema·migration·post_versions의 원문/HTML/hash와 저장된 태그는 유지한다. 공개 읽기에서만 과거 별칭을 투영하며 원래 개인정보·published-current 검사를 우회하지 않는다. Brain 태그와 승인된 그래프 UI, Home 레이더는 대상이 아니다.

## 검증

Node 24.22.1, Next 16.4.3 설치본을 사용했다. Next의 로컬 search params 문서를 확인했으며 기존 URL parser와 서버/클라이언트 경로를 유지했다.

| 검사 | 결과 |
| --- | --- |
| RED | 공개 목록/집계, 검색 태그/관련 글, 검색 페이지 계산, URL/일치 설명, 새 초안 정규화의 **5개 테스트가 예상대로 실패**. 기존 71개 통과 |
| focused GREEN | `blog-public`, `blog-search`, `blog-search-ui`, `blog-article-generation` **76/76** |
| 전체 단위 | `npm run test` **293 pass / 28 DB skip / 0 fail** |
| DB integration | 공개 읽기·관리자 초안 요청·본문 편집의 **4/4**, skip 0. 별칭을 포함한 새 관리자 초안이 대표 태그 3개만 저장하고 비공개 상태를 유지함 |
| 타입·build | `npm run typecheck`, `npm run build` 통과. 새 테스트의 nullable 결과 타입 확인을 보완한 뒤 통과. 기존 `blog-thumbnails.ts`의 동적 파일 tracing 경고 2건은 남음 |
| lint | 기본 `npm run lint`는 기존 Git 제외 private helper의 오류 10개·경고 6개로 실패. `node node_modules/eslint/bin/eslint.js . --ignore-pattern "private/**"` 통과 |
| production/dev HTTP | `nextjs`, `Next.js`, `NEXT.JS`의 8개 공개 결과·2페이지, 현재 대표 표기·noindex·unknown 결과 확인. 공개 8개/비공개 1개/철회 1개의 합성 fixture 사용 |
| 검색 cache/철회 | 기존 cache hit 뒤 2편 철회 시 결과 8→6, 페이지 2→1로 재계산. 비공개/철회 제목은 노출되지 않음 |
| 브라우저 | 개발 서버 **1440/390/320px × JS ON/OFF = 6조합**. 선택 태그·8개 집계·목록 페이지, 키보드 Enter·뒤로가기·초기화·알 수 없는 태그·가로 넘침 확인. JS 환경은 검색 결과와 태그 일치 설명도 확인 |
| 문서·범위 | Markdown 11개·phase JSON 61개·추가/변경 상대 링크 22개·전체 60 phase/209 step 검사. R 9 완료/5 대기, F 22 대기와 다른 phase 상태 보존, `git diff --check` 통과 |
| 원본 보존 | 격리 fixture의 조회/탐색 전후 DB 원문·HTML·hash와 `post_tags` 행 일치. 과거 원고 파일은 변경하지 않음 |

처음 병렬 DB 실행에서 한 suite의 연결 종료 오류가 있었으며 `--test-concurrency=1`로 같은 4개 테스트를 순차 재실행해 통과했다. 원인을 확정한 제품 결함으로 기록하지 않는다. 첫 HTML 검사에서는 React의 텍스트 구분 주석 때문에 검수 문자열이 일치하지 않아 주석을 제외한 표시 텍스트로 확인했다. 최종 HTTP/브라우저 실행은 통과했다.

```powershell
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts lib/blog-search.test.ts lib/blog-search-ui.test.ts lib/blog-article-generation.test.ts
npm run test
npm run lint
node node_modules/eslint/bin/eslint.js . --ignore-pattern "private/**"
npm run typecheck
npm run build
# 임시 loopback DB에서만 실행
node --no-warnings --experimental-strip-types --test --test-concurrency=1 lib/blog-public-read-path.integration.test.ts lib/blog-draft-requests.integration.test.ts lib/blog-editorial-actions.integration.test.ts
node --no-warnings --experimental-strip-types private/r4-tags-2026-11-11/run.mjs
git diff --check
```

비공개 로그·runner·스크린샷은 Git/Docker 제외 `private/r4-tags-2026-11-11/`에 있다. 임시 컨테이너·서버·브라우저·credential 파일은 정리했다. 운영 DB·실제 provider·실제 발행은 사용하지 않았다. 검색의 전체 store 조회 비용·전역 텍스트 검색 개선은 이번 변경의 성과로 주장하지 않는다.

R4 Step 0 완료, **R completed 9 / pending 5**. 다음은 **R4 Step 1 `navigable-tag-badges`**이며 글의 기존 태그 배지를 탐색 링크로 연결한다. 이번에는 배지의 링크 동작을 추가하지 않았다. F 22개 pending과 운영 보류는 유지한다.
