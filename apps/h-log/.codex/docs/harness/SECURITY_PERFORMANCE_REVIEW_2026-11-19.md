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

## RAG 보완 계획

2026-11-19 커밋 `9a9b61b` 기준이다. 목표는 소유자가 고른 주제로 초안을 쓸 때 관련 근거를 찾아 **어느 버전의 어떤 구절로 썼는지** 확인할 수 있게 하는 것이다. 독자는 기존 글 검색을 사용하고, 작성기는 선별한 근거로 초안을 생성한다. 구현은 [RAG phase](../../../phases/grounded-article-retrieval/index.json)의 4개 step으로 등록했다. 모두 `pending`이다.

| 순서 | 확인한 차이 | 구현과 완료 기준 |
| --- | --- | --- |
| [0. 인용과 출처 대조](../../../phases/grounded-article-retrieval/step0.md) | 조사 묶음은 발췌·해시·확인 시각을 만든다. 일일 작성기는 출처 요약을 전달하고, 주장 검증기는 ID와 출처 역할을 받는다. 합성 공식 문서에서 인용 한 단어를 바꿔도 `verified`가 참이었다. | 같은 실행의 발췌와 인용을 대조한다. 출처가 바뀌거나 근거가 부족한 사실 주장은 공개 작업에 넘기지 않는다. 인용의 일치와 주장 내용의 타당성을 따로 검수한다. |
| [1. 주제로 근거 검색 후 작성](../../../phases/grounded-article-retrieval/step1.md) | 현재는 입력 파일의 `researchPackSources` 전체로 조사 묶음을 만든다. 작성할 질문과 맞는 구절을 선별해 전달하는 경로가 없다. | 주제와 작성 관점으로 후보 발췌를 검색하고 상위 근거만 한 번의 Hermes 호출에 보낸다. 같은 자료에서 질문만 바꾸면 근거가 달라져야 한다. 답할 근거가 없으면 모델 호출 전에 멈춘다. |
| [2. 공개 Blog·Brain 자료 연결](../../../phases/grounded-article-retrieval/step2.md) | h-log에는 공개 버전과 검수한 Brain 공개 사본을 읽는 경로가 있다. 이 자료를 초안 작성 중에 검색해 현재 공개 버전으로 연결하는 단계가 없다. | 과거의 관련 글과 노트를 내부 사례로 찾아 구절·링크·버전을 붙인다. 비공개 수정본과 철회한 자료가 후속 요청이나 늦게 도착한 생성 결과에서 다시 쓰이는 사례가 0건이어야 한다. |
| [3. 하이브리드 검색 비교와 채택](../../../phases/grounded-article-retrieval/step3.md) | 공개 검색에는 선택형 벡터 점수 계약이 있다. 운영 요청을 받는 route는 키워드로 검색하고, migration에는 vector 확장 선언만 있고 벡터 저장 열은 없다. | 같은 문서·질문·후보 수로 어휘 검색과 의미 검색을 비교한다. 따로 남긴 평가 질문의 개선, 인용 정확도, 지연·비용을 확인한 경로만 채택한다. |

**실행 순서.** 작성 경로는 Step 0부터 시작할 수 있다. [F4 Step 0](../../../phases/indexed-blog-search/step0.md)에서 공개 글의 한국어 검색 질문·복수 정답·자료 버전을 고정하고, [F4 Step 1](../../../phases/indexed-blog-search/step1.md)에서 캐시 적중·미적중의 조회 비용과 철회를 확인한다. Step 2는 F4의 조회를 재사용한다. [B1](../../../phases/runtime-db-privileges/step1.md)에는 Hermes 작성과 인증 확인에 전달되는 환경 변수의 범위를, [C0](../../../phases/ingress-request-efficiency/step0.md)에는 두 빌드 사이에서 브라우저가 받는 HTML·CSS·JS의 일치 검사를 추가했다. A0는 다음 이미지 빌드 전의 첫 보안 작업이다.

**비교 근거.** Zerry 작성자는 8월에 한국어 형태소와 IDF를 이용한 후보 검색으로 전환했다고 기록했다. 10월의 44문항 재정렬 실험에서는 새로 발행된 관련 글이 예전 정답표에서 빠져 있었다. h-log의 평가표에도 자료 버전·검토일·복수 정답을 둔다. 11월 19일 REA MCP로 본 공개 글 검색에서는 `pgvector`와 `복구` 모두 오류 안내가 표시되어 이 두 요청의 검색 순위는 미측정이다. [Zerry 검색 변경 기록](https://zerry.co.kr/blog/rag-chatbot-search-quality-improvement) · [정답표 재검토](https://zerry.co.kr/blog/rerank-stale-answer-key)

**공통 읽을 파일과 검증.** 각 RAG step에서는 앱 기준 `AGENTS.md`, `../../AGENTS.md`, `../../.codex/skills/harness/SKILL.md`, `../../.codex/skills/sync-repos/SKILL.md`와 [PRD](PRD.md), [ADR](ADR.md), [아키텍처](ARCHITECTURE.md), [워크플로](WORKFLOW.md), [실행 루프](AGENT_LOOP.md), [구현 계획](IMPLEMENTATION_PLAN.md), [개인정보 기준](../../rules/content-seo-privacy.md), [자동 발행 계획](../../../../../plans/automated-blog-publishing-plan.md)을 읽는다. 코드 변경은 `../../.codex/skills/tdd/SKILL.md`에 따라 가까운 회귀 테스트에서 RED·GREEN을 확인하고 앱의 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`로 마친다. DB 검증에는 기존 opt-in과 격리된 합성 DB를 사용한다. 실제 외부 provider 호출·운영 발행·timer는 기존 승인 범위를 따른다.

## 확인 범위와 보류 근거

관리자 인증의 정확한 Host/origin, 키 비교와 비공개 헤더, 공개 ingress의 관리자 경로 차단, 검색의 공개 재검사, PDF의 공개 세대·파일 무결성·동시 다운로드 상한을 소스와 기존 테스트에서 확인했다. 관리자 인증·정적 렌더링 보호·PDF 다운로드·검색 테스트 29개를 이번에 실행해 모두 통과했다. PDF HEAD에서도 본문 조회 비용이 있지만 공개 기능이 기본 OFF이고 기존 계약에는 손상된 바이트와 ETag의 검증이 있다. 공개 전환과 실제 요청 비중을 확인할 때 재평가한다.

이번 수집에는 OCI 실측, 운영 DB 권한·트래픽·로그, CDN 캐시 적중률, 실사용자 지연, 컨테이너 OS 전체 CVE 스캔이 포함되지 않는다. 모니터링·NGINX 패치에 이미 반영된 작업을 새 phase로 세지 않았다. 등록 시점에 보안·성능 A–C는 3개 phase·8개 step, 추가한 RAG는 1개 phase·4개 step이며 모두 `pending`이다. F4는 기존 성능 계획에서 집계한다.
