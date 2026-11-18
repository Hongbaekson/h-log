# F3 Step 4 상세 조회 검수

2026-11-19. [상세 경로](../../../app/blog/%5Bslug%5D/page.tsx)는 metadata와 페이지에서 같은 slug로 요청 내 모델을 공유한다. 기본 모드는 `source`이며, 이 경로는 원래 공개 원본 집합을 읽어 결과를 구성한다. `shadow`는 같은 snapshot에서 두 결과를 비교한 뒤 원본 결과를 반환한다.

## 공개 선택과 조회 비용

`projected`는 선택된 버전, metadata revision, manifest와 정책을 확인한 뒤 대상 한 편의 저장된 payload hash를 검증한다. 현재 원본의 발행일을 별도로 사용하므로 발행일이 없는 글의 표기와 JSON-LD도 유지한다. 이전·다음은 날짜와 slug로, 관련 글은 공유 태그 비율·개수와 slug로 정렬한다. 시리즈는 정의된 순서를 유지한다. Portfolio와 Brain 출처에는 연결된 slug의 현재 제목만 전달한다. 블로그 상세에서 Brain 저장소 오류가 나면 해당 영역에 재시도 안내를 표시한다.

목록과 상세는 같은 누락 처리 코드를 사용한다. read-only snapshot당 최대 10개, 한 항목 1MiB·합계 8MiB로 원본 계산을 제한한다. 철회된 대상은 이웃을 계산하기 전에 걸러진다. 상세 한 편의 payload hash 검증에는 저장된 상세·목록·검색 필드를 읽는다. 이웃들의 목록 산출물은 SQL에서 검사하므로 글 수에 따라 DB 연산량은 늘어난다.

## 검증 결과

- 상세가 전체 store를 호출하던 경로에서 공유 loader 회귀가 실패했다. 구현 후 본문 블록, 목차 anchor, 태그와 링크 순서가 기존 원본 모델과 일치했다.
- [projection DB 회귀](../../../scripts/public-blog-list.integration.test.mjs)에서 제목만 변경한 경우, 손상된 payload, 이전 renderer, 강화된 정책, 조회 중 이웃 철회, 다음 요청의 404, 누락 상한을 확인했다. Brain 테이블 유실을 시험했을 때 Blog의 공통 hit 쿼리까지 실패해, 원본 확인 SQL을 대상 종류별로 선택하도록 고쳤다. 재검증에서 Blog 본문을 반환했고 선택 영역에만 오류를 표시했다.
- 글 10개와 1,000개 fixture의 warm 상세는 각각 원본 본문 0행, 데이터 SELECT 5회였다. 반환된 모든 PG 결과 행을 JSON으로 직렬화한 크기는 26,277 / 26,280 bytes였다. 이 측정은 DB Brain 옵션을 끈 경우다.
- Node 24에서 단위 테스트 305개 통과·DB opt-in 29개 skip, projector/CLI 6개, projection DB 27개, 일반 통합 33개 통과. 전체 lint, typecheck, production build를 통과했다. 기존 Next.js 16.4.3 보안 권고가 첫 build/dev 실행을 중단해 같은 명령을 재실행했다.
- 로컬 개발·프로덕션 서버에서 제목 수정, 직접 HTML/RSC, JSON-LD·canonical, 철회 후 링크 제거와 HTML·Markdown 404, 지원하지 않는 writer protocol의 500과 복구를 확인했다. 1440·390·320px와 JS ON/OFF에서 목차 링크, 키보드 이동과 history를 검증했다. 두 서버에서 기존 Brain 발견·다섯 배치·reader/history와 Home 레이더도 통과했다.

## 로컬 HTTP 측정

같은 production build의 `/blog/perf-0000`에 직접 요청해 응답 본문 수신 완료까지 측정했다. 장비는 Apple M4 Pro, Node 24.22.3, Next.js 16.4.3, loopback Docker pgvector/PG16이다. DB Brain 옵션을 켜고 [F1 합성 fixture](../../../scripts/performance-fixtures.mjs)의 공개 글 10개 또는 1,000개, 비공개·철회 글 각 1개, 글당 버전 2개를 사용했다. 각 fixture에서 현재 버전을 선택하고 rebuild를 완료한 뒤, 모드별 서버에서 첫 요청과 준비 요청을 제외했다. 아래 각 조건은 warm 32회다.

| 공개 글 | 동시 요청 | source p50 / p95 (ms) | projected p50 / p95 (ms) |
| ---: | ---: | ---: | ---: |
| 10 | 1 | 13.14 / 16.81 | 12.75 / 16.51 |
| 10 | 8 | 51.24 / 70.05 | 40.92 / 55.32 |
| 1,000 | 1 | 254.07 / 259.61 | 39.10 / 47.42 |
| 1,000 | 8 | 1,763.61 / 1,957.25 | 71.81 / 80.64 |

이번 측정은 호스트 앱과 Docker DB를 사용했다. [F1](PERFORMANCE_BASELINE_REVIEW.md)의 Windows 장비·컨테이너 CPU 상한과 달라 같은 장비에서 실행한 위 두 모드만 직접 비교할 수 있다. 운영 트래픽 측정과 배포는 수행하지 않았다.

DB 회귀는 `apps/h-log`에서 소유한 loopback PG16을 대상으로 `HLOG_PROJECTION_TEST=1`, `DATABASE_URL`의 DB 이름을 `hlog_projection_*`로 설정한 뒤 `npm run test:projection:db`로 재현한다. 테스트가 별도 DB와 fixture를 생성하고 정리한다. 다음 작업은 [F3 Step 5 크롤러 출력](../../../phases/rebuildable-public-read-models/step5.md)이다.
