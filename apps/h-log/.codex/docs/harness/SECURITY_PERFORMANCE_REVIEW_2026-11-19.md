# H-Log 보안·성능 검토와 실행 순서

2026-11-19, 기준 커밋 `66c0548`과 작업 트리의 NGINX 1.30.7 변경을 검토했다. 아래 수치는 저장소의 기본 설정, 로컬 합성 실험 또는 출처를 명시한 기존 측정값이다. 이번 검토에서는 구현·배포를 진행하지 않았다.

## 보안과 배포에서 먼저 처리할 항목

| 순서 | 확인한 문제와 영향 | 실행 단위 |
| --- | --- | --- |
| 1 | **운영 설정이 Docker 빌드 입력에 들어갈 수 있다.** Git은 `deploy/env.production`, `deploy/postgres.env.production`, `compose.override.yaml`을 제외하지만 앱의 `.dockerignore`는 세 경로를 제외하지 않는다. 문서대로 파일을 놓은 디렉터리에서 빌드하면 `COPY . .`가 빌더로 복사한다. 현재 제외 규칙과 합성 파일만 넣은 `FROM scratch` 빌드에서 세 파일이 복사됐고 `private/` 대조군은 제외됐다. 기존 이미지·캐시의 비밀 유출 여부는 미확인이다. [Docker 제외 규칙](../../../.dockerignore) · [빌더와 runner](../../../Dockerfile) | [A0 빌드 입력](../../../phases/release-artifact-security/step0.md) |
| 2 | **Next.js 보안 수정이 밀려 있다.** manifest·lock·설치 트리 모두 16.4.3이다. 11월 19일 `npm audit --omit=dev --package-lock-only --json`은 패키지 1개(next), moderate 공지 2개(GHSA-mfr8-8qww-v76h, GHSA-vc7v-qv4w-wrv8), high/critical 0개를 반환했다. 두 공지 범위는 16.3.0–16.4.4이며 npm이 제시한 같은 minor 수정 후보는 16.4.6이다. 공식 16.4.5 릴리스의 수정 7개와 npm 집계 대상은 다르다. 앱 소스에서 두 공지의 `use cache`·`unstable_cache` 조합은 찾지 못했다. [공식 보안 릴리스](https://github.com/vercel/next.js/releases/tag/v16.4.5) | [A1 의존성 패치](../../../phases/release-artifact-security/step1.md) |
| 3 | **로컬 standalone에 배포 대상 밖 파일이 들어간다.** 현재 산출물에서 `private/` 파일 1개(2,966바이트), `phases/` 271개(1,114,578바이트)를 셌다. 19개 라우트의 NFT 파일 목록이 비공개 경로를 참조한다. 빌더는 썸네일의 동적 파일 접근에 전체 프로젝트 추적 경고를 냈다. 파일 내용은 조사하지 않았다. Docker는 `private/`를 빌드 입력에서 제외한다. 직접 빌드한 standalone을 배포·공유할 때 따로 생기는 위험이다. 이미지 포함이나 HTTP 공개는 확인하지 않았다. [썸네일 파일 검증](../../../lib/blog-thumbnails.ts) · [standalone 설정](../../../next.config.ts) | [A2 standalone 경계](../../../phases/release-artifact-security/step2.md) |
| 4 | **Compose 개발 기본값에서 앱 DB 계정과 초기화 계정이 같다.** web·worker·migrate가 runtime env를 공유하고, 기본 앱 DB 접속의 사용자와 암호가 Postgres 초기화 env와 일치했다. 값은 기록하지 않았다. 고정 pgvector 이미지와 새 데이터 디렉터리, 가짜 사용자로 `pg_roles`를 조회한 결과 `rolsuper`, `rolcreatedb`, `rolcreaterole`가 모두 참이었다. 실행 중인 앱이 이 기본값을 쓰면 앱 연결에도 클러스터 관리 권한이 생긴다. 운영 역할은 미확인이다. [공식 이미지의 초기 계정 설명](https://github.com/docker-library/docs/blob/master/postgres/content.md) | [B0 역할과 권한](../../../phases/runtime-db-privileges/step0.md) → [B1 서비스 연결](../../../phases/runtime-db-privileges/step1.md) |

A0는 다음 이미지 빌드 전에, A1은 A2의 기준 빌드 전에 처리한다. B0은 별도 로컬 DB에서 병행할 수 있다. 이미 생성된 운영 이미지에 비밀이 들어갔는지 판단하려면 해당 이미지와 빌드 경로를 승인된 범위에서 별도로 확인해야 한다.

## 요청 경로에서 확인한 개선점

| 순서 | 근거와 영향 | 실행 단위 |
| --- | --- | --- |
| 1 | NGINX 1.30.7에 저장소 공개 설정과 합성 upstream을 연결했다. 존재하는 정적 JS의 200과 없는 JS의 404에 똑같이 `public, max-age=31536000, immutable`이 붙었고, 두 응답에 서버 수준의 보안 헤더 4개가 빠졌다. 브라우저나 중간 캐시가 누락 응답을 장기간 재사용할 수 있다. 정적 location의 독자적인 `add_header … always`와 기본 헤더 상속 규칙이 원인이다. [NGINX 헤더 상속](https://nginx.org/en/docs/http/ngx_http_headers_module.html) | [C0 정적 응답](../../../phases/ingress-request-efficiency/step0.md) |
| 2 | 같은 이미지의 유효 설정에서 기본 access log에 원격 주소와 전체 요청 줄이 들어간다. 공개 프록시에 보낸 합성 검색어가 그대로 로그에 나타났다. 관리자 예시도 기본 포맷을 상속하지만 실제 관리자 로그는 열지 않았다. 모니터링 gateway에는 이미 `access_log off`가 있다. 공개 직전에 운영자가 필요로 하는 상태·응답시간과 보존량을 정하고, URL·검색어·주소·referrer 수집을 줄일 수 있다. [공개 프록시](../../../deploy/nginx/conf.d/hlog.conf) · [관리자 예시](../../../deploy/admin/admin.nginx.conf.example) | [C1 접근 로그](../../../phases/ingress-request-efficiency/step1.md) |
| 3 | web 컨테이너는 30초 간격으로 Node 프로세스를 띄워 홈을 GET한다. 홈의 `HomeRecentPosts`는 DB 목록을 읽고 실패를 자체 처리한다. 따라서 방문자가 없어도 페이지 렌더와 DB 조회가 발생할 수 있고, 홈의 200으로 DB 정상까지 판별할 수 없다. 30초 간격을 단순 환산하면 인스턴스당 하루 약 2,880회다. 실제 횟수·비용은 실행 시간과 재시작에 따라 달라진다. 기존 합성 1,000글·동시성 1에서 홈 전체 응답 p95는 source 278.20ms, projected 42.84ms였다. 이 값은 헬스체크 자체의 지연 측정값이 아니다. [Compose healthcheck](../../../compose.yaml) · [홈의 DB 호출](../../../components/blog/HomeRecentPosts.tsx) [기존 홈 측정](PUBLIC_BLOG_LIST_REVIEW.md) | [C2 경량 상태 확인](../../../phases/ingress-request-efficiency/step2.md) |

C0·C1·C2는 독립 실행할 수 있다. OCI 재배포, 관리자 ingress 공개, 운영 역할·비밀 교체, 실제 로그 열람은 기존 운영 절차에서 다룬다.

## 기존 성능 계획을 재사용할 부분

- **공개 검색은 기존 F4를 먼저 진행한다.** 현재 `app/api/search/route.ts`는 전체 공개 store 로더를 넘기고 `lib/blog-search.ts`는 캐시 적중 때도 이를 호출해 페이지를 재구성한다. 키워드 결과와 철회 즉시성, 한글 2자 검색을 유지하면서 쿼리 수·본문 행·p95를 비교할 단계가 이미 있다. [F4 검색 인덱스](../../../phases/indexed-blog-search/step0.md) · [F4 중복 조회 제거](../../../phases/indexed-blog-search/step1.md)
- **Brain은 데이터 크기에 따라 우선순위를 정한다.** 기존 합성 Node 측정에서 28개 노드 기본 배치는 11.96–13.74ms, 1,000개는 1,334.35–1,341.04ms였다. 실제 사용자 지연으로 일반화하지 않고 F5의 좌표 재사용부터 검증한다. [성능 기준선](PERFORMANCE_BASELINE_REVIEW.md) · [F5 첫 단계](../../../phases/brain-performance/step0.md)
- **기존 F6·F7**에 관리자 이력, 썸네일의 요청별 파일 읽기·해시, 공개 pool 대기 제한, 관측과 재생성 리허설이 있다. A2의 목표는 빌드에 포함되는 파일 경계다. 썸네일을 제공할 때 수행하는 무결성 검사는 F6에서 다룬다. 목록과 크롤러의 F3 구현은 완료 상태이고, source가 기본이다. [F6 자산 검증](../../../phases/owner-asset-performance/step2.md) · [F7 DB 대기](../../../phases/performance-observation-rehearsal/step0.md) · [전체 성능 계획](PERFORMANCE_REBUILD_PLAN.md)

## 확인 범위와 보류 근거

관리자 인증의 정확한 Host/origin, 키 비교와 비공개 헤더, 공개 ingress의 관리자 경로 차단, 검색의 공개 재검사, PDF의 공개 세대·파일 무결성·동시 다운로드 상한을 소스와 기존 테스트에서 확인했다. 관리자 인증·정적 렌더링 보호·PDF 다운로드·검색 테스트 29개를 이번에 실행해 모두 통과했다. PDF HEAD에서도 본문 조회 비용이 있지만 공개 기능이 기본 OFF이고 기존 계약에는 손상된 바이트와 ETag의 검증이 있다. 공개 전환과 실제 요청 비중을 확인할 때 재평가한다.

이번 수집에는 OCI 실측, 운영 DB 권한·트래픽·로그, CDN 캐시 적중률, 실사용자 지연, 컨테이너 OS 전체 CVE 스캔이 포함되지 않는다. 모니터링·NGINX 패치에 이미 반영된 작업을 새 phase로 세지 않았다. 신규 3개 phase의 8개 step은 계획 등록 시점에 모두 `pending`이다.
