# H-Log 공개 페이지 SEO 감사 기준선

2026-11-03 · SEO S1 Step 1 `public-audit-baseline` 완료. [$hlog-seo](../../../../../.agents/skills/hlog-seo/SKILL.md)의 local 모드로 **개인 포트폴리오·기술 블로그**를 점검했다. 이번 변경은 감사 결과와 후속 계획이며 앱 동작 수정이나 운영 배포는 포함하지 않는다.

가장 먼저 고칠 부분은 **블로그 페이지별 canonical과 오류 응답 계약**이다. 이어서 no-JS 블로그 목록, 페이지별 공유 정보, Brain의 기본 발견 경로를 개선한다. 전체 SEO 점수나 검색 순위 변화는 산출하지 않았다.

## 실행 환경과 범위

| 항목 | 실제 실행 조건 |
| --- | --- |
| 앱 기준 | `9abf2756cbcba8d5a0b250b0bc72b22884670b30`의 Docker production build |
| 앱 이미지 | `hlog-web:seo-baseline` · `sha256:3de36cf5b5bb8d465a0b07ab14256ff0e754248d0f74528a049f3f969bc5fb38` |
| 프레임워크·도구 | Next.js 16.4.3, 실행 호스트 Node 24.22.1, Playwright 1.62.1, Edge 156.0.4314.58 |
| 전송 origin | `http://127.0.0.1:3048`, 저장소의 공개 Nginx 설정 사용. 실제 공개 도메인이 아님 |
| canonical origin | `https://hlog.example.org`, 합성 HTTPS 주소. 이 주소로 네트워크 요청하지 않음 |
| 저장소 | 새 pgvector/pgvector:pg16 합성 DB, loopback 전용 포트, 작업 전용 Docker 네트워크. 기존 DB 접속 없음 |
| 데이터 | 공개 글 8개, 비공개·철회 글 각 1개, 공개 글의 미선택 수정본 1개. Brain 공개 사본 1개와 비공개·철회 각 1개, 공개 후 미공개 수정본. 기존 공개 카탈로그 28개는 앱 코드에서 읽음 |
| 요청 경계 | 인증 없는 새 브라우저 context, 허용한 공개 origin/경로·정적 자산만 허용. 관리자·API·metrics/probe·과거 실험실·외부 origin·PDF 바이트 제외 |
| 표본과 반복 | 기본 HTTP 32 URL × 2회, HTML 제한 봇 UA 3 URL × 2회 = 70응답. 대표 8 URL 후 query/Brain 표본 4개로 확대, 12 URL × JS ON/OFF × 1440/390/320px × 2회 = 144화면 |
| 사이트맵 추가 확인 | 같은 이미지의 새 합성 DB에서 52개 URL × 2회, 각 200·self canonical·noindex 없음 확인. XML의 origin·중복·private/철회 제외 확인 |
| 장애 확인 | 별도 합성 DB에서 `posts` 테이블 이름을 잠시 바꿔 DB 읽기 오류를 주입하고 복구. 4경로를 2회 확인. 연결 단절/전체 DB 장애 검수와 구분 |
| 실행 종료 | 본 감사 12:30 KST, 사이트맵 확인 12:32 KST. 두 실행에서 생성한 컨테이너 6개·네트워크 2개·임시 credential 파일 정리 완료 |

동시 문서 탐색은 1개, 요청 사이 500ms, 일반 HTTP timeout 20초로 제한했다. 사이트맵 탐색은 XML에서 확인한 canonical origin과 공개 경로만 허용했다. 합성 노트 ID가 재실행마다 달라지는 점을 제외하면 서로 다른 문서 URL은 100개 이내다. 이미지는 기존 고정 Dockerfile, DB/Nginx는 앞선 로컬 리허설의 고정 digest를 사용했다.

## 표본별 관측

아래 `{note}`는 합성 공개 노트 ID다. JS/no-JS 결과는 화면에 보이는 본문과 `<a href>` 기준이며, RSC 문자열이나 숨겨진 streaming 영역의 존재로 대체하지 않았다.

| 표본 | 정상 HTTP·metadata | JS ON / OFF 관측 |
| --- | --- | --- |
| `/` | 200, self canonical, Person/WebSite JSON-LD | 소개·Portfolio/Resume 링크 정상. 최근 글 상세 링크는 ON 3개, OFF 0개; Blog 목록 링크는 유지 |
| `/resume` | 200, self canonical, 페이지 제목·설명 구분 | 이력 본문 양쪽에서 보임. PDF OFF 조건으로 다운로드 링크 없음; PDF 자체 미수집 |
| `/portfolio`, `/portfolio/h-log-public-reading` | 200, self canonical | 목록·상세 본문 양쪽에서 보임 |
| `/blog` | 200, canonical `/blog` | ON 공개 글 링크 6개, OFF 로딩 안내만 보임 |
| `/blog?page=2` | 200, canonical이 `/blog` | ON 다른 공개 글 링크 2개, OFF 로딩 안내만 보임 |
| `/blog?tag=PostgreSQL`, `/blog?q=PostgreSQL` | 200, canonical `/blog`, robots meta와 X-Robots-Tag 없음 | 태그 ON 6개, OFF 로딩. 검색 ON은 검사 경계가 `/api/search`를 차단하므로 성공 결과 미검증; OFF는 로딩 |
| `/blog/seo-public-01` | 200, self canonical·상세 OG, BlogPosting | 제목·본문·관련 글 링크가 양쪽에서 보임 |
| `/brain` | 200, canonical `/brain` | ON 그래프 표시, 독립 상세 anchor 0개. OFF “기록을 불러오는 중…” |
| `/brain?note={note}` | 200, canonical `/brain` | ON 상세 열기 anchor 1개, OFF 로딩. 그래프 상태 URL과 독립 상세 URL을 구분 |
| `/brain/{note}` | 200, self canonical | 공개 사본 제목·본문이 양쪽에서 보임 |
| page=1/99/abc, utm_source, 없는 태그 | 모두 200, canonical `/blog`, robots 없음 | 정상화·빈 결과·색인 정책은 S2 Step 0에서 각각 정의; 모두 동일한 오류로 취급하지 않음 |
| `/projects`, `/projects/h-log-public-reading` | 308 → `/portfolio` 및 동일 상세 경로 | 목적지가 허용 범위임을 확인; 인증/외부 redirect 없음 |
| 합성 Blog/Brain의 비공개·철회·없는 상세 | 6개 모두 404 + noindex | 비공개 표식·원문 노출 없음 |
| `/blog-markdown/seo-public-01`, 비공개 Markdown | 200 / 404 | 공개 현재 버전 본문만 포함 |
| robots/sitemap/feed/llms/llms-full | 모두 200, 합성 HTTPS origin 사용 | 사이트맵 52 URL, RSS 공개 글 8개. 원자료에서 비공개·철회·미선택 버전 표식 0건 |

JSON-LD는 실제 HTML 및 DOM의 모든 `application/ld+json`을 JSON으로 파싱했다. Person/WebSite와 글 상세 BlogPosting의 이름·제목·공개일 `2026-11-01`·절대 URL이 합성 fixture 및 보이는 내용과 일치했다. 수정일이 없는 합성 글에 임의 dateModified를 요구하지 않았다. Rich Results Test와 실제 검색 노출은 미검증이다.

일반 UA와 `Twitterbot/1.0`의 Blog 목록·상세/Brain 상세 표본에서 title/canonical이 head에 존재했다. Next.js의 streaming metadata를 문서로 확인했으며, 이번 표본에서 “모든 봇의 head가 비어 있다”는 문제는 재현되지 않았다.

## 발견과 후속 작업

우선순위는 검색 순위 예상치가 아니라 공개 경계·발견·읽기에 미치는 영향이다. P0 공개 유출이나 전체 사이트 실패는 관측하지 않았다. 아래는 수정 전 기준선이다.

| ID·우선순위 | 확인한 사실·최소 증거 | 원인·확신 수준 | 담당 step·재검증 |
| --- | --- | --- | --- |
| SEO-01 · P1 | `/blog?page=2`가 다른 글 2개를 보여도 canonical은 `/blog`. HTTP/모든 viewport 2회 동일 | **확인, 높음**. Blog index의 정적 metadata가 query를 구분하지 않음 | [S2 Step 0](../../../phases/seo-public-surface-optimization/step0.md): 유효한 페이지의 self canonical, 첫 페이지/잘못된 값/범위 밖 구분을 HTTP로 검증 |
| SEO-02 · P2 | 검색·태그·빈 태그 결과 모두 `/blog` canonical이고 noindex 없음 | **응답 확인, 높음 / 색인 정책 결정 필요**. 필터별 index 계약 미구현 | S2 Step 0: 일반 페이지와 검색/필터 조합을 나누고 초기 noindex·정규화 정책을 focused test로 고정 |
| SEO-03 · P1 | 기본/2페이지/태그 Blog 목록의 no-JS 공개 anchor 0개. Raw HTML에는 기본 글 anchor 6개가 있으나 숨겨진 streaming 영역에 있음 | **확인, 높음**. `app/blog/(index)/loading.tsx` 경계와 streaming 복원 의존이 원인 후보. 2026-10-22 기록 재현 | [S2 Step 1](../../../phases/seo-public-surface-optimization/step1.md): 서버 응답에서 보이는 제목·글/페이지 링크를 확인. 검색 API가 차단된 감사 결과를 검색 기능 고장으로 기록하지 않음 |
| SEO-04 · P1 | Brain 홈 no-JS는 로딩만 표시. JS 기본 그래프에도 독립 상세 anchor 0개; 선택한 상태에서만 1개. 상세 route 자체와 사이트맵은 정상 | **확인, 높음**. Explorer의 client 상태/Suspense 및 버튼 중심 발견 경로 | 새 [S2 Step 5](../../../phases/seo-public-surface-optimization/step5.md): 승인된 그래프 UI를 보존하며 공개 기록의 기본 읽기·anchor 제공. Blog step과 분리 |
| SEO-05 · P2 | Resume·Portfolio 목록·Blog 목록·Brain 홈/상세의 OG URL/title과 Twitter title이 홈 값을 상속. 일반 title/description/canonical은 개별 값 | **확인, 높음**. root 공유 metadata 상속. Blog/Portfolio 상세의 자체 OG는 정상 | [S2 Step 2](../../../phases/seo-public-surface-optimization/step2.md): raw/head/최종 DOM 및 HTML 제한 봇 UA 비교, 페이지 사실과 공유 정보 일치 |
| SEO-06 · P1 | 합성 DB 읽기 실패에도 `/blog`는 200, noindex 없음. 글 상세/sitemap/feed는 500. 장애 표본 2회 동일 | **확인, 높음**. 목록이 오류 결정 전에 streaming 응답을 시작하는 것이 원인 후보 | S2 Step 0: 데이터 조회 실패를 정상 목록/빈 결과와 구분하는 status/index 계약. S2 Step 1의 streaming 변경 후 같은 장애를 다시 확인 |
| SEO-07 · P2 | Home 본문은 no-JS에서 읽히지만 최근 글 상세 anchor는 3→0. Blog 목록으로 가는 기본 링크는 유지 | **확인, 높음**. `HomeRecentPosts`의 null Suspense fallback. 전체 Home 비노출로 확대 해석하지 않음 | [S2 Step 4](../../../phases/seo-public-surface-optimization/step4.md): Blog 발견 문제 해결 후 최근 글 연결의 보완 필요성을 판단. 레이더/소개 영역 변경 금지 |

페이지별 canonical 판단은 [Google의 페이지 나누기 지침](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)을 2026-11-03 확인했다. 목록의 각 페이지는 고유 URL과 canonical을 사용하고 실제 anchor로 이어지는지 확인한다. no-JS 관측은 [JavaScript SEO 안내](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)에 따라 초기 HTML·렌더링을 구분한 것이며, Google이 JS를 전혀 실행하지 않는다는 뜻은 아니다.

## 검증 결과와 제한

- 문서 Markdown 14개 파싱, 상대 링크 103개·step 읽기 경로 168개, 전체 phase JSON과 48 phase / 173 step 상태를 확인했다. 감사 원자료의 비공개 표식이 커밋 문서에 없고 `git diff --check`를 통과했다.
- Docker production build 성공. 기존 `lib/blog-thumbnails.ts`의 동적 파일 추적 경고 2개는 SEO 결함이나 성능 측정값으로 계산하지 않았다.
- 기존 site-seo/crawler/origin 테스트 **7/7 통과**. 소스 문자열 테스트 통과가 no-JS 읽기 성공을 보장하지 않는 점을 실제 화면에서 확인했다.
- 동일 URL·viewport·JS 조건의 1·2회 status, metadata, 보이는 본문/anchor 결과 차이 0건. 144화면에서 pageerror와 문서 수평 overflow 0건. 대표 스크린샷 18개 저장, desktop no-JS/390px Blog/320px Brain과 no-JS 화면 직접 검토.
- 사이트맵 52개 전수 확인은 총 104응답 모두 200·canonical 일치·noindex 없음. 정상 sitemap/RSS XML 파싱, RSS 8개, 공개 본문 및 비공개 표식 제외 검증.
- 브라우저 guard의 범위 밖 URL 8사례 거부 확인. 실제로 표본 밖 공개 링크의 RSC prefetch와 `/api/search`가 차단됐다. 검색 성공 결과, 전체 사이트의 모든 사용자 상호작용, 외부 링크/PDF는 **미측정**이다. HTTP redirect 목적지도 허용 origin/경로를 확인했으며 외부 대상으로 따라가지 않았다.
- 처음 두 준비 시도는 Docker Desktop internal network의 loopback DB 연결 실패로 중단됐다. 각 시도 자원은 정리했으며 전용 bridge/loopback bind로 완료했다. 사이트 결함 수에 포함하지 않았다.
- LCP/CLS/TBT/INP, Lighthouse, 이미지 전송/폰트 성능은 **미측정**, S2 Step 3에서 동일 조건 3회 측정한다. 이번 viewport 검수를 성능 통과로 표현하지 않는다.
- GSC/CrUX, 실제 도메인 색인·검색 노출/순위·AI 인용 효과는 **미측정**. 합성 글의 문장·경험은 실제 블로그 글의 품질 평가 근거가 아니다. S2 Step 4에서 검토된 실제 공개 원고로 평가한다.

## 재현과 증거 보관

앱 작업 디렉터리에서 다음 명령을 사용했다. 감사 helper와 원자료는 Git 제외 `private/seo-audit/`에 보관하며 커밋하지 않는다. `run.mjs`는 매번 별도 DB를 만들고 정리하므로 실제 DATABASE_URL이나 관리자 credential을 받지 않는다. 실행에는 Docker Desktop, 위 Node/Playwright/Edge가 필요하다.

```powershell
docker build --target runner -t hlog-web:seo-baseline .
node --no-warnings --test --experimental-strip-types lib/site-seo.test.ts lib/blog-crawler-output.test.ts lib/public-site-origin.test.ts
$env:HLOG_SEO_LOCAL_AUDIT='1'
$env:HLOG_SEO_SWEEP_ONLY='0'
# 번들 Node 24.22.1을 사용했다. 아래 node는 해당 실행 파일을 뜻한다.
node --no-warnings --experimental-strip-types private/seo-audit/run.mjs
$env:HLOG_SEO_SWEEP_ONLY='1'
node --no-warnings --experimental-strip-types private/seo-audit/run.mjs
```

로컬 helper가 없는 checkout에서는 위 환경/fixture 표를 기준으로 기존 migration·Blog/Brain repository로 새 합성 DB를 구성하고 공개 Nginx를 loopback에 연결한다. 표본 경로를 고정하고 raw HTTP, JS/no-JS, 동일 조건 재실행, sitemap의 전수 status/canonical을 비교한다. 기존 서비스나 운영 DB를 재현 대상으로 사용하지 않는다.

원자료: `result.json`·`audit.json`(HTTP/DOM/차단 기록), `raw-*.txt`, `screen-*.png`, `summary.json`, `sweep/result.json`(사이트맵·반복 장애 확인). private 노트 ID/표식·응답 전체·credential은 이 보고서에 복사하지 않았다. 앱 UI·콘텐츠·패키지·배포 설정은 변경하지 않았다.

**다음 작업: S2 Step 0 `crawl-and-index-policy`.** S1 전체 완료, Brain 기본 발견을 독립 Step 5로 추가해 SEO는 3개 phase / 11개 step, completed 2·pending 8·blocked 1이다. OCI 모니터링 Step 7 → 관리자 A3 Step 4 → timer의 운영 보류와 순서는 유지한다.

## 후속 해결 기록 — 2026-11-04

위 표는 `9abf275` 감사 당시 결과다. [S2 Step 0](../../../phases/seo-public-surface-optimization/step0.md)에서 **SEO-01/02/06**을 수정하고 production/dev HTTP 6/6으로 확인했다. SEO-03의 일반/2페이지/태그 no-JS 목록도 같은 로딩 경계 제거로 복구되어 두 환경의 36화면에서 공개 anchor를 확인했다. S2 Step 1에서 남은 발견 인수 조건을 검토한다. SEO-04 Brain, SEO-05 공유 metadata, SEO-07 Home 최근 글과 실제 성능/검색 성과는 이번 변경의 해결 범위가 아니다.

## 2026-11-04 S2 Step 1 발견 경로 검수

[Step 1](../../../phases/seo-public-surface-optimization/step1.md)은 `32abacd`와 Step 0 production 이미지를 재사용해 SEO-03의 일반 목록→상세→페이지 이동을 JS ON/OFF·1440/390/320에서 확인했다. 빈 태그/목록과 JS 검색 오류 재제출·DB 오류 재시도도 정상이다. HTTP 6/6, 가까운 회귀 61/61이며 앱 코드 추가 변경은 없다. SEO-03의 정상 발견 문제는 해결 확인으로 닫는다.

새로 구분한 제한: DB 실패는 두 모드 모두 500이지만 no-JS 3표본의 본문은 비어 있다. JS 오류 안내/버튼과 구분하며 [S3 Step 0](../../../phases/seo-release-and-measurement/step0.md)에서 5xx를 유지하는 안내 방안의 필요성을 재검토한다. 총 42표본을 오류 안내까지 전부 정상인 것으로 해석하지 않는다. Brain 홈/상세 4표본은 기존 SEO-04를 재확인했으며 Step 5에 유지한다. 다음 작업은 S2 Step 2다.

## 2026-11-05 S2 Step 2 공유 metadata 수정

[Step 2](../../../phases/seo-public-surface-optimization/step2.md)에서 SEO-05를 수정했다. Resume·Portfolio 목록·Blog 목록·Brain 홈/상세의 홈 OG 상속과 Blog/Portfolio 상세의 홈 Twitter 상속을 실제 HTTP RED로 재현했다. 페이지별 공유 정보로 바꾼 후 production/dev HTTP 각 21/21, JS ON/OFF 각 60화면을 확인했다. Person/WebSite/BlogPosting·특수문자·명시적 날짜·public origin과 대표 이미지도 실제 응답에서 검사했다. JSON-LD와 본문은 변경하지 않았다.

기본 lint의 기존 private helper 오류 10건, dev Home 파일 기반 OG 이미지의 localhost 차이, no-JS Brain/DB 장애·Home 최근 글·실제 성능/검색 성과는 각각 기록된 제한 또는 후속 범위로 유지한다. 다음은 S2 Step 3이다.
