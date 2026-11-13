# F1 로컬 성능 기준선과 회귀 예산

2026-11-13(KST) [F1 Step 0](../../../phases/performance-baseline/step0.md)의 재현 명령과 비교 기준이다. 앱 동작을 최적화하거나 운영 성능을 측정하는 단계가 아니다. [2026-11-06 탐색 표본](PERFORMANCE_REBUILD_PLAN.md)은 과거 기록으로 보존한다.

## 실행 명령과 소유 범위

`apps/h-log`에서 `npm ci`를 마친 Node와 로컬 Docker socket이 필요하다. 브라우저 도구는 앱 의존성과 분리한다. Playwright 1.62.1을 별도 도구 디렉터리에 설치하고 Chromium을 준비하거나 설치된 Edge를 사용한다. 예를 들어 다음과 같이 실행한다.

```powershell
npm install --prefix <tools-directory> --no-save --package-lock=false playwright@1.62.1
node <tools-directory>/node_modules/playwright/cli.js install chromium
$env:HLOG_PERF_PLAYWRIGHT_MODULE='<tools-directory>/node_modules/playwright'
# 설치된 Edge로 측정할 때만 HLOG_PERF_BROWSER_CHANNEL=msedge 설정
node --check scripts/performance-baseline.mjs
node --no-warnings --experimental-strip-types --test scripts/performance-baseline.test.mjs
node --no-warnings --experimental-strip-types scripts/performance-baseline.mjs --local --smoke
node --no-warnings --experimental-strip-types scripts/performance-baseline.mjs --local
node --no-warnings --experimental-strip-types scripts/performance-baseline.mjs --local
```

`--smoke`는 글 10개/노드 28개만 검사하며 전체 기준선 완료로 세지 않는다. `--cleanup-check`는 DB 생성 후 의도적으로 실패한다. exit 1과 receipt의 `cleanup.complete=true`를 함께 확인한다. 기본 `--local` 실행은 모든 크기를 검사한다. 임의 DB/앱 주소 인자는 받지 않으며 원격 Docker endpoint도 거절한다.

매번 UUID로 구분한 Docker 네트워크·tmpfs PG16·현재 checkout의 production runner 이미지를 만들고 loopback 임의 포트만 연다. 앱은 CPU 2개/메모리 2GB, DB는 CPU 1개/메모리 1GB로 제한한다. 종료 시 owner label을 확인한 컨테이너·네트워크·이미지 tag와 임시 암호 파일을 정리한다. 성공·실패 receipt는 `private/performance-baseline/hlog-perf-*/result.json`에 남는다. 이 경로는 Git/Docker에서 제외한다. Docker의 재사용 build cache는 삭제하지 않는다.

기존 private 분석 자료나 원고가 없어도 실행된다. 측정기는 저장소의 공개 카탈로그와 코드로 합성 자료를 만들며, 실제 DB·provider·발행·관리자 환경은 사용하지 않는다. 브라우저의 외부 origin 요청을 차단한다. 결과 JSON에는 private sentinel이나 DB 암호·접속 URL을 기록하지 않는다.

## 고정 fixture와 측정 조건

| 구분 | 조건 |
| --- | --- |
| Blog | 공개 글 10/100/500/1,000개 + 비공개/철회 각 1개, 글마다 2버전 중 v1만 선택, 태그 3개·출처 1개, 썸네일 없음 |
| 본문 | 고정 32개 소제목과 같은 한국어 문단. Markdown/HTML UTF-8 크기와 전체 fixture SHA-256을 결과에 기록 |
| Brain | 현재 공개 카탈로그 28개/42연결을 유지하고 100/300/1,000개까지 추가. 총 연결 150/450/1,500개 |
| 연결 분포 | 추가 노드는 ring에 반대편이 아닌 4칸 앞 연결을 절반 추가. 기존 카탈로그와 합성 부분은 별도 연결 집합이며 실제 사용자 그래프 분포를 대표하지 않음. 차수 histogram 기록 |
| Brain 이력 | 추가 노드마다 비공개 원문 2버전, 공개 사본은 v1 선택. CPU/DB/브라우저에서 같은 공개 graph 사용. 기존 카탈로그의 본문 길이는 그대로 유지 |
| 순수 함수 | 호스트 Node, 준비 2회·측정 5회. 목록 모델/전체 글 모델과 Brain 기본·timeline 배치의 동기 wall duration 기록 |
| HTTP | 4경로 × 글 크기 4개 × 동시성 1/8. 조건마다 warm 32요청, 별도 첫 route 요청과 준비 요청. body 수신/디코딩 완료 시간과 TTFB를 구분 |
| 브라우저 | 노드 크기 4개 × 1440/390px × CPU 감속 1/4배 × 새 context 3회 × cold/warm = 96표본/실행. 높이 900·DPR 1·reduced motion·네트워크 감속 없음 |
| 공개/UI 회귀 | 독립 상세/보이는 목록·canonical, 1440/390/320px의 다섯 배치·reader·키보드·뒤로가기와 Home 레이더를 별도 확인 |

HTTP의 첫 route 요청은 DB/OS cache를 비운 machine-cold 측정이 아니다. 앱은 크기별로 다시 시작하며 `/resume` 준비 뒤 각 route의 첫 응답을 따로 기록한다. p50/p95에는 준비 요청을 넣지 않는다. 검색 API는 준비 후 cache-hit 경로를 사용하고 매 요청의 합성 client ID를 바꿔 공개 rate guard를 측정 대상으로 섞지 않는다.

브라우저 cold는 새 context의 첫 탐색, warm은 같은 context의 두 번째 탐색이다. HTTP cache를 끄는 Playwright routing 대신 CDP 요청 제한을 사용한다. warm 표본은 실제 전송 바이트가 0인 script 재사용이 있어야 통과한다. 서버/DB/OS와 GPU cache를 초기화했다는 의미는 아니다.

`graph_interaction_ms`는 키보드로 배치 버튼을 누른 click dispatch부터 배치 DOM 변경 후 두 번째 animation frame까지다. 현재 배치 전환은 History API를 사용한다. React effect와 frame 예약 시점의 영향을 받는 관찰값이며 GPU 렌더 완료나 field INP로 부르지 않는다. `retained_heap_bytes`는 초기 GC 뒤 brain→topics→brain 1회 왕복과 다시 GC한 후의 V8 used heap이다. 초기 크기와 delta도 기록하며 장기 메모리 누수의 판정으로 확대하지 않는다.

## 사전 비교 예산

동일 fixture SHA·측정기 SHA·장비·도구 버전·화면/감속/캐시·동시성·자원 상한에서 비교한다. 앱 source SHA와 이미지 ID는 후보마다 기록한다. 두 기준선의 같은 조건 중 큰 값을 기준으로 `기준 × 비율 + 고정 허용량` 이하를 회귀 한도로 삼는다. 소수 표본의 흔들림을 줄이기 위한 보수적 한도이며 통계적 유의성이나 운영 SLO가 아니다.

| 지표 | 비교 값 | 회귀 한도 |
| --- | --- | --- |
| `list_model_cpu_ms` | 실행별 5표본 중앙값 중 큰 값 | 기준 × 1.20 + 2ms |
| `request_p50_ms` | 실행별 32표본 p50 중 큰 값 | 기준 × 1.20 + 20ms |
| `request_p95_ms` | 실행별 32표본 p95 중 큰 값 | 기준 × 1.25 + 50ms |
| `graph_interaction_ms` | 같은 브라우저 조건의 3표본 중앙값 중 큰 값 | 기준 × 1.20 + 16ms |
| `retained_heap_bytes` | 같은 조건의 GC 후 heap 3표본 중앙값 중 큰 값 | 기준 × 1.15 + 1MiB |
| `rebuild_duration_ms` | 아직 구현되지 않아 현재 값 `null` | F3의 1,000글 전체 재생성 목표 60초. 첫 유효 기준선 확정 후 × 1.20 + 100ms도 적용 |

p50은 정렬한 표본의 중앙값(짝수는 가운데 두 값의 평균), p95는 `ceil(0.95 × n) - 1` 위치의 nearest rank다. 30개 미만에서 p95를 만들지 않는다. CPU와 브라우저의 5/3표본에는 중앙값·최솟값·최댓값만 사용하며 서로 다른 조건의 표본을 합쳐 percentile을 계산하지 않는다.

재생성 시간은 fixture 적재나 현재 모델 함수 시간을 대신 넣지 않는다. F3의 지원하는 파생 저장소를 비운 뒤 원본 재조회 시작부터 입력 fingerprint·공개 결과 검증과 새 generation 활성화까지 측정한다. 원본 유실·동시 수정/철회·중단 복구는 별도 인수 기준이다. F1의 `full_model_cpu_ms`는 현재 전체 변환 비용을 관찰하는 값이다.

## 실행 결과

두 전체 실행은 2026-11-13 09:28:41–09:38:38, 09:38:39–09:48:33 KST에 완료했다. 결과 ID는 `hlog-perf-51575102`, `hlog-perf-a17fc9f5`다. [비교용 JSON](performance-baseline-2026-11-13.json)에 필수 지표의 모든 조건별 값, fixture 내용 길이·차수 분포·해시, 공개 결과 해시, 도구·이미지 정보와 예산을 저장했다. 아래 표의 `1회 / 2회`는 서로 다른 전체 실행이다.

앱 기준 commit은 `bcabf2c37aed2303a7e5a95639251b330739047f`다. 앱 source SHA-256은 `6dc327f6827b3f1370a8cf4ee9f35cc4ac061ef40dbaeb1efe91924801f9958a`, 새 측정기 세 파일의 SHA-256은 `2bca2941605b9e43b46054a88da6c24b1dfb02fff12e8983ee6f1bcf9abd04d4`이며 두 실행에서 같았다. 생성 이미지의 ID는 실행별 owner label과 빌드 때문에 다르며 각각 기록했다.

환경은 Windows, Intel i7-13700K(24 logical CPU), 호스트 Node 22.14.0, 앱 Node 24.19.0, Next 16.4.3, Playwright 1.62.1, Edge 157.0.4341.46, Docker 29.6.1이다. CPU 순수 함수 측정은 호스트에서, HTTP 앱/DB는 위의 Docker 자원 제한에서 실행했다. 브라우저는 실제 휴대전화 대신 데스크톱 Edge의 viewport/CPU 감속을 사용했다.

두 실행 합계 CPU 본 측정 160표본, warm HTTP 2,048요청, 브라우저 192표본, 공개 발견 JS ON/OFF 12표본을 확인했다. 모든 크기의 fixture·공개 결과 해시가 일치했고 원본 버전 해시가 보존됐다. 조건을 섞거나 준비 실행을 합산하지 않았다.

### 순수 함수 중앙값

단위는 ms이며, 각 값은 준비 2회 이후 5표본 중앙값이다.

| 공개 글 수 | 목록 모델 1회 / 2회 | 노드 수 | Brain 기본 배치 1회 / 2회 |
| --- | --- | --- | --- |
| 10 | 7.49 / 7.42 | 28 | 11.96 / 13.74 |
| 100 | 22.98 / 22.86 | 100 | 67.63 / 66.73 |
| 500 | 120.78 / 117.23 | 300 | 283.25 / 288.64 |
| 1,000 | 242.40 / 237.68 | 1,000 | 1,334.35 / 1,341.04 |

### `/blog` HTTP 응답

body 수신 완료까지의 ms다. 각 행·실행마다 32요청이며, 동시성 8의 지연에는 같은 앱 자원을 놓고 기다린 시간이 포함된다. 상세·Markdown·검색의 같은 조건별 값도 비교용 JSON에 있다.

| 글 수 | 동시 요청 | p50 1회 / 2회 | p95 1회 / 2회 |
| --- | --- | --- | --- |
| 10 | 1 | 17.33 / 16.94 | 34.73 / 22.73 |
| 10 | 8 | 98.28 / 102.94 | 163.51 / 179.64 |
| 100 | 1 | 76.99 / 74.93 | 86.78 / 87.56 |
| 100 | 8 | 587.11 / 577.25 | 909.09 / 974.71 |
| 500 | 1 | 362.60 / 353.64 | 384.04 / 366.21 |
| 500 | 8 | 2,785.73 / 2,674.33 | 3,588.11 / 3,491.51 |
| 1,000 | 1 | 747.79 / 724.84 | 773.38 / 752.01 |
| 1,000 | 8 | 5,706.73 / 5,645.73 | 7,362.70 / 7,122.58 |

### 모바일 폭 390px · CPU 4배 · warm

각 값은 3표본 중앙값이다. 상호작용은 ms, heap은 GC 이후 V8 used bytes다.

| 노드 수 | 배치 상호작용 1회 / 2회 | heap 1회 / 2회 |
| --- | --- | --- |
| 28 | 92.60 / 89.20 | 5,616,396 / 5,625,448 |
| 100 | 286.00 / 282.60 | 5,452,848 / 5,453,768 |
| 300 | 929.60 / 41.00 | 5,878,660 / 5,870,576 |
| 1,000 | 70.80 / 68.10 | 7,249,320 / 7,255,892 |

목록 CPU, HTTP p50/p95, heap의 두 실행 간 편차는 사전 예산 이내였다. 배치 상호작용 32조건 중 아래 3조건은 작은 값에 예산을 적용해도 큰 값이 초과했다. 값을 버리거나 빠른 실행만 선택하지 않았다.

| 노드 / 폭 / CPU / 캐시 | 1회 / 2회(ms) |
| --- | --- |
| 28 / 390 / 4 / cold | 33.70 / 108.50 |
| 100 / 390 / 1 / cold | 82.20 / 37.20 |
| 300 / 390 / 4 / warm | 929.60 / 41.00 |

이 세 조건은 **변동이 큰 참고 기준선**이다. 후속 변경의 성능 통과/실패나 개선율을 이 값만으로 판정하지 않는다. 해당 조건을 비교할 때 새 context 최소 5회로 재측정하고, React effect·그래프 갱신·frame 완료 시점을 확인해야 한다. 이번 기록만으로 변동 원인을 확정하지 않는다. 특히 1,000노드의 상호작용 수치가 더 낮다는 이유로 배치 계산이 더 빠르다고 해석할 수 없다. 순수 배치 함수 비용은 별도 CPU 표에 남겼다.

### 검증과 인계

- 초기 통계/fixture 테스트 3개에서 예상 실패를 확인하고 구현했다. 최종 측정기 테스트는 5/5 통과했다. 통계 산식, 결정적 공개/비공개 fixture, 그래프 일치, local opt-in, 원격 Docker 거절을 검사한다.
- 새 측정 스크립트 4개의 ESLint와 문법 검사, 두 전체 실행의 production Docker build를 통과했다. build에는 기존 `blog-thumbnails.ts` 동적 파일 접근의 tracing 경고 2개가 각각 남는다. 앱 코드를 바꾸지 않아 전체 앱 test/lint/typecheck를 별도로 재실행하지 않았다. 기존 Git 제외 private-helper lint 문제의 해결을 주장하지 않는다.
- 28노드에서 다섯 배치와 reader/history, Home 레이더, JS ON/OFF 공개 링크를 확인했다. 폭 1440·390·320px의 가로 넘침이 없었고, 데스크톱 그래프와 320px reader 스크린샷도 확인했다. 이 화면 검수는 픽셀 동일성 자동 비교가 아니다.
- 초기 준비 중 버전 선택·태그 순서·모바일의 숨겨진 중복 버튼을 측정하는 문제를 고쳤다. 그 실패 실행은 기준선에서 제외하고 receipt를 보존했다. 작은 fixture 전체 성공, DB 생성 직후 의도적 실패, 두 전체 성공 모두 `cleanup.complete=true`였다. 원격 Docker 거절은 자원 생성 전에 종료했다.

원자료·스크린샷·빌드 로그는 Git 제외 경로에 보존하고 공개 비교용 JSON에는 합성 결과와 환경 메타데이터만 담았다. 실제 콘텐츠·운영 DB·OCI/DNS/TLS·provider·timer·자동 발행은 변경하지 않았다. reduced motion 상태의 배치 버튼 1회 왕복이므로 지속 애니메이션, GPU 메모리, 실기기·사용자 INP, 운영 트래픽을 대표하지 않는다. 영속 projection/rebuild는 미구현이라 `rebuild_duration_ms=null`이다.

후속은 [F2 Step 0 `lightweight-list-model`](../../../phases/blog-read-efficiency/step0.md)이다. 목록의 전체 본문 가공을 줄인 뒤 동일 fixture에서 공개 결과·개인정보 경계를 먼저 검증하고 목록 CPU와 HTTP를 비교한다. F1 완료는 최적화 효과나 운영 성능 개선을 뜻하지 않는다.
