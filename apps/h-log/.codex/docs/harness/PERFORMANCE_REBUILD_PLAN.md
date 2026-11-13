# H-Log 성능 개선과 재생성 가능한 조회용 데이터 계획

등록일 2026-11-06. 사용자가 코드 성능 분석 결과와 원본에서 보조 저장소를 복구하는 원칙을 phase/step으로 등록하도록 요청했다. **F1–F7은 7개 phase / 22개 step이며 F1 완료·pending 21개**다. 전체 레지스트리는 60개 phase / 209개 step이다. [전체 상태](../../../phases/index.json)를 기준으로 실행하며 2026-11-13 [F1 측정·예산](PERFORMANCE_BASELINE_REVIEW.md)을 완료했고 다음은 **F2 Step 0 `lightweight-list-model`**이다. 2026-11-13 [R5 로컬 통합 검수](KNOWLEDGE_RELEASE_REVIEW.md)를 완료해 기존 콘텐츠 R 트랙 14개 step은 모두 completed다. 새 재검토 목록의 서버 필터·20개 제한 조회는 R5 Step 1에서 구현했고 기존 전체 관리자 목록/원문 이력의 개선은 F6에 남긴다. 운영 보류 중 일반적인 다음 단계 요청은 F2 Step 0부터 F 순서를 따른다. SEO S3 Step 1/2와 운영 적용의 승인 조건은 유지한다.

## 목표

글과 기록이 늘어도 목록·한 편 읽기·검색·편집의 처리량을 필요한 데이터에 가깝게 제한한다. 반복 본문 변환·공개 검증·검색 정규화·좌표 계산을 버전 단위로 재사용한다. 보조 데이터는 원본과 공개 선택을 읽어 재구성할 수 있어야 하며, 유실·중단·동시 변경을 복구 검수에 포함한다.

승인된 Brain sidebar/canvas·다섯 배치·검색/필터·reader와 Home 레이더는 화면 및 동작 비교 기준이다. UI 검수는 외관·접근성·키보드/터치·URL/history의 일치까지 포함한다. 질문 필드의 의미는 작성자가 남기는 질문이다. 허용된 공개 기능과 운영 경계는 PRD/AGENTS를 따른다.

## 현재 코드와 탐색 측정

검토 기준 commit은 `eca394ddc77db038f7c60e63b7c7d4f7a0446580`이다. 런타임 측정은 `hlog-web:r1-editor`의 runner image `sha256:c3ac435070a9a26c8382090211a7017e18940a289e6d647a3f75b2f4298058e5`, 격리 PG16, loopback 직접 접속으로 진행했다. Node 24.22.1, i7-13700K, 글당 약 8KB Markdown/8.4KB HTML, 썸네일 없는 합성 자료다. HTTP는 준비 요청 뒤 3표본 중앙값, CPU 함수는 준비 2회 뒤 5표본 중앙값이다. 서버/OS cache를 초기화하지 않았다.

| 공개 글 수 | 목록 6개 HTTP | 상세 한 편 HTTP | Markdown 한 편 HTTP | 검색 API HTTP |
| --- | --- | --- | --- | --- |
| 10 | 28.54ms | 29.95ms | 9.14ms | 6.81ms |
| 100 | 75.44ms | 50.97ms | 42.38ms | 48.51ms |
| 500 | 348.50ms | 159.07ms | 94.85ms | 130.08ms |
| 1,000 | 775.97ms | 348.75ms | 201.72ms | 301.16ms |

1,000개 조건의 목록 8개 동시 요청은 5.05–5.72초였고, metadata와 목록 페이지 함수 가공의 중앙값은 547.57ms였다. 공개 store의 JSON 직렬화 크기는 약 18.1MB였다. 이 수치는 해당 fixture의 객체 크기이며 DB wire bytes와 별도로 취급한다. `post_sources` 1,000행에서 한 글을 고르는 순차 스캔의 실행 시간은 0.131ms였다. 전체 조회·변환을 먼저 줄이고 index는 실제 새 query의 EXPLAIN ANALYZE로 선정한다.

| 노드 수 | 순수 배치 함수 중앙값 | 연결 수 |
| --- | --- | --- |
| 28 | 11.92ms | 카탈로그 42개 |
| 100 | 64.89ms | 합성 150개 |
| 300 | 296.79ms | 합성 450개 |
| 1,000 | 1,331.68ms | 합성 1,500개 |

별도 headless Edge의 초기 로딩 측정은 조건별 1표본이다. 카탈로그 28개와 합성 노드를 추가한 300개를 사용했고, 추가 노드는 연결이 없는 구성이다. 300개에서 최대 long task는 기본 CPU 288ms, 4배 감속 1,335ms였다. 초기 HTML의 decoded 크기는 28개 85,372 bytes, 300개 571,899 bytes였다. 기본 CPU의 2초 idle 관찰에서 main-thread TaskDuration은 각각 약 273/614ms였다. 이 표본은 순수 함수의 연결 구성과 구분하며, GPU 환경·실기기·운영 INP/p75/p95는 F1/F7에서 필요한 범위로 추가 측정한다.

원자료는 Git/Docker 제외 `private/perf-review-2026-11-06/`의 `cpu.mjs`, `cpu.json`, `runtime.mjs`, `runtime.json`이다. 마지막 runtime receipt에 컨테이너 2개·network·임시 인증 파일 정리가 기록돼 있다. F1은 이 private 자료가 없는 checkout에서도 실행 가능한 fixture/명령을 등록한다. 위 탐색 분석 완료와 F step의 구현·검수 완료는 각각 별도 상태로 관리한다.

## 발견 사항과 실행 연결

| 현재 호출 경로 | 반복 비용 또는 성장 조건 | 후속 |
| --- | --- | --- |
| `blog-public.ts`의 getPublicBlogIndex → getPublicBlogPosts | 전체 글 본문/목차 변환 후 페이지 선택, metadata/page 재가공 | F2 Step 0, F3 Step 3 |
| 공개 repository의 findPublicBlogContent, 상세/Markdown caller | 전체 current 본문과 관계를 읽어 한 편 또는 탐색 정보 선택 | F2 Step 1, F3 Step 4 |
| public selector, privacy scanner, 태그/출처/자산 filter | 같은 요청에서 검증·JSON/문자열 생성과 배열 순회 반복 | F2 Step 0, F3 |
| BlogSearchPanel와 검색 API | 서버 목록 준비 뒤 API가 다시 전체 읽기, cache hit에도 검색 계산 | F4 |
| brain-layout의 250 tick과 BrainScene syncLayout | 필터/배치 변경 때 동기 계산, 좌표 재생성 | F5 Steps 0–1 |
| BrainScene draw, 전체 graph client props | 매 프레임 할당/라벨/DOM 작업, 본문 전체 직렬화 | F5 Steps 2–3 |
| getOwnerNote/listOwnerNotes와 BrainCapture | 모든 이력 본문과 목록, 타이핑마다 파싱/미리보기 | F6 Steps 0–1 |
| verifyBlogThumbnailFiles와 unoptimized 이미지 | 요청별 파일 hash, 원본 크기 전송 | F6 Steps 2–3 |
| buildBlogCrawlerOutputs | 하나의 출력 요청에서 여러 출력 문자열 생성 | F3 Step 5 |
| 공개 pool과 관측 경로 | DB 대기 상한, 실제 route/변환/pool/rebuild 계측 보강 | F7 |

React `cache()`는 요청 내부에서 같은 계산을 공유하는 범위를 기준으로 사용한다. 프로세스/요청 간 재사용에는 별도 생명주기와 무효화 계약을 적용한다. [React cache 문서](https://react.dev/reference/react/cache)

## 원본과 파생 데이터의 소유권

| 대상 | 기준 데이터 | 재생성 가능한 결과 |
| --- | --- | --- |
| Blog | 버전별 Markdown/기존 HTML, 제목·요약·검수·태그/출처, status/current version·공개 결정 | 목록 DTO, 본문 블록/목차, 검색 텍스트/index, 태그 집계, crawler 출력 |
| Brain | 정적 카탈로그, 불변 draft 이력, 선택한 published revision과 검수된 public snapshot·날짜/관계 | 공개 요약·본문 전송 모델, 정규화 검색 자료, 알고리즘 버전별 좌표/집계 |
| PDF | 실제 bytes, hash, 검수/도구 버전, 공개 선택·epoch와 감사 | 제한된 미리보기·표시용 요약. 공개 재승인은 기존 복구 계약을 따른다 |
| 이미지 | 원본 bytes, 공개 가능 여부, alt·원본 식별자 | 크기별 파일, 변환 manifest, 무결성 검증 결과 |

현재 `content_hash`는 Markdown과 HTML을 함께 계산한다. 기존 HTML은 현재 계약의 복구 기준에 포함하고, renderer 변경은 새 결과의 버전으로 관리한다. 제목/요약/태그/출처/검수 메타데이터와 privacy 정책 변경은 본문 hash 외의 입력 fingerprint로 식별한다. Brain의 검수된 public snapshot은 현재 원본 계약에 포함한다. 이 필드를 지우는 복구 실험은 F3의 별도 재현성 계약이 성립한 대상에만 허용한다.

파생 결과는 `source version + input fingerprint + projection/renderer/search version + privacy policy fingerprint`로 추적한다. canonical origin이 들어가는 출력은 origin도 키에 포함한다. 검색 전체 결과·집계는 공개 generation과 연결하며, 좌표는 노드/edge 입력·layout·spread·알고리즘 버전을 포함한다. 실제 필드/테이블 이름과 실패 동작은 F3 Step 0에서 확정한다.

## 재생성·현재성 계약의 기본안

1. 동일 PostgreSQL의 조회용 테이블을 기본 저장소로 사용한다. 읽기 경로는 기준 테이블의 현재 status/선택 버전과 일치하는 행만 사용한다. 목록·태그 개수·검색 순위·이웃 링크도 같은 공개 snapshot을 기준으로 계산한다.
2. 원본 쓰기와 파생 변경 또는 durable 변경 표식을 같은 transaction에 넣는다. 관리자·자동 생성·worker 공개/실패 숨김·철회·rollback과 Brain 공개 선택을 모두 조사한다. 무거운 계산을 밖에서 수행하면 반영 시 예상 revision/hash를 다시 확인한다.
3. 누락된 한 항목은 동시 요청을 합쳐 제한된 비용으로 재생성한다. 전체 rebuild는 batch/cursor·동시성/메모리·시간 상한, 재시도와 중단/재개를 갖춘다. 원본 DB 장애와 보조 데이터 누락은 서로 다른 오류 상태로 처리한다.
4. 새 generation의 건수/ID·입력 fingerprint·출력/공개 검증이 완료되면 원자적으로 활성화한다. rebuild 중 쓰기는 durable 변경 추적과 최종 최신성 검사로 반영한다. 늦은 작업의 구 generation 반영을 차단한다.
5. 캐시 누락·보조 table 유실·schema 버전 불일치·파일 손상 때 지원할 fallback과 복구 명령을 정의한다. 원본 fallback에도 처리량 상한과 현재 공개 판정을 적용하며 비용 초과/원본 실패는 기존 오류 계약으로 종료한다.
6. 철회와 검증 정책 변경을 HTTP/CDN cache·in-process cache·검색/집계까지 검수한다. TTL만으로 공개 권한을 결정하지 않는다. 이미 열린 reader의 동작과 새 요청의 현재성 계약을 구분해 기록한다.
7. 복구 실험은 합성 자료를 넣은 소유 확인 격리 DB에서 파생 대상만 비우고 수행한다. 원본 bytes/hash·버전·검수·공개 선택·감사를 전후 비교한다. 재생성 동작은 파생 데이터 계산에 한정한다.

Redis는 다중 앱 인스턴스의 공유 재사용이나 잔여 병목이 측정될 때 별도 채택 결정을 한다. 첫 F 구현의 의존성은 PostgreSQL과 기존 Next.js runtime으로 정한다. Cache-aside의 실패/무효화·다중 인스턴스 조건을 비교 자료로 사용한다. [Cache-aside](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)

Materialized view와 일반 projection table은 최신성·개별 갱신·애플리케이션 변환 비용으로 비교한다. 일반 테이블에 결정적 projector와 rebuild 명령을 연결하는 안을 우선 검증한다. 검색 index는 한글·영문·2자·다중 토큰·기존 순위의 동등성을 검사하며 pg_trgm의 짧은 패턴 비용도 측정한다. [Materialized views](https://www.postgresql.org/docs/16/rules-materializedviews.html), [pg_trgm](https://www.postgresql.org/docs/16/pgtrgm.html)

## Phase와 Step

| Phase | Step | 개선 사항 | 상태 |
| --- | --- | --- | --- |
| F1 성능 기준선과 회귀 예산 | [0 reproducible-performance-baseline](../../../phases/performance-baseline/step0.md) | 반복 가능한 측정과 성능 예산 | completed |
| F2 블로그 조회와 반복 가공 절감 | [0 lightweight-list-model](../../../phases/blog-read-efficiency/step0.md) | 목록 전용 모델과 요청 내 계산 공유 | pending |
| F2 블로그 조회와 반복 가공 절감 | [1 scoped-markdown-read](../../../phases/blog-read-efficiency/step1.md) | Markdown 한 편의 조회 범위 축소 | pending |
| F3 원본에서 재생성하는 조회용 데이터 | [0 source-and-projection-contract](../../../phases/rebuildable-public-read-models/step0.md) | 원본·공개 선택·파생 데이터 계약 | pending |
| F3 원본에서 재생성하는 조회용 데이터 | [1 projection-storage-and-rebuild](../../../phases/rebuildable-public-read-models/step1.md) | 조회용 저장소와 재생성 도구 | pending |
| F3 원본에서 재생성하는 조회용 데이터 | [2 transactional-projection-freshness](../../../phases/rebuildable-public-read-models/step2.md) | 수정·공개·철회와 파생 데이터 일치 | pending |
| F3 원본에서 재생성하는 조회용 데이터 | [3 projected-blog-list](../../../phases/rebuildable-public-read-models/step3.md) | DB에서 공개 목록과 개수 조회 | pending |
| F3 원본에서 재생성하는 조회용 데이터 | [4 projected-detail-navigation](../../../phases/rebuildable-public-read-models/step4.md) | 상세 한 편과 가벼운 탐색 조회 | pending |
| F3 원본에서 재생성하는 조회용 데이터 | [5 versioned-crawler-outputs](../../../phases/rebuildable-public-read-models/step5.md) | 크롤러 출력의 선택 생성과 재사용 | pending |
| F4 미리 생성한 검색 데이터와 단일 조회 | [0 search-document-and-index](../../../phases/indexed-blog-search/step0.md) | 검색 문서와 인덱스 | pending |
| F4 미리 생성한 검색 데이터와 단일 조회 | [1 single-read-search-flow](../../../phases/indexed-blog-search/step1.md) | 중복 전체 조회를 줄인 검색 흐름 | pending |
| F5 Brain 계산과 초기 전송량 | [0 reusable-graph-layouts](../../../phases/brain-performance/step0.md) | 배치 좌표와 검색 인덱스 재사용 | pending |
| F5 Brain 계산과 초기 전송량 | [1 worker-layout-computation](../../../phases/brain-performance/step1.md) | 그래프 계산의 Worker 분리 | pending |
| F5 Brain 계산과 초기 전송량 | [2 bounded-frame-work](../../../phases/brain-performance/step2.md) | 프레임별 작업량과 자원 사용 절감 | pending |
| F5 Brain 계산과 초기 전송량 | [3 bounded-brain-payload](../../../phases/brain-performance/step3.md) | 그래프 요약과 본문 지연 조회 | pending |
| F6 관리자 이력과 이미지 처리 | [0 paged-owner-history](../../../phases/owner-asset-performance/step0.md) | 관리자 목록과 수정 이력의 제한 조회 | pending |
| F6 관리자 이력과 이미지 처리 | [1 responsive-owner-preview](../../../phases/owner-asset-performance/step1.md) | 긴 글 입력과 미리보기 계산 분리 | pending |
| F6 관리자 이력과 이미지 처리 | [2 versioned-asset-validation](../../../phases/owner-asset-performance/step2.md) | 자산 무결성 검증 결과 재사용 | pending |
| F6 관리자 이력과 이미지 처리 | [3 rebuildable-thumbnail-variants](../../../phases/owner-asset-performance/step3.md) | 원본에서 만드는 표시 크기별 썸네일 | pending |
| F7 DB 대기 제한과 성능·복구 통합 검수 | [0 bounded-public-db-waits](../../../phases/performance-observation-rehearsal/step0.md) | 공개 DB 연결과 쿼리 대기 상한 | pending |
| F7 DB 대기 제한과 성능·복구 통합 검수 | [1 private-performance-signals](../../../phases/performance-observation-rehearsal/step1.md) | 성능 지표와 재생성 상태 관측 | pending |
| F7 DB 대기 제한과 성능·복구 통합 검수 | [2 cold-rebuild-performance-rehearsal](../../../phases/performance-observation-rehearsal/step2.md) | 보조 데이터 유실과 부하 통합 검수 | pending |

## 실행 순서와 겹치는 작업

기본 성능 순서는 F1 → F2 → F3 → F4 → F5 → F6 → F7이다. 각 step은 선행 조건이 충족된 한 단위씩 실행한다. F5 Steps 0–2, F6 Steps 0–1, F7 Step 0은 F1 이후 독립 진행할 수 있다. 순서를 바꿀 때 실행한 단위와 이유를 기록한다.

- R2는 콘텐츠 주장/근거, R3는 공개 글 연결, R4는 태그 별칭/탐색, R5는 수동 검토를 소유한다. F3/F4는 실행 시점의 R 계약과 데이터를 읽어 파생 입력과 검색 동등성에 포함한다. 콘텐츠의 주장/출처 정리와 수동 검토 범위는 R 계획을 따른다.
- R1은 완료된 출처·질문 저장/입력 계약이다. F5/F6는 이 계약의 버전·생략/빈 배열·공개 선택·오류 복구를 회귀 검증한다.
- F7은 기존 모니터링의 비공개 수집/allowlist/생성 dashboard 경로를 사용한다. 운영 모니터링 Step 7 → 관리자 A3 Step 4 → timer가 운영 실행 순서이며 OCI 보류 해제와 실제 범위 승인 후 수행한다.
- SEO S2/S3의 canonical·noindex·JS ON/OFF 발견·본문/hash·실패 status/철회를 새 읽기 경로의 인수 기준으로 포함한다.

등록 후 R은 completed 3/pending 11, SEO는 9/1/1, 관리자 A는 16/0/1, 운영 모니터링은 7/0/1이다. F는 completed 0/pending 22다. 기존 phase 상태는 각 index가 소유한다.

## 공통 검증과 완료 조건

코드 step은 가까운 RED/GREEN과 앱 기본 gate `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`를 실행한다. DB/worker 변경은 관련 integration과 실제 격리 HTTP를 추가한다. 기존 Git 제외 private helper의 전체 lint 실패는 source 검사와 따로 기록한다.

문서 전용 step은 Markdown/JSON·링크/경로·의존성 파싱과 diff 검사를 실행한다. UI step은 개발/production 1440/390/320px·키보드·터치·JS ON/OFF·history·취소/오류/복구를 검수한다. F1/F7은 실제 실행 command, commit/image와 fixture hash·표본 수, CPU/DB/브라우저 측정의 구분을 남긴다. 현재 탐색 표본은 방향 선정의 근거이며 후속 성능 예산은 F1에서 구현 전에 동결한다.

최종 검수는 전체 보조 저장소 유실 후 재구성, 동시 수정/철회, 오래된 worker, 응답 유실·중복·부분 생성 실패, 정책/renderer/schema 변경, 호환 rollback을 포함한다. 원본과 공개 결과의 동등성 및 자원 상한을 통과한 step만 completed로 전환한다. 운영 인계에는 원본 파일 보관·migration·재생성·중단/재개·rollback과 실제 트래픽 검수 과제를 기록한다.

## F1 완료와 후속 비교 — 2026-11-13

2026-11-13 F1 Step 0 `reproducible-performance-baseline` 완료. 저장소의 합성 fixture·격리 실행기로 전체 측정을 두 번 수행했다. CPU 160표본·warm HTTP 2,048요청·브라우저 192표본의 조건과 공개 결과가 일치했고 자원을 정리했다. [성능 기준선·예산](PERFORMANCE_BASELINE_REVIEW.md)과 비교용 JSON을 등록했다. 앱 동작·공개 UI·원본 저장 계약은 변경하지 않았다. **F completed 1·pending 21, 다음은 F2 Step 0 `lightweight-list-model`**이다. R 14 completed와 SEO/운영 보류를 유지한다.

`node --no-warnings --experimental-strip-types scripts/performance-baseline.mjs --local`을 `apps/h-log`에서 실행한다. 도구 준비·표본/캐시 조건·통계 산식·필수 지표와 허용 예산은 [검수 기록](PERFORMANCE_BASELINE_REVIEW.md)과 [기준 JSON](performance-baseline-2026-11-13.json)을 따른다. 동일 fixture·도구·하드웨어·자원/화면 조건에서 비교하며, 기존 public/DB/HTTP 정확성 회귀가 성능 판정보다 우선이다. 그래프 상호작용 32조건 중 3조건은 편차가 커 참고값으로 표시했고 후속 판정 전에 재측정한다. 영속 rebuild는 미구현이므로 현재 값은 null이다. 과거 탐색 표본과 이번 결과를 성능 개선율로 비교하지 않는다.
