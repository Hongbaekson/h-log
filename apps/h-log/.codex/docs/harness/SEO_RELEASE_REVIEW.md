# H-Log 로컬 SEO 릴리스 검수

2026-11-05 · S3 Step 0 `local-seo-release-rehearsal` 완료. 공개 읽기와 비공개 경계는 아래 로컬 조건에서 통과했다. 앱 동작을 추가 변경할 회귀 결함은 확인하지 않았다. 운영 배포·실제 콘텐츠 발행 준비 전체를 완료했다는 뜻은 아니다.

## 실행 조건과 증거

| 항목 | 확인한 조건 |
| --- | --- |
| 소스 | `376e7a9651f678e1813e7f639f200bc6cbe86d3e` |
| 이미지 | `hlog-web:seo-release` · `sha256:71bd6d433e5dc93cb1c3d2197e20d97e1532638cbd8c4f6173853986176fe3fe`; Docker runner target의 새 production build |
| 도구 | Node 24.22.1, Next.js 16.4.3, Edge 156.0.4314.58, Playwright 1.62.1, Lighthouse 13.6.0 |
| 접근 | 공개 `http://127.0.0.1:3048`, 관리자 `https://127.0.0.1:3049`; 로컬 일회용 인증서·키, 기존 public/admin Nginx 계약 |
| canonical | `https://hlog.example.org`; 합성 주소이며 이 origin으로 요청하지 않음 |
| 데이터 | 실행별 새 `hlog_seo_*` DB. 공개 글 8개, 비공개/철회 글, 미선택 수정본; 공개 카탈로그 28개+DB Brain 1개와 비공개/철회 노트; 합성 PDF·합성 1px 이미지 |
| 원자료 | Git/Docker 제외 `private/seo-release/`. `run/`은 S1 재검수, `focus/`는 모바일 측정, `verification/`은 최종 경계·상호작용 검수. 같은 이미지의 완료 표본을 연결하며 중간 실패 receipt도 보존함 |
| 정리 | 중간 검수기 수정 재시도를 포함한 5회 실행의 컨테이너 15개·네트워크 5개·tmpfs DB·임시 키/env/인증서/합성 이미지 정리. 기존 작업 환경과 운영 DB는 사용하지 않음 |

검수기 수정 과정에서 40자를 넘는 합성 검색 토큰에 대한 200 기대, Next의 RSC 정규화 307, 검색 결과/노드와 모바일/숨겨진 데스크톱 필터의 중복 선택자를 확인했다. 검색 입력을 기존 제한에 맞추고 RSC는 같은 loopback origin·같은 path·허용 query의 redirect만 최대 3회 처리하며 화면에 보이는 목적 요소를 지정했다. 앱 결함이나 통과한 검수로 기록하지 않는다. S1 70응답·144화면·사이트맵과 모바일 측정은 각각 완료된 원자료를 보존했고, 마지막 실행에서 남은 검수를 통과했다.

## S1 대비 판정

| 항목 | 현재 판정과 증거 |
| --- | --- |
| SEO-01 일반 페이지 canonical | 해결 확인. `/blog?page=2` self canonical, page 1/잘못된 값/상한 초과의 정규화 유지 |
| SEO-02 검색·태그 색인 | 해결 확인. 검색/태그는 noindex, 일반 페이지와 구분. 전용 검색 허용 context에서 실제 검색 결과 6개 확인 |
| SEO-03 Blog 기본 발견 | 해결 확인. JS ON/OFF·1440/390/320px에서 일반/태그 6개·2페이지 2개 제목 링크, 상세 본문과 키보드 Enter 이동 |
| SEO-04 Brain 기본 발견 | 해결 확인. no-JS 기본 목록·JS 목록 6표본에서 공개 기록 29개의 독립 상세 anchor와 본문 확인. 그래프 UI는 그대로 유지 |
| SEO-05 공유 정보·schema | 해결 확인. HTTP 70응답과 실제 DOM에서 canonical/OG/Twitter/JSON-LD, HTML 제한 봇 UA의 head 확인. 실제 출력 회귀 21/21 |
| SEO-06 DB 오류 status | 해결 확인. Blog/상세/sitemap/feed 4경로 × 2회 모두 500, 과거/비공개 fallback 없음 |
| SEO-07 Home 최근 글 | 알려진 제한 유지. JS 최근 글 직접 링크 3개, no-JS 0개. 6개 viewport/JS 조합에서 Home → Blog → 상세 이동 확인. 레이더 변경 없음 |

S1 표본 144화면에서 page error·가로 넘침은 0건이다. 공개 요청 guard는 허용 목록 밖 prefetch 58건과 검색 API 6건을 차단했다. 이는 감사 범위 제한이며 검색 기능 고장이 아니다. 추가 검수에서는 정확한 `/api/search`를 허용해 검색·철회 후 재요청을 확인했고 외부/관리자 요청은 없었다.

## 공개 경계·실패·복구

- 공개 ingress의 관리자 404, 관리자 ingress의 비인증 401, owner 인증·HTML/API/RSC와 spoof 경계: HTTP 4/4.
- Brain의 원문·초안·미선택 수정본과 철회 기록: 기존 HTTP 1/1, 기본 발견 6표본과 추가 HTML/RSC 검사. PDF 등록·검수·교체·철회/noindex/no-store: HTTP 2/2. 실제 이력서 파일은 사용하지 않았다.
- 공유 private sentinel을 비공개 글/수정본·Brain 원문·미선택 본문·합성 미공개 PDF에 두고 HTML/RSC/검색/Markdown/feed/llms/sitemap에서 비노출을 확인했다. PDF 검사 원문은 직접 합성한 fixture이며 실제 PDF 처리 검증은 별도 HTTP 2/2다.
- 글·Brain 공개 철회 후 같은 URL·검색 캐시를 2회 재요청했다. 목록/RSC/crawler/검색에서 제외되고 상세·Markdown은 404다. DB 본문 버전 hash는 바뀌지 않았다.
- 빈 목록 6표본은 200이고 공개 글 링크는 0개다. DB 읽기 실패 6표본은 500이다. JS에서는 오류 안내/재시도 버튼, no-JS에서는 빈 본문을 확인했다. DB 복구 후 JS 재시도·no-JS 새로고침 6건 모두 정상 목록으로 돌아왔다.
- 합성 썸네일 요청을 404로 만든 3폭에서 제목·본문 이동을 유지했고 비공개 fallback은 없었다. 서버 파일이 없는 asset도 목록에서 제외됐다. 실제 썸네일/본문 이미지의 성능은 이 검수로 대체하지 않는다.

### no-JS 500 안내의 판단

정상 글 탐색과 500 status는 충족한다. DB 장애 때 no-JS 화면이 비는 문제는 여전히 남아 있다. 현재 `app/blog/error.tsx`는 Next의 client error boundary여서 서버 오류 안내를 제공하지 않는다. 페이지에서 오류를 잡아 일반 JSX를 반환하면 200으로 바뀔 수 있으므로 이번 검수에서 그렇게 수정하지 않았다.

출시 전 남은 개선 후보는 500을 유지하는 서버/ingress의 일반 오류 안내다. Next 응답 처리와 Nginx 오류 대체의 범위를 따로 정하고 HTML/RSC·no-store·재시도 동작을 함께 검증해야 한다. S3 Step 1의 운영 전 체크에 이 제한과 처리 판단을 포함한다. no-JS 오류 안내까지 완료했다고 표시하지 않는다.

## Brain 성능과 상호작용

동일 이미지에서 새 browser context로 `/brain` 모바일 390×844, DPR 1.75, Lighthouse simulated throttling을 3회 측정했다. browser cache는 context별로 새로 만들었고 서버·OS cache는 초기화하지 않았다. 공개 노드는 29개다. 동시 감사 탐색은 없었다.

- LCP 855–861ms, 중앙값 856ms; CLS 0; TBT 38–57ms.
- S2의 798–2,409ms 범위보다 이번 표본은 좁지만, 표본 3회와 날짜·내용/캐시 조건 차이로 개선 효과를 단정하지 않는다.
- LCP 대상은 이번에도 검색창 placeholder다. 그래프 준비 시간·실제 사용자 INP·운영 p75를 의미하지 않는다.

별도 Playwright trace에서 검색 → Enter → 공개 사본 읽기/닫기, 질문 필터/초기화, 주제별/브레인 배치 전환, drag 후 노드 투영 좌표 변경을 확인했다. trace와 화면은 `verification/interaction-{width}.zip/.png`에 보관한다.

| 폭 | 검색 입력→읽기 확인 | 질문 필터→URL 확인 | 드래그→확인 | 결과 |
| --- | --- | --- | --- | --- |
| 1440px | 48ms | 51ms | 464ms | 좌표 변경 확인 |
| 390px | 68ms | 37ms | 456ms | 좌표 변경 확인 |
| 320px | 40ms | 39ms | 454ms | 좌표 변경 확인 |

위 시간은 자동화의 입력·대기·검증을 포함한다. drag는 300ms 안정화 대기도 포함한다. 지연 시간 목표·INP 측정값으로 사용하지 않는다. 3폭 모두 오류/가로 넘침 없이 동작했다. 승인된 실제 이미지 성능, 운영 네트워크, CrUX/GSC 데이터는 미측정이다.

## 검증과 재실행

| 검사 | 결과 |
| --- | --- |
| 전체 unit (`npm run test`와 같은 Node 명령) | 303개 중 277 pass, DB 조건 26 skip, 0 fail |
| 관련 격리 DB integration | public read·Brain·PDF 4/4, skip 0 |
| 실제 HTTP suite | SEO 21/21, 관리자 4/4, Brain 1/1, PDF 2/2, skip 0 |
| build/typecheck/lint | 새 Docker production build·typecheck·`eslint . --ignore-pattern 'private/**'` 통과 |
| 전체 `npm run lint` | 기존 private observe helper의 CommonJS import 10 error, 기존 private helper 3 warning. 이 작업의 앱 소스 결함으로 바꾸거나 숨기지 않음 |
| 운영 의존성 audit | `npm audit --omit=dev --json`: 모든 등급 0건. 배포 시점 재확인 필요 |
| 실제 출력·브라우저 | S1 HTTP 70, browser 144, sitemap 104, Brain 발견 6, 읽기 6, 검색 3, 상호작용 3, DB 오류/복구 6, 빈 목록 6, 이미지 실패 3과 파일 누락, 철회 후 2회 |

최소 회귀는 저장소의 아래 명령을 사용한다. integration/HTTP는 일회용 loopback DB, 빈 `hlog_seo_*` fixture, 두 ingress와 각 script의 명시적 opt-in이 준비돼야 한다. flags 없이 skip된 결과를 통과로 세지 않는다. 실제 DB·도메인에 복사 실행하지 않는다.

```bash
npm run test
npm run typecheck
npx eslint . --ignore-pattern 'private/**'
docker build --target runner -t hlog-web:seo-release .
npm audit --omit=dev --json
node --no-warnings --experimental-strip-types --test lib/brain-postgres-repository.integration.test.ts lib/blog-public-read-path.integration.test.ts lib/resume-pdf-repository.integration.test.ts
npm run test:seo:http
npm run test:admin:http
npm run test:brain:http
npm run test:resume:http
git diff --check
```

실제 공개 HTML의 metadata/schema 회귀는 `scripts/blog-index-seo.http.test.mjs`, Brain anchor 회귀는 `scripts/brain-discovery.browser-check.mjs`를 재사용한다. 후자는 격리 browser·origin·공개 graph를 받는 함수이며 단독 실행으로 검증됐다고 세지 않는다. 이번 일회성 orchestration/출력 검사기는 `private/seo-release/`에 두었다. production/CI에 외부 크롤러·upstream hook·계정 키를 추가하지 않았다.

문서/상태 검증: 변경 15개 파일의 Markdown 14개, phase JSON 54개, 상대 링크 224개를 검사했다. 전체 53개 phase/187개 step, SEO 9/1/1·R 0/14/0과 관리자/모니터링 상태 보존, 앱 코드 변경 0건, `git diff --check`를 확인했다.

## 운영 전 남은 조건과 다음 작업

1. 배포 대상 origin/privacy·robots/canonical, Next.js 의존성 audit, 실제 원고·이미지·PDF 전 페이지의 공개 검토를 배포 시점에 확인한다.
2. Home no-JS 최근 글 직접 링크와 no-JS 500 안내의 제한을 운영 전 체크에 포함한다. S2 후보 원고는 여전히 미발행이다.
3. OCI 보류 해제·공개 도메인/HTTPS 소유권·GSC 계정 범위가 마련될 때만 S3 Step 1을 진행한다. 기존 운영 모니터링 Step 7 → 관리자 A3 Step 4 → timer 순서를 유지한다.
4. S3 Step 2의 실제 검색 성과는 운영 데이터가 모인 뒤 측정한다. 지금 통과한 로컬 결과로 검색 노출·순위·색인을 보장하지 않는다.

SEO는 completed 9 / pending 1 / blocked 1. 전체 53개 phase / 187개 step 수는 그대로다. 다음 로컬 작업은 [R1 Step 0 `provenance-contract`](../../../phases/brain-provenance-authoring/step0.md)이며 R1–R5 14개 step은 아직 pending이다. 관리자 16/0/1·모니터링 7/0/1과 운영 보류를 유지한다.
