# F2 Step 0 목록 모델 경량화 검수

2026-11-13 로컬 검수 기록이다. 범위는 [F2 Step 0](../../../phases/blog-read-efficiency/step0.md)의 목록 전용 모델과 요청 내 계산 공유다. 기준은 [F1](PERFORMANCE_BASELINE_REVIEW.md), 앱 변경 전 commit `57faf932959e3b635eee71c625ae9e93ec3c67ca`다.

## 변경과 공개 계약

`lib/blog-public.ts`의 목록은 `PublicBlogListItem`으로 제목·요약·글 유형·날짜·slug/href·태그·썸네일만 반환한다. 목록에서 전체 Markdown 블록·목차·출처 링크·검수 기록을 만드는 작업을 제거했다. 상세 모델은 기존 필드를 그대로 만든다. 같은 모델 계산에서 태그·출처·자산을 post ID로 묶어 글마다 전체 관계 배열을 다시 훑지 않는다.

`loadPublicBlogIndex(page, tag, pageSize)`는 React `cache`를 사용하고 primitive 인자를 받는다. 일반 목록의 metadata/page는 같은 인자로 호출해 공개 판정·태그 집계·페이지 정규화까지 한 결과를 사용한다. Home 최근 글도 같은 loader의 pageSize 3을 사용한다. 기존 store loader와 함께 render 범위에 한정하며 다른 요청으로 결과나 오류를 넘기지 않는다.

공개 status/current version, privacy scan, Markdown+HTML hash, 현재 버전 썸네일의 경로·파일 hash 검증은 유지했다. 저장소 query·schema·본문 bytes·공개 선택·자산 파일을 바꾸지 않는다. 일반 목록 canonical과 검색/태그 noindex, 빈 목록 200·DB 오류 500, Home 소개/최근 글의 기존 Suspense 경계도 유지한다. 요청 간 영속 cache는 ADR-042/F3의 후속 범위다.

## RED/GREEN과 기본 검증

- 실제 `marked.Lexer` 호출을 관찰하는 목록 회귀는 RED에서 본문 파싱 `2 !== 0`으로 실패했다. 경량 모델 적용 후 0회이며 기존 상세 모델에서 뽑은 카드, 태그 집계, 페이지 범위/잘못된 값/빈 태그, Home 크기와 저장된 자료가 일치한다. 공개 버전·철회·태그 별칭·썸네일 실패 회귀도 기존 suite에서 통과했다.
- 공유 loader가 없는 RED를 확인한 뒤 실제 React Server Component renderer에서 동일 인자의 객체/Promise 결과 공유, 태그/페이지 크기별 분리, 다음 render의 새 결과와 DB 오류 이후 다음 요청의 복구를 확인했다. DB 경계만 합성 응답으로 대체하며 React cache는 실제 구현을 실행한다.
- 앱 단위 테스트: 301 pass, DB opt-in 29 skip. 별도 RSC cache 테스트 1/1. 소스 lint와 TypeScript, production build 통과.
- 전체 `npm run lint`: 기존 Git 제외 `private/observe-step4`, `private/observe-step5`의 CommonJS helper 오류 10개와 다른 private helper 경고 6개가 남아 실패했다. 해당 파일은 변경하지 않았다. build의 기존 `blog-thumbnails.ts` 동적 파일 접근 tracing 경고 2개도 유지한다.

실행 위치는 `apps/h-log`다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts lib/blog-discovery-ui.test.ts
node --conditions=react-server --no-warnings --experimental-strip-types --test scripts/blog-list-cache.test.mjs
npm run test
npm run lint
node node_modules/eslint/bin/eslint.js app components lib scripts next.config.ts
npm run typecheck
npm run build
```

## 성능과 공개 결과 비교

전체 실행 `hlog-perf-dddeb6d0`는 2026-11-13 12:25:26–12:34:55 KST에 완료했다. F1과 fixture·측정기 SHA 및 장비/도구·Docker 자원 제한이 같고 앱 source SHA는 `6d249124ca5dfd7eea79fb4bf36dd89f3dcf9ea54a318eec78b0976191a46fbf`다. 호스트 Node 22.14.0, 앱 Node 24.19.0, Next 16.4.3, Playwright 1.62.1, Edge 157.0.4341.46을 사용했다. 실행별 이미지 ID와 조건별 값은 [비교 JSON](blog-list-performance-2026-11-13.json)에 기록한다.

원본 F1 명령으로 CPU 80표본·warm HTTP 1,024요청·브라우저 96표본과 Brain 발견 6표본을 확인했다. CPU는 준비 2회/측정 5회, HTTP는 조건별 32요청·동시성 1/8, 브라우저는 기존 cold/warm·1440/390px·CPU 1/4배·조건별 3표본이다. F1 두 실행의 큰 값을 비교 기준으로 쓰며 기존 예산을 바꾸지 않았다.

변경 전 소스를 Git에서 읽어 같은 fixture 10/100/500/1,000글의 목록을 다시 계산했다. 기존 F1 공개 결과 해시를 먼저 대조한 뒤 제목·요약·순서·태그·썸네일·날짜·페이지/태그 집계의 28조건이 새 목록과 일치했다. 전체 상세 모델도 동등했다. 내부 목록 DTO에서 상세 필드가 빠졌으므로 전체 DTO 해시의 동일성을 주장하지 않는다. 저장된 fixture와 DB 원본 버전의 변경도 없었다.

아래는 전체 후보 실행의 ms다. F1 범위는 두 실행의 중앙값 또는 p95 범위이며 합친 percentile이 아니다.

| 글 수 | 목록 CPU 중앙값 F1 → F2 | `/blog` 단일 요청 p50 F1 → F2 | `/blog` 동시 8요청 p95 F1 → F2 |
| --- | --- | --- | --- |
| 10 | 7.42–7.49 → 1.06 | 16.94–17.33 → 14.90 | 163.51–179.64 → 125.31 |
| 100 | 22.86–22.98 → 5.33 | 74.93–76.99 → 31.93 | 909.09–974.71 → 393.81 |
| 500 | 117.23–120.78 → 25.40 | 353.64–362.60 → 136.92 | 3,491.51–3,588.11 → 1,418.22 |
| 1,000 | 237.68–242.40 → 53.08 | 724.84–747.79 → 261.37 | 7,122.58–7,362.70 → 2,536.84 |

목록 CPU와 목록 HTTP의 모든 크기/동시성은 예산 이내다. 다른 경로의 최초 p95에서 500글 상세/동시 8요청은 2,328.97ms(한도 2,300.56ms), 1,000글 검색/동시 8요청은 6,327.19ms(한도 3,682.69ms)로 초과했다. 원자료를 보존하고 동일 코드·자료·자원 상한·경로별 요청 순서의 500/1,000글 HTTP 구간을 추가 확인했다. 이 결과를 목록 개선율과 섞지 않는다.

추가 확인의 첫 시도 `hlog-perf-1dfbeb4d`는 1,000글 Markdown/동시 8요청 중 연결 실패로 중단했다. Docker 이벤트의 앱 종료 코드는 139였고 OOM 이벤트는 기록되지 않았다. 정확한 원인은 확정하지 못했으며 이번 코드 때문이 아니라고 단정하지 않는다. 완료한 HTTP 조건은 13개이고 자원 정리는 성공했다. 이 실행을 완료 표본에 합치지 않고 별도 실패 기록으로 남겼다. 후속 시도는 같은 자원 제한을 유지하면서 실패 시 컨테이너 상태/로그를 수집하도록 검수기를 보완했다.

이후 두 번의 HTTP 확인은 각각 512요청을 완료하고 자원을 정리했다. 완료 실행의 warm HTTP 표본은 전체 후보 실행을 포함해 총 2,048개이며, 중단 실행의 표본은 제외했다. 두 확인에서 목록 예산을 모두 충족했고 최초 상세·검색 초과와 종료 139는 재현되지 않았다.

| 동시 8요청 조건 | p95 예산 | `hlog-perf-a03f7623` | `hlog-perf-5e3f71b5` |
| --- | --- | --- | --- |
| 500글 상세 | 2,300.56ms | 1,647.55ms | 1,793.48ms |
| 1,000글 검색 | 3,682.69ms | 2,986.14ms | 2,980.77ms |

마지막 확인의 별도 조건인 1,000글 Markdown/동시 8요청 p95는 2,597.60ms로 예산 2,399.94ms를 초과했다. 예산을 완화하거나 초과 기록을 제외하지 않았다. 이번 완료 판정은 F2 Step 0의 목록 가공·공개 결과·목록 CPU/HTTP 범위에 한정한다. 전체 경로의 성능 통과나 운영 준비 완료를 뜻하지 않는다. Markdown 지연과 원인이 확정되지 않은 종료 139는 F2 Step 1의 부하 검수에서 재확인한다.

실제 운영 지연이나 사용자 INP 개선의 수치가 아니다. Brain 코드는 수정하지 않았고 이번 그래프 실행은 기능 회귀에 사용했다. F1에서 편차가 컸던 그래프 3조건의 별도 재측정 요구와 영속 rebuild 미구현(null)을 유지한다. 원자료는 Git/Docker 제외 `private/f2-2026-11-13/` 및 각 performance-baseline 실행 폴더에 보존한다.

## 로컬 DB·HTTP·화면 검수

소유 label이 있는 tmpfs PostgreSQL과 loopback의 로컬 production/dev 서버를 사용했다. 검수 완료 후 생성한 DB 컨테이너, 서버 프로세스, 임시 인증 파일을 정리했다.

- `test:public-read-path`에 해당하는 DB 통합 테스트 2/2 통과. published/current, 철회·미선택 버전·privacy 및 공개 연결의 기존 경계를 확인했다.
- `scripts/blog-index-seo.http.test.mjs`: production/dev 각각 21/21. canonical 페이지 정규화, noindex, 빈 목록, DB 오류/복구, 현재 제목·구조화 데이터·소셜 metadata와 비공개 제외를 검수했다.
- Blog 브라우저: 각각 42상태 표본·9개 탐색 묶음. 1440/390/320px·JS ON/OFF의 목록/상세·페이지·태그·빈 결과, 키보드·history와 JS 검색 오류/재시도/빈 검색을 확인했다. 가로 넘침이 없었고 production의 데스크톱·모바일 목록 스크린샷도 확인했다.
- Home: 각각 6화면. JS ON의 최근 3개, 소개/레이더, JS OFF의 Blog 대체 링크를 확인했다. DB의 posts 읽기를 transaction lock으로 늦춰 소개가 먼저 stream되고 해제 후 최근 글이 도착함을 확인했다. DB 장애 때 소개는 유지되고 최근 글 안내/다시 불러오기로 복구했다.
- 기존 Brain 발견: 각각 JS ON/OFF 6표본, 3폭의 다섯 배치·reader·뒤로가기와 레이더 검수 통과. 픽셀 동일성 자동 비교는 아니다.

개발 검수의 첫 시도는 URL이 바뀐 직후 이전 화면을 읽었고, 다음 시도에서는 development effect 재실행이 첫 오류 주입을 취소했다. 검수기에서 history 뒤의 DOM 갱신을 기다리고 오류 화면 확인까지 주입을 유지한 후 통과했다. 실패 receipt와 정상 production 결과를 보존했으며 이를 제품 수정으로 숨기지 않았다.

기존 한계도 확인했다. JS OFF의 Home 최근 글 링크는 Suspense 영역에 표시되지 않지만 Blog 대체 링크가 있다(SEO-07). 일반 Blog는 JS OFF에서도 탐색된다. DB 장애의 no-JS Blog는 500이지만 안내/재시도 화면이 빈 기존 제한이 있으며 수동 새로고침으로 복구했다. 이번 목록 경량화에서 이 별도 UI 계약을 확장하지 않았다.

로컬 재현은 F1 도구 준비 후 `node --no-warnings --experimental-strip-types scripts/performance-baseline.mjs --local`로 수행한다. 별도 UI 검수는 비공개 `private/f2-2026-11-13/run-ui.mjs`가 기존 SEO HTTP/브라우저 검수기를 호출했고, 운영 환경 주소나 DB URL을 사용하지 않았다.

최종 문서 검수에서 변경 Markdown 10개·JSON을 파싱하고 추가 링크 34개, 전체 60개 phase/209개 step의 상태 일관성과 `git diff --check`를 확인했다. 성능 트랙은 2 completed/20 pending이며 다른 phase 상태는 유지했다. 소유 label로 Docker를 다시 조회해 검수 컨테이너·네트워크·이미지가 남지 않았음을 확인했다. 비공개 증거와 기존 `.tmp/`는 커밋 대상에서 제외했다.

## 다음 작업

[F2 Step 1 `scoped-markdown-read`](../../../phases/blog-read-efficiency/step1.md)에서 기존 slug 전용 repository/loader를 Markdown 한 편의 응답에 연결한다. 이번 작업은 전체 DB 조회·반복 privacy/hash 검증·썸네일 파일 검증·시리즈 공개 선택을 모두 없앤 것이 아니다. F3/F6의 계약과 측정 대상은 그대로 남는다. 실제 콘텐츠 발행과 운영 배포·OCI/DNS/TLS·provider·timer는 수행하지 않았다.
