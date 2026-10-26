# H-Log 공개 경험 개선 계획

기준일: 2026-10-01. 사용자는 zerry 비교 분석을 phase/step으로 나누고 다음 한 step을 구현·검증한 뒤 커밋·푸시하도록 요청했다. 실행 상태의 source of truth는 [phase registry](../../../phases/index.json)와 각 phase index다.

## 목표와 유지 조건

- 글을 발견하고 읽고 관련 프로젝트로 이동하는 흐름을 완성한다.
- 현재 Discord dark-only 디자인을 기준으로 화면의 정보 위계를 맞춘다.
- 레이더의 데이터, 축, 형태, 동작, 배치와 현재 주변 영역은 그대로 보존한다.
- PostgreSQL published-current 공개 경계, privacy 검사, Markdown/HTML/hash 무결성, 기존 URL과 crawler 출력 계약을 유지한다.
- 한 실행 cycle은 한 step으로 제한하며 전제 조건이 없는 후속 기능을 미리 구현하지 않는다.
- 기존 OCI 보류, DNS/TLS·운영 timer·실제 provider·공개 발행 승인 경계는 이 계획으로 해제하지 않는다.

## 비교 분석에서 가져올 것

| 관찰 | H-Log 개선 |
| --- | --- |
| 홈에서 최근 글과 프로젝트를 발견할 수 있음 | 소개/레이더 아래 최근 published 글 3개 연결 |
| 글 상세의 목차·코드 복사·관련 글 | Markdown 기본 읽기 뒤 탐색 기능 순서로 추가 |
| 프로젝트 상세의 문제·결정·결과와 화면/구조도 | 기존 승인된 사례의 근거·측정 조건을 더 잘 배치 |
| 실험 결과를 재생하는 화면 | 실제 backend 경험과 연결되는 가상 Queue/DLQ 실험 하나 |
| 과거 기술 소개와 이후 변경 기록에 시점 차이 | 수정 이유와 검증 범위 구분, 확인되지 않은 현재성 주장 금지 |

공개 UI 관찰과 작성자의 내부 구현 설명은 구분한다. zerry의 기술 조합이나 수치 자체를 복제하지 않는다. 참고: [홈](https://zerry.co.kr/), [블로그](https://zerry.co.kr/blog), [포트폴리오](https://zerry.co.kr/portfolio), [사례 상세](https://zerry.co.kr/portfolio/personal-blog), [기술 구성 변경 후기](https://zerry.co.kr/blog/db-restore-test-pgvector), [실험 화면](https://zerry.co.kr/arena).

## Phase / Step 실행 순서

| Phase | Step | 개선 사항 |
| --- | --- | --- |
| 1. [blog-reading-foundation](../../../phases/blog-reading-foundation/index.json) | 0 | 빈 줄·인접 문단이 있는 fenced code를 안전한 코드 블록으로 보존 |
| 1 | 1 | 안전한 본문 링크와 URL 허용 경계 |
| 1 | 2 | 의미 있는 순서/비순서 목록과 인용문 |
| 1 | 3 | 비교 표와 모바일 내부 스크롤 |
| 2. [blog-reading-navigation](../../../phases/blog-reading-navigation/index.json) | 0 | 제목 anchor, desktop 목차, mobile 접이식 목차 |
| 2 | 1 | 코드 언어와 복사, 접근 가능한 성공/실패 안내 |
| 2 | 2 | 관련 글·이전/다음 글과 published 경계 |
| 3. [blog-discovery-and-home](../../../phases/blog-discovery-and-home/index.json) | 0 | 검색 결과 통합과 URL 기반 q/tag/page 유지 |
| 3 | 1 | 간결한 필터·소개·목록 위계, 내부 상태 문구 정리 |
| 3 | 2 | 현재 홈/레이더 아래 최근 공개 글 최대 3개 |
| 3 | 3 | 기존 RSS 진입점과 일하는 방식의 실제 사례 연결 |
| 4. [portfolio-evidence-experience](../../../phases/portfolio-evidence-experience/index.json) | 0 | 대표 1개+보조 2개 위계, Discord 토큰 일관성 |
| 4 | 1 | 문제·대안·결정·결과와 공개 가능한 근거 |
| 4 | 2 | 프로젝트와 공개 글의 양방향 연결 |
| 5. [editorial-trust-and-series](../../../phases/editorial-trust-and-series/index.json) | 0 | 수정 이유·날짜·검증 범위의 정확한 공개 |
| 5 | 1 | 시리즈 순서·현재 편·공개 글 이전/다음 구현 완료 |
| 5 | 2 | 실제 근거를 갖춘 선택/AI 협업/재검증 기록 초안 하나 — H-Log 사례 검수 완료 |
| 6. [backend-operations-lab](../../../phases/backend-operations-lab/index.json) | 0 | deterministic Queue→실패→DLQ→재처리 재생 완료 |
| 6 | 1 | 가상 실험과 실제 프로젝트/글 연결 및 한계 설명 완료 |

각 step 파일에 읽을 파일, 작업 경계, 독립적인 완료 기준, 검증 command를 둔다. 후속 step은 이전 단계의 실제 파일과 결정을 다시 확인한다. 새 parser나 DB 필드가 필요하면 해당 단계에서 필요한 최소 변경만 결정한다.

## 이번 실행 단위

2026-10-22 후속 사용자 요청으로 [통합 관리자 계획](ADMIN_CONSOLE_PLAN.md)을 등록했다. 2026-10-23 A1 Steps 0–2에서 공통 인증·관리자 화면과 Queue 비공개 이동을 완료했다. 실험은 `/admin/lab/queue`에서만 제공하며 기존 공개 URL은 404, Portfolio 진입 영역과 sitemap 항목은 제거했다. 다음은 `admin-console-foundation / Step 3`이다. 아래 19개 step 완료는 당시 공개 경험 구현 이력이며 관리자 전환은 별도 phase다.

2026-10-22 Phase 6 Step 1 완료: Queue 실험의 동시성·네트워크·영속성·재처리 한계를 설명하고 Redisson/DLQ 사례와 양방향으로 연결했다. 사례의 기존 공개 글 판정을 재사용하고 sitemap에 실험 경로를 추가했다. **공개 경험 개선 6개 phase / 19개 step 전체 완료**이며, 다음은 **`operations-observability / Step 0: monitoring-contract-and-budget`**다. 실제 발행·OCI 적용·모니터링 구현 완료를 뜻하지 않는다.

[Step 1 검증 기록](../../../phases/backend-operations-lab/step1.md): focused 51/51, unit 227 pass/14 DB skip, public-read integration 1/1, lint·typecheck·build와 1440/390/320px 왕복·키보드·긴 글·비공개/철회·DB 오류 격리를 확인했다. 실험과 공개 사례 설명을 재사용했으며 원문/hash·기존 성과·Home/레이더·Second Brain을 변경하지 않았다.

## 이후 설계 원칙

### 읽기와 디자인

목록·상세는 차분한 본문과 간결한 구분선을 사용한다. 큰 display type과 gradient는 홈/대표 사례에 집중한다. 본문 폭 720~780px, 목차 약 220px, mobile 좌우 20~24px는 검증 시작값이며 실제 코드와 한글 내용으로 조정한다. 기존 Discord 팔레트를 우선하고 레이더 주변을 새 카드나 소개로 대체하지 않는다.

### 도메인과 콘텐츠

글 유형은 현재 다섯 article mode를 재사용하고, tag는 기술 분류, series는 읽기 순서, project relation은 구현 사례 또는 별도 문서 분석과의 관계를 명시한다. 문서 분석을 실제 프로젝트 적용 경험으로 표시하지 않는다. 개별 서비스를 추가하지 않는다. 수집 시각, 원문 발행일, 글 수정일, 직접 검증일을 같은 의미로 표시하지 않는다. 기존 `updatedAt`만으로 검증 완료 badge를 만들지 않는다.

### 별도 후속 작업

- 2026-10-22 추가 검수에서 JavaScript가 없는 기존 `/blog` 목록이 loading boundary의 안내에 머무는 현상을 확인했다. 실험↔프로젝트 링크와 글 직접 URL은 읽을 수 있다. 목록의 스트리밍/로딩 계약을 보존하면서 no-JS 탐색을 보완하는 작업은 이번 사례 연결과 분리해 남긴다.

  2026-10-26 [SEO 개선 계획](SEO_OPTIMIZATION_PLAN.md)의 S1 기준선과 [S2 Step 1](../../../phases/seo-public-surface-optimization/step1.md)이 이 후속 항목의 재현·최소 보완을 담당한다. 계획 등록이며 기존 결함을 해결한 것으로 표시하지 않는다. 레이더와 승인된 Brain UI, 기존 19개 step의 완료 이력은 유지한다.

- 2026-10-15 등록한 [기술 글 문체와 읽기 화면 개선](BLOG_EDITORIAL_READING_PLAN.md)의 T1~T3 / 7개 step은 2026-10-16 로컬 구현·검수를 완료했다. 이후 Phase 3 Step 3의 RSS·사례 연결과 Phase 4 Steps 0–2, Phase 5 Step 0까지 완료했다. 2026-10-21 Phase 5 Step 1의 콘텐츠 부족을 기록한 뒤 Step 2의 H-Log 사례 검토를 완료했다. 이후 원고 준비와 Phase 5를 완료했고 Phase 6 Step 0까지 검증했다. Phase 6 Step 1까지 완료했으며 기존 Phase 1~6의 번호·완료 이력은 유지한다. 다음은 운영 모니터링 Step 0이다.

- 2026-10-06 [운영 모니터링](OBSERVABILITY_PLAN.md)을 독립 phase/8개 step으로 등록했다. 기존 공개 경험 6개 phase/19개 step의 번호·실행 순서는 유지한다. 모니터링을 지정하면 해당 Step 0부터 로컬 진행할 수 있고 운영 적용은 OCI 보류를 따른다. 자동 발행 timer 재개 전 운영 모니터링 검증이 필요하다.

- 실제 source collection은 기존 자동화 계획의 별도 후속 범위다. 정적 한국어 문체의 writer 연결은 위 `blog-writing-quality / Step 1`에서 완료했고 feedback learning은 포함하지 않는다. 기존 freshness/claim/privacy gate를 대체하지 않는다.
- 편집 운영 화면은 preview/변경 비교/발행/철회 최소 범위로 남긴다. 인증 방식과 실제 운영 요구를 먼저 정하고 제거된 미연결 admin contract를 복원하지 않는다.
- 대표 인터넷 도메인 하나와 기존 `/`, `/resume`, `/portfolio`, `/blog` 경로를 유지한다. 시리즈/실험 경로는 기능과 콘텐츠가 준비될 때 추가하며 도메인 구매·DNS/TLS·배포는 기존 보류 phase를 따른다.
- 방문자 챗봇, 댓글, 세션 기억, 공개 조회수, 이메일 수집, AI 대결 서비스 복제는 이 계획에 포함하지 않는다.
- RSS/sitemap/Markdown/llms 출력은 이미 존재한다. 새 AI용 파일보다 원본 경험과 내부 연결을 우선한다. [Google AI 검색 안내](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

## 완료 기록

2026-10-01 Phase 1 / Step 0 완료: 코드 fence가 내부 빈 줄을 보존하도록 수정했다. RED 3개를 확인한 뒤 focused 27/27, unit 159 pass/12 DB skip, lint/typecheck/build, 1440/390/320px 개발 서버 검증을 통과했다. 저장 원문/hash와 private 404를 유지했다.

2026-10-01 Phase 1 / Step 1 완료: 안전한 HTTPS/내부 경로/fragment 링크, 중첩 강조와 코드 label, 위험한 주소 차단, 새 창 안내와 키보드 접근을 추가했다. RED 5개, focused 17/17, unit 164 pass/12 DB skip, lint/typecheck/build, 1440/390/320px 격리 DB 개발 서버 검증을 통과했다. 원문/해시·공개 경계·레이더·OCI 보류는 유지했다.

2026-10-06 Phase 1 / Step 2 완료: 번호 시작값, 여러 문단과 혼합 중첩 목록, 인용문과 코드 경계를 보존한다. Native 목록/인용 요소와 모바일 줄바꿈, 인용 제목 표시를 검증했다. Focused 21/21, unit 170 pass/12 DB skip, lint/typecheck/build와 1440/390/320px 격리 DB 개발 서버 검증을 통과했다. 원문/hash·공개 경계·레이더·OCI 보류는 유지했다.

2026-10-08 Phase 1 / Step 3 완료: 비교 표의 header/body·정렬·빈 셀·escaped pipe와 안전한 링크/코드 셀을 지원한다. 헤더만 있는 표와 중첩 표, 잘못된 표의 텍스트 fallback, 기존 task marker를 검증했다. Focused RED 3개와 브라우저 table 누락/모바일 넘침 RED 이후 focused 25/25, unit 196 pass/13 DB skip, lint/typecheck/build를 통과했다. 격리 DB의 1440/390/320px에서 native table/열 헤더, Tab/방향키 스크롤, 페이지 넘침 없음, raw Markdown 일치, private/missing 404와 빈 목록을 확인했다.

2026-10-08 Phase 2 / Step 0 완료: 한글/NFC·중복·숫자 suffix 제목에 고유 ID를 부여하고 최상위 H2/H3 목차와 제목별 링크를 추가했다. 출처/원문 링크를 본문 아래로 이동했다. RED 3개와 브라우저 목차 누락/sticky 실패 이후 focused 28/28, unit 199 pass/13 DB skip, lint/typecheck/build를 통과했다. 격리 DB의 1440/390/320px에서 목차 19개, 모바일 접기/펼치기, 제목 초점과 Tab 이동, 직접 hash/새로고침/헤더 여백, 긴 목차 내부 스크롤과 페이지 넘침 없음, 짧은 글 목차 생략, 원문 일치와 private/missing 404를 확인했다. Home의 스크롤 설정도 유지했다.

2026-10-12 Phase 2 / Step 1 완료: 코드 언어의 안전한 label과 Clipboard 복사, 진행/성공/실패 안내를 추가했다. RED 3개와 복사 버튼 누락/초점 유실 이후 parser 31/31, UI contract 4/4, unit 202 pass/13 DB skip, lint/typecheck/build를 통과했다. 1440/390/320px 격리 DB 화면에서 Clipboard stub으로 6개 코드의 입력 문자열 일치, 실패/미지원/대기 중 중복 방지/재시도를 검증했다. 키보드 초점·가로 스크롤·페이지 넘침 없음, JavaScript 없이 본문 읽기, 원문 일치와 private/missing 404도 확인했다.

2026-10-12 Phase 2 / Step 2 완료: 공통 태그를 표시하는 관련 글 최대 3개와 발행일/slug 기준 이전·다음 링크를 추가했다. RED 3개와 브라우저 영역 누락 이후 focused public/search 49/49, unit 205 pass/13 DB skip, lint/typecheck/build, 격리 public-read integration 1/1을 통과했다. 1440/390/320px의 긴 제목·키보드·이동/뒤로 가기, 관련 글 0개와 한 방향만 있는 상태, private/retracted/privacy/missing 404, JavaScript 없는 링크, 원문 일치를 확인했다. 로컬 후보 철회/current-version 제거 후 링크가 사라졌으며 별도 production 서버의 DB 실패는 기존 오류·재시도로 처리했다.

2026-10-13 Phase 3 / Step 0 완료: URL 기반 q/tag/page 탐색, 검색/일반 목록 통합, 태그 필터 후 6개 pagination, 읽을 수 있는 일치 설명과 초기화를 추가했다. RED API/UI/브라우저 실패 이후 focused search/UI 20/20, discovery UI 6/6, unit 207 pass/13 DB skip, lint/typecheck/build와 public-read integration 1/1을 통과했다. 1440/390/320px에서 직접 URL/새로고침/뒤로·앞으로, 조건 유지·초기화·빈/제한/오류·긴 제목·초점을 검증하고 제어한 지연 응답으로 draft 분리와 취소·재시도를 확인했다.

2026-10-14 Phase 3 / Step 1 완료: 큰 소개와 개발 상태 패널을 짧은 소개로 바꾸고 검색·주요/선택 태그·글을 한 열로 배치했다. 나머지 태그는 native details로 펼친다. 320px 검색 위치 RED 708px → GREEN 235px, 많은 태그 fixture의 첫 글 제목 577px을 확인했다. Focused 44/44, unit 207 pass/13 DB skip, lint/typecheck/build와 1440/390/320px 키보드·공개 개수·선택/긴/없는 태그·태그/글 없음·가로 넘침·URL/history·검색 빈/제한/오류·경합 회귀 검증을 통과했다.

2026-10-15 Phase 3 / Step 2 완료: 홈의 기존 section 뒤에 최신 published-current 글 최대 3개의 제목·요약·발행일·글 유형과 이동 링크를 추가했다. 영역 누락 RED→GREEN, 기존 selector characterization 포함 focused 35/35, unit 209 pass/13 DB skip, public-read integration 1/1, lint/typecheck/build를 통과했다. 격리 DB 개발 서버 1440/390/320px에서 긴 제목·키보드·링크·철회 반영·0건 생략·비공개404와 변경 전후 소개/레이더 geometry·SVG 일치를 확인했다. DB lock 지연 중 홈 선전송, 별도 local production 서버의 연결 실패 안내·재시도·홈 HTTP 200도 검증했다.

2026-10-21 Phase 5 / Step 1 준비 확인: 관련 원고 3편 미충족으로 구현은 blocked이며 [준비 조건과 구성안](BLOG_SERIES_READINESS.md)을 기록했다. 다음 실행은 Step 2의 기존 사례 초안 검토이며 이후 Step 1로 돌아간다.

2026-10-21 Phase 5 / Step 2 완료: 기존 H-Log 초안의 문제·대안·선택 이유·검증 시점·한계를 검토했다. claim 11개, 공개 글 테스트 44/44, 사실 보완 뒤 Korean 교정과 보호 항목·원고 파싱/privacy/비공개 경계를 확인했다. 새 원고는 로컬 비공개로 보관했다.

2026-10-21 Phase 5 / Step 1 원고 준비 완료: 나머지 2편의 주장 18개와 문체를 검수해 관련 원고 3편·시리즈명·소개·순서·구현 대상 slug를 준비했다. 단위 61/61, 격리 통합 7/7과 원고 파싱/hash·privacy·보호 항목을 확인했다. 콘텐츠 부족 사유를 해제했으며 시리즈 기능은 아직 구현하지 않았다.

2026-10-22 Phase 5 Step 1 완료: 명시적인 시리즈 순서를 기존 공개 글에 연결했다. 기본 목록 첫 페이지와 상세의 접이식 목록·현재 편·시리즈 이전/다음을 제공한다. 비공개/철회 글을 제외하고 원래 편 번호·canonical·원문/hash를 유지한다. Focused 47/47, unit 225 pass/14 DB skip, public-read integration 1/1, lint/typecheck/build와 1440/390/320px·키보드·긴 글·빈 시리즈·JavaScript 없는 이동·DB 오류 검증을 통과했다. 실제 원고는 비공개로 유지했다. **Phase 5 전체 완료, 다음은 `backend-operations-lab / Step 0: deterministic-queue-replay`**다. 공개 경험은 **17/19개 step 완료, 0개 blocked, 2개 pending**이다. 실제 발행·운영 활성화는 별도로 남아 있다.

2026-10-22 Phase 6 Step 0 완료: `/lab/queue`에서 가상 작업 6개의 Queue → 실패 → DLQ → 원인 해결 후 재처리를 재생한다. Worker 1~3개·실패 조건 3개와 재생/일시정지/한 단계/초기화, 처리 기록을 제공한다. Focused 2/2, unit 227 pass/14 DB skip, lint·typecheck·build와 1440/390/320px·키보드·설정 9조합·reduced motion·JavaScript 없는 초기 표시·DB 연결 실패 상태의 운영 모드 검증을 통과했다. **공개 경험 18/19개 step 완료, 0개 blocked, 1개 pending**이며 다음은 **`backend-operations-lab / Step 1: lab-case-study-connection`**이다. 실제 발행·운영 활성화는 별도로 남아 있다.

2026-10-22 Phase 6 Step 1 완료: Queue 실험의 동시성·네트워크·영속성·재처리 한계를 설명하고 Redisson/DLQ 사례와 양방향으로 연결했다. 사례의 기존 공개 글 판정을 재사용하고 sitemap에 실험 경로를 추가했다. **공개 경험 개선 6개 phase / 19개 step 전체 완료**이며, 다음은 **`operations-observability / Step 0: monitoring-contract-and-budget`**다. 실제 발행·OCI 적용·모니터링 구현 완료를 뜻하지 않는다.
