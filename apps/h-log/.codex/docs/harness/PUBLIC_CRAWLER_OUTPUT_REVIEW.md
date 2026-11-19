# F3 Step 5 크롤러 출력 검수

2026-11-19. `/feed.xml`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`은 각각 요청한 문서만 생성한다. 사이트맵은 블로그와 같은 읽기 전용 PostgreSQL snapshot에서 공개 Brain 경로도 선택한다.

## 응답과 재사용

- 기본 `source`는 현재 버전과 관계의 공개 정책을 다시 검사한다. 한 번에 slug를 최대 128개 읽고 Markdown과 HTML 합계 2 MiB 단위로 나눈다. 이를 넘는 기존 글은 한 편씩 처리한다.
- `projected`는 목록의 현재 선택·버전·표식과 활성 generation을 확인한다. 요약은 최대 128행, 전체 본문은 현재 Markdown만 8행씩 읽는다. 누락 시 기존 목록 fallback 예산을 적용한다. `shadow`는 같은 snapshot에서 두 출력의 SHA-256을 비교한 뒤 원본 결과를 보낸다.
- 현재성을 확인한 작은 출력은 종류별로 하나씩, 각 1 MiB까지 프로세스에서 재사용한다. 키에는 출력 schema·종류·canonical origin, source epoch·활성 generation·revision, manifest·privacy 정책과 사이트맵의 Brain DB 설정이 들어간다. 원본 모드와 fallback 결과는 저장하지 않는다.
- 문서가 1 MiB를 넘으면 소유자 전용 임시 파일을 열고 즉시 디렉터리에서 이름을 제거한다. 문서 생성과 DB 검증을 마친 뒤 연결을 반환하고 파일에서 스트리밍한다. 독자가 응답을 취소해도 파일을 닫는다. 대용량 동시 요청에는 전송 중인 파일 크기만큼 각 요청의 임시 공간이 필요하다.
- 성공·오류 모두 `Cache-Control: private, no-store`를 보낸다. 이전 릴리스가 이미 배포한 `max-age=300` 사본은 최대 5분 남을 수 있다. 운영 전환 시에는 기존 캐시의 만료 또는 purge를 별도로 확인한다.

## 1,000편의 실제 HTTP 응답

F1의 합성 입력에 공개 글 1,000편, 비공개 2편, 글별 버전 2개를 넣었다. 기준은 변경 직전 빌드 `65ad0ba`다. 같은 Apple M4 Pro, Node 24.22.3, Docker PostgreSQL 16, production Next 서버에서 한 번에 요청 하나를 보냈다. 프로세스를 모드별로 새로 시작해 출력마다 첫 요청과 준비 요청 한 번을 제외한 32회의 전체 본문 수신 시간을 측정했다. DB와 OS 캐시는 비우지 않았다. 기존 F1 자료에는 이 네 출력의 개별 지연과 RSS 수치가 없어 여기서는 같은 호스트에서 측정한 전후 값을 사용한다. [F1 실험 조건](PERFORMANCE_BASELINE_REVIEW.md).

| 출력 | 응답 바이트 | 변경 전 p50 / p95 (ms) | 기본 source p50 / p95 (ms) | projected p50 / p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| feed.xml | 361,338 | 220 / 231 | 252 / 261 | 55 / 70 |
| llms.txt | 285,123 | 220 / 237 | 251 / 274 | 53 / 92 |
| sitemap.xml | 123,729 | 219 / 229 | 252 / 295 | 54 / 59 |
| llms-full.txt | 8,336,115 | 235 / 242 | 251 / 293 | 132 / 158 |

각 출력의 SHA-256과 응답 크기는 세 빌드·모드 조합에서 일치했다. 50 ms마다 관측한 앱 프로세스 최대 RSS는 변경 전 498 MiB, source 414 MiB, projected 316 MiB였다. 기본 source의 p95는 출력별로 29–66 ms 늘었다. source는 공개 정책과 원문을 배치마다 검사한다. projected의 작은 출력도 매 요청의 공개 상태 검증 비용을 포함한다. PostgreSQL 메모리, 파일 캐시, 동시 요청 부하는 이 RSS에 포함하지 않았다.

## 회귀와 재현

- 기존 route가 네 출력 생성 함수를 호출해 focused 테스트가 실패하는 것을 먼저 확인했다. 실제 DB에서는 배치 경계에서 같은 시각의 한글·대소문자 slug 순서 차이를 재현하고 한국어 정렬을 적용했다. 합성 자료로 세 모드의 본문, 원문 hash, canonical origin과 요약 쿼리의 Markdown 제외를 검증했다.
- DB에서 철회·버전 교체·rollback, 정책 변경, 준비 중 및 새 활성 generation, Brain 발행·철회·표식 오류와 DB 장애를 검사했다. 대용량 응답은 생성 후 철회해도 이미 시작한 읽기의 바이트를 유지하고, 다음 요청이 철회를 반영했다.
- 일반 Chrome 프로필에서 캐시를 켜고 Nginx 1.28 공유 캐시를 경유했다. 캐시 가능한 대조 URL은 두 번째 요청에 HIT였다. 네 크롤러 URL은 매번 MISS였고 같은 주소에서 철회, v2 공개, v1 복원, rebuild 직후 각각 HTML·Markdown과 일치했다. writer protocol 오류에서 네 응답 모두 500/no-store였고 복구 직후 정상 바이트가 돌아왔다.
- 앱 디렉터리에서 `npm run test`는 305개 통과·DB 조건부 29개 생략, `npm run test:projection`은 6개 통과했다. 소유한 loopback `hlog_projection_*` DB에 `HLOG_PROJECTION_TEST=1`로 `npm run test:projection:db`를 실행해 33개, 별도 DB의 `npm run test:integration`으로 33개를 통과했다. 새 회귀는 [크롤러 DB 테스트](../../../scripts/public-crawler.integration.test.mjs)에 있다.
- 빈 `hlog_seo_*` DB를 마이그레이션하고 같은 DB의 로컬 앱 서버와 `HLOG_SEO_HTTP_TEST=1`로 `npm run test:seo:http` 21개를 통과했다. 전체 lint·typecheck·production build를 통과했다. Next.js 16.4.3은 보안 권고로 첫 빌드를 종료했고 같은 명령으로 재실행했다.
