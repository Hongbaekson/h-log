# PRD: H-Log Personal Site and Automated Blog Platform

기준 문서:

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/implementation-roadmap.md`
- `plans/automated-blog-publishing-plan.md`

## 목표

H-Log는 손홍백의 개인 브랜딩 사이트이자 기술 블로그다. 블로그 방향은 기존 file-based MVP 계획을 종료하고 DB 기반 수동 발행 계약을 먼저 만든 뒤, 검증된 계약을 실제 PostgreSQL/API/worker runtime에 연결해 완전 자동 주제 수집, 조사, 작성, 검증, 발행이 가능한 플랫폼으로 확장하는 것으로 정리한다.

핵심 메시지는 아래와 같다.

```text
백엔드 개발자 손홍백입니다
Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고, 운영하기 쉬운 구조를 고민합니다.
```

## 사용자

- 방문자: 손홍백의 경력, 포트폴리오, 기술 글을 확인하는 채용 담당자, 동료 개발자, 잠재 협업자.
- 운영자: 글감 수집, 기술 맥락 매핑, 발행 검증, 배포 상태를 관리하는 손홍백 본인.
- 자동화 worker: 주제 수집, 출처 요약, 글 생성, 품질 게이트, 검색/SEO 후처리를 수행하는 내부 시스템.

## 제품 범위

### H-01: 개인 사이트 기본 표면

반드시 포함한다.

- `/`
- `/resume`
- `/portfolio`
- `/portfolio/[slug]`
- `/blog`
- `/blog/[slug]`
- 한국어 UI copy
- 공개 가능한 경력/프로젝트/기술 스택 정리
- 민감정보 노출 방지
- 승인되지 않은 조직 식별자·내부 흐름 일반화와 근거 기반 정량 성과
- dark-only 출시 theme, 공개 GitHub, 비공개 이메일, Contact form 제외
- SEO 기본값: metadata, sitemap, robots, canonical, JSON-LD
- OCI Docker Compose + Nginx 배포 준비

H-01에서 제외한다.

- 로그인
- 댓글
- 조회수
- 방문자 RAG 챗봇
- 자동 글 작성/자동 발행

### H-03: 공개 읽기와 사례 연결 개선 계획

2026-10-01 사용자 요청에 따라 [공개 경험 개선 계획](PUBLIC_EXPERIENCE_PLAN.md)을 등록했다. Markdown 기본 읽기 → 목차/코드 도구/관련 글 → 검색/홈 연결 → 포트폴리오 근거 → 수정 이력/시리즈 → 작은 Queue/DLQ 실험 순서로 한 step씩 구현한다. 이 계획의 6개 phase/19개 step은 2026-10-22 로컬 구현·검수를 완료했다. 실제 글 발행과 운영 활성화는 별도다.

- Discord dark-only 스타일과 현재 레이더의 데이터·축·형태·동작·배치·주변 영역을 보존한다.
- 공개 글은 계속 published-current 데이터만 사용하고 richer Markdown은 typed React 요소와 허용 목록으로 확장한다.
- Phase 1 Steps 0-3 완료: 빈 줄이 있는 fenced code, 안전한 본문 링크, 시작 번호를 보존하는 순서/비순서 목록과 중첩 인용문, 비교 표를 지원한다. 외부 링크에는 새 창 안내와 키보드 focus를 제공하며 위험한 주소는 링크로 만들지 않는다. 목록/인용문 안에서도 문단·제목·코드 경계와 접근성 구조를 유지한다. 표는 열 제목·정렬·빈 셀·escaped pipe를 보존하며 모바일과 키보드에서 표 영역 안으로 가로 스크롤을 제한한다.
- Phase 2 Step 0 완료: 본문의 H2/H3를 데스크톱 고정 목차와 모바일 접이식 목차로 연결한다. 한글·중복 제목의 고유 주소, 직접 hash 접근/새로고침, 고정 헤더 여백과 키보드 초점 이동을 지원한다. 인용문/목록 제목은 직접 링크만 제공하고 목차에서 제외한다. 참고 출처와 Markdown 원문 링크는 본문 하단에 둔다.
- Phase 2 Step 1 완료: 코드 블록의 언어 표시와 복사 버튼을 제공한다. 화면에 보이는 코드의 공백·빈 줄을 그대로 복사하고 진행/성공/실패를 한국어로 안내한다. 키보드 초점과 코드 내부 가로 스크롤을 유지하며 복사가 실패하면 직접 선택해 복사할 수 있다.
- Phase 2 Step 2 완료: 상세 하단에 공통 태그가 있는 관련 글을 최대 3개 표시하고 공통 태그를 추천 이유로 안내한다. 발행 순서상 이전·다음 공개 글로 이동할 수 있다. 관련 글이 없으면 해당 영역을 생략하며 양 끝에는 존재하는 방향만 표시한다. 비공개·철회·유효한 현재 버전이 없는 글은 제외하고 DB 실패는 오류 화면으로 처리한다.
- Phase 3 Step 0 완료: 검색어·태그·페이지를 `q/tag/page` URL로 공유하고 직접 열기·새로고침·뒤로/앞으로 이동에서 복원한다. 검색과 일반 글은 한 목록 영역을 사용한다. 검색 결과는 태그로 필터링한 뒤 6개씩 나누고 전체 결과 수와 제목·요약·태그의 일치 정보를 표시한다. 입력 중인 글자는 제출된 결과를 바꾸지 않으며 이전 요청의 늦은 성공/실패를 무시한다. 빈 결과·검색 제한·조회 오류를 구분하고 검색·필터 초기화를 제공한다.
- Phase 3 Step 1 완료: 목록 소개를 짧게 줄이고 검색 → 주제 필터 → 글 순서로 배치한다. 공개 글 수가 많은 태그 4개와 선택한 태그를 먼저 보여 주고 나머지는 펼쳐서 볼 수 있다. 태그 숫자는 검색 결과 수가 아닌 전체 공개 글 수임을 안내한다. 명시적으로 선정한 대표 글이 없어 별도 강조 영역은 두지 않는다.
- Phase 3 Step 2 완료: 홈의 기존 소개·레이더·대표 사례·일하는 방식 아래에 최근 공개 글 최대 3개를 발행일순으로 표시한다. 현재 버전의 제목·요약과 발행일·글 유형, 상세/전체 글 링크를 제공한다. 0건이면 섹션을 생략하고 조회 실패는 최근 글 영역의 안내·재시도로 구분한다. 조회가 늦거나 실패해도 기존 홈 소개와 레이더는 표시한다.
- 시리즈는 실제 관련 공개 글이 모인 뒤 도입하고 가상 실험은 실제 성과와 구분한다.
- Phase 3 Step 3 완료 (2026-10-19): 푸터와 블로그 소개에서 기존 RSS 피드를 열고, 홈의 일하는 방식 3개 설명에서 관련 공개 프로젝트로 이동할 수 있다. 같은 창 링크와 키보드 초점을 제공하며 구독 DB·이메일 수집은 추가하지 않았다. Phase 3의 모든 step을 완료했다.
- Phase 4 Step 0 완료 (2026-10-19): 포트폴리오를 대표 1개·보조 2개와 간결한 경력 목록으로 구성했다. 목록에는 제목·역할·첫 핵심 결과를 표시하고 공개 프로젝트 9개, 상세 경로와 원문·성과 수치는 유지한다. 1440/390/320px·키보드·긴 텍스트를 검증했으며 다음은 `portfolio-evidence-experience / Step 1: decision-and-evidence-detail`이다.
- 기존 OCI 보류 및 실제 provider/공개 발행/timer 승인 경계는 유지한다.
- Phase 4 Step 1 완료 (2026-10-20): 첫 AI 사례에 구현 흐름도와 성과의 근거·적용 범위·기록의 한계를 추가했다. 기록이 없는 대안 비교는 생략하고 기존 성과 수치를 유지했다. Focused 16/16, unit 215 pass/13 DB skip, lint/typecheck/build와 1440/390/320px·키보드·긴 텍스트·기존 상세·JavaScript 없는 읽기를 검증했다. 다음은 `portfolio-evidence-experience / Step 2: project-post-connections`다.

- 2026-10-20 Phase 4 Step 2 완료: 프로젝트↔글의 명시적 연결과 공개 판정을 공유하고 H-Log 자체 사례를 추가했다. 현재 공개 버전만 양쪽에서 연결하며 DB 지연·실패는 관련 글 영역에 한정한다. 기존 9개 사례·Home/레이더와 저장 원문/hash를 유지했다. Focused 55/55, unit 219 pass/13 DB skip, public-read integration 1/1, lint/typecheck/build와 1440/390/320px 검수를 통과했다. Phase 4 전체 완료로 **다음은 `editorial-trust-and-series / Step 0: visible-verification-and-revisions`**다. 실제 글 발행은 하지 않았다.

- 2026-10-20 Phase 5 Step 0 완료: 현재 공개 버전에 작성자가 선별한 검증 방법·날짜·범위·한계와 수정 기록을 선택적으로 저장·표시한다. 수집일·운영 갱신일·비공개 버전에서 근거를 추정하지 않는다. Migration 005와 전체 격리 통합 테스트 15/15, focused 61/61, unit 222 pass/14 DB skip, lint/typecheck/build와 PC·모바일 검수를 통과했다. **다음은 `editorial-trust-and-series / Step 1: ordered-series`**다. 운영 migration과 실제 발행은 수행하지 않았다.

- 2026-10-21 Phase 5 Step 1 준비 확인: 관련 원고 3편이 준비되지 않아 시리즈 구현은 blocked다. [첫 시리즈 준비 기록](BLOG_SERIES_READINESS.md)에 비공개 초안 2편과 검수용 복사본/합성 글을 구분하고 H-Log 시리즈의 기존 후보 1편·미작성 2편을 기록했다. 다음은 시리즈 UI와 독립적인 Step 2의 사례 초안 검토이며 이후 Step 1로 돌아간다. 구현 재개에 필요한 것은 공개 가능한 원고 3편이며 운영 선발행은 필요하지 않다. 실제 공개 화면에서는 기존 published-current 경계를 유지한다.

- 2026-10-21 Phase 5 Step 2 완료: 기존 H-Log 사례 원고에 기록된 선택 이유·현재의 대안 분석·실행 시점·한계를 구분하고 claim 11개를 검토했다. [검수 기록](BLOG_CASE_STUDY_REVIEW.md)에 공개 글 테스트 44/44, 원고 파싱·privacy·문체 보호 항목과 기존 자료 보존 결과를 남겼다. 다음은 Step 1의 미작성 원고 2편 준비이며, 시리즈 기능과 실제 발행은 아직 완료하지 않았다.

- 2026-10-21 Phase 5 Step 1 원고 준비 완료: 공개 현재 버전 조회와 검증·수정 날짜 원고를 추가해 관련 글 3편을 준비했다. [원고 검수 결과](BLOG_SERIES_MANUSCRIPT_REVIEW.md)에 신규 주장 18개·산문 교정 4곳·단위 61/61·격리 통합 7/7과 읽기 순서·구현 대상 slug를 남겼다. 콘텐츠 부족 사유를 해제해 Step 1은 pending이며 다음은 시리즈 기능 구현이다. 첫 글의 본문/hash·기존 자료 시각을 보존했고 실제 발행은 하지 않았다.

- 2026-10-22 Phase 5 Step 1 완료: 명시적인 시리즈 순서를 기존 공개 글에 연결했다. 기본 목록 첫 페이지와 상세의 접이식 목록·현재 편·시리즈 이전/다음을 제공한다. 비공개/철회 글을 제외하고 원래 편 번호·canonical·원문/hash를 유지한다. Focused 47/47, unit 225 pass/14 DB skip, public-read integration 1/1, lint/typecheck/build와 1440/390/320px·키보드·긴 글·빈 시리즈·JavaScript 없는 이동·DB 오류 검증을 통과했다. 실제 원고는 비공개로 유지했다. **Phase 5 전체 완료, 다음은 `backend-operations-lab / Step 0: deterministic-queue-replay`**다. 공개 경험은 **17/19개 step 완료, 0개 blocked, 2개 pending**이다.

- 2026-10-22 Phase 6 Step 0 완료: `/lab/queue`에서 가상 작업 6개의 Queue → 실패 → DLQ → 원인 해결 후 재처리를 재생한다. Worker 1~3개·실패 조건 3개와 재생/일시정지/한 단계/초기화, 처리 기록을 제공한다. Focused 2/2, unit 227 pass/14 DB skip, lint·typecheck·build와 1440/390/320px·키보드·설정 9조합·reduced motion·JavaScript 없는 초기 표시·DB 연결 실패 상태의 운영 모드 검증을 통과했다. **공개 경험 18/19개 step 완료, 0개 blocked, 1개 pending**이며 다음은 **`backend-operations-lab / Step 1: lab-case-study-connection`**이다. 실험의 숫자는 실제 프로젝트 성과가 아니며 DB·실제 Queue·외부 실행을 연결하지 않는다.

- 2026-10-22 Phase 6 Step 1 완료: Queue 실험의 동시성·네트워크·영속성·재처리 한계를 설명하고 Redisson/DLQ 사례와 양방향으로 연결했다. 사례의 기존 공개 글 판정을 재사용하고 sitemap에 실험 경로를 추가했다. **공개 경험 개선 6개 phase / 19개 step 전체 완료**이며, 다음은 **`operations-observability / Step 0: monitoring-contract-and-budget`**다. 실제 발행·OCI 적용·모니터링 구현 완료를 뜻하지 않는다. 검증: focused 51/51, unit 227 pass/14 DB skip, public-read integration 1/1, lint·typecheck·build와 세 화면 폭의 왕복·공개 경계·DB 오류 격리. 기존 no-JS Blog 목록의 로딩 제약은 별도 후속으로 남겼다.

### H-04: 개인 Second Brain

2026-10-06 사용자 요청으로 [Second Brain 계획](SECOND_BRAIN_PLAN.md)을 등록했다. `/brain`과 개별 기억의 `/brain/[slug]`를 독립 메뉴로 제공하고, 개인 소개·공개 경력 및 허용된 코드 조사에서 일반화한 기술 노드를 연결한다. 확인한 경험, 구현 기반 정리, 재구성한 회고와 검토 질문을 구분한다. 회사 원문·내부 식별자와 추측한 감정/성과는 공개하지 않는다.

초기 카탈로그의 그래프·목록·검색·상세에 이어 2026-10-07 foundation Step 3에서 소유자 전용 `/admin/brain` 작성 화면과 PostgreSQL 저장을 구현했다(ADR-022). 저장한 원문과 수정 이력은 비공개로 보존한다. 공개용 제목·요약·본문을 따로 작성하고 확인해야 공개되며, 수정만으로 공개 사본이 바뀌지 않는다. 이 기능은 서버 설정으로 명시적으로 켠 환경에서만 사용할 수 있고, 현재 검증 범위는 격리된 로컬 DB다. 사건 시점·이후 회고·새 메모 연결은 Step 4다. 현재 구현 여부는 `second-brain-foundation`과 `second-brain-memory-interface` 레지스트리를 따른다.

2026-10-15 사용자가 최종 UI 기준을 공개 `careerhackeralex.com/memory`로 확정했다. Memory-interface Step 3에서 REA와 실제 화면 측정으로 로컬 HTML 기준(ADR-021/030)을 대체했다(ADR-031). 현재 `/brain`은 260px 밝은 sidebar·상단 검색·연결 기반 3D 별자리와 밝은 평면 배치·480px hover preview·560px 전체 높이 본문을 사용한다. 모바일은 전체 화면 본문과 필터 dialog, 목록 대체 탐색을 제공한다. 방문자 챗봇·자동 기억 생성/발행은 제외한다. 다른 경로의 Discord 스타일과 Home 레이더 전체, 기존 Blog DB 계약과 운영 보류는 유지한다.

H-04 완료 (2026-10-07): foundation Steps 0–5와 memory-interface Steps 0–1을 완료했다. Step 4에서 사건 날짜를 모르면 비워 두고 공개 여부를 따로 고르도록 했다. 이후 회고는 새 기록으로 작성하고 이전 생각에 연결하며, 원문과 수정 이력은 보존한다. 소유자 검색과 날짜 정렬, 공개 목록의 날짜 정렬 및 이전/이후 생각 탐색을 제공한다. Step 5는 ADR-023의 로컬 규칙으로 관련 기록·중복 가능성·태그 후보와 이유를 보여 준다. 선택은 초안만 바꾸며 원문 수정·저장·공개를 자동으로 하지 않는다. 외부 AI와 운영 적용은 포함하지 않는다.

### H-05: 기술 글 문체와 읽기 화면 개선 계획

2026-10-15 토스 기술 블로그 분석을 [3개 phase / 7개 step](BLOG_EDITORIAL_READING_PLAN.md)으로 등록했다. T1에서 [한국어 작성 가이드](BLOG_WRITING_GUIDE.md)·비공개 기술 초안 2개, 기존 writer의 정적 문체 규칙, 초안 교정과 로컬 작성 계약 검증을 완료했다. 산문 3곳의 교정과 Redis 조건 1곳의 사실 수정을 분리했고 기존 테스트 39/39·모의 writer 시나리오 5/5를 확인했다. T2 Step 0은 일반 목록·검색 결과의 공통 행, 두 줄 요약과 별도 메타정보를 적용하고 1440/390/320px 및 검색 회귀를 검증했다. 2026-10-16 T2 Step 1은 명시적으로 지정한 자산의 현재 버전/content hash·파일 SHA-256 검증, 목록/검색 공통 반응형 썸네일과 실패 시 텍스트 유지 동작을 격리 합성 이미지로 검증했다. 같은 날 T3 Step 0은 최대 736px·17px/32px 본문과 제목·코드·표·그림 여백을 실제 검수 초안 2개와 합성 글의 1440/390/320px 화면에서 확인했다. Step 1에서 최종 교정본의 목록→본문 통합 검수와 오류 재시도 수정을 마쳤고 기존 읽기 기능·원문/hash·공개 경계를 유지했다. [검수 기록](BLOG_READING_REVIEW.md)에 완료 범위와 발행 준비를 구분했으며 7개 step은 모두 완료다. 후속 `blog-discovery-and-home / Step 3`와 포트폴리오 목록 정리는 2026-10-19, 상세 근거 보강은 2026-10-20 완료했다. 프로젝트↔글 연결과 공개 검증·수정 기록 표시까지 완료했다. 2026-10-21 Step 2의 사례 검토와 Step 1의 나머지 원고 2편 준비를 마쳤다. 관련 원고 3편을 준비한 뒤 2026-10-22 `editorial-trust-and-series / Step 1`의 시리즈 기능 구현·검증까지 완료했다. 후속 Queue 실험과 사례 연결까지 2026-10-22 완료했으며 다음은 `operations-observability / Step 0`이다. 실물 이미지 적용과 실제 모델의 생성 문체 평가는 아직 수행하지 않았다.

- 목록·검색 결과는 제목·요약·날짜를 중심으로 맞추고 검증된 자산이 있을 때만 썸네일을 표시한다. 검색/모바일 태그 필터와 URL 상태를 유지한다.
- 본문은 기존 목차·코드 복사·표·출처·관련 글을 유지하면서 폭·글자·여백을 실제 초안으로 확인한다. Discord 팔레트와 Home/레이더, Second Brain을 변경하지 않는다.
- 문체 교정은 사실·수치·코드·출처를 보존하고 실제 경험과 자료 분석을 구분한다. writer의 no-tool/단일 호출 및 claim/privacy/quality gate를 유지하며 별도 LLM 교정 서비스나 persona learning을 추가하지 않는다.
- 수정 이력·시리즈는 기존 H-03 계획을 재사용한다. 이 계획의 완료는 초안과 로컬 기능 검증을 뜻하며 운영 글 삭제·배포·발행·timer 활성화를 포함하지 않는다.

### H-06: 단일 소유자 통합 관리자

2026-10-22 사용자 요청으로 [통합 관리자 계획](ADMIN_CONSOLE_PLAN.md)을 4개 phase / 17개 step으로 등록했다. 2026-10-26 A1 Steps 0–3의 [접근·명령 계약](ADMIN_ACCESS_CONTRACT.md), 공통 인증·관리자 개요/탐색·Queue 비공개 이동·Brain 명령 통합을 완료했다. **다음은 `admin-resume-pdf / Step 0`의 저장·공개 계약**이다. A2의 블로그 검토/버전 명령·초안 생성·자동화 허용, A3의 실제 작업/감사·재시도/중지·모니터링·운영 검증은 후속 단계다.

- 기존 Next.js `/admin`을 사용하고 운영 시 `admin.<선택 도메인>`으로 진입점을 분리한다. 공개 host는 관리자 경로를 차단하며 인증·정확한 Host/Origin·데이터 접근 검사를 함께 적용한다. 새 앱/회원가입/다중 역할은 만들지 않는다.
- 공통 인증은 기존 Basic 소유자 키를 `HLOG_ADMIN_*`로 이전하고 Brain DB flag와 분리했다. 인증된 개요/Brain에서 미설정·저장소 오류를 구분하며 준비 중인 메뉴는 동작하지 않는다. 운영 초기 접근은 기존 SSH 터널 안의 HTTPS 관리자 진입점이 목표다. Brain 저장·공개·해제의 원자적 상태·중복·감사는 A1 Step 3에서 구현했다. 다른 관리자 명령과 새 작업 중지는 후속 step에서 구현한다.
- A1 Step 2에서 가상 Queue를 `/admin/lab/queue`로 이동했다. 기존 `/lab/queue`는 404이며 Portfolio 진입 영역과 sitemap 항목을 제거했다. 가상 계산/재생은 유지하고 실제 작업 제어와 연결하지 않는다. 이전 Phase 6 완료 기록은 당시 공개 구현 이력으로 보존한다.
- 기존 `/admin/brain`의 원문·이력·공개 사본을 유지하고 공통 관리자 탐색으로 편입했다. 요청 재전송의 중복 저장과 공개/해제 경합을 막으며 응답 유실 재확인·최근 변경 이력·정적 카탈로그 관리 구분을 제공한다. 공개 `/brain`의 UI·내용과 Home/레이더는 그대로다.
- 초안 생성과 자동 공개 발행을 별도로 허용하고 초기값은 OFF다. 웹·CLI·scheduler·worker에 동일한 지속 정책을 적용하며 서버 운영 허용 설정을 넘지 못한다. 이미 시작한 작업과 새 작업 중지를 구분한다.
- 실제 job/lease·감사·비용을 재사용하고 단건 재시도와 새 claim 일시정지만 제공한다. 웹에서 shell/systemctl/docker 실행과 무제한 재처리는 제외한다. 모니터링은 I-02의 기존 계획을 소비한다.
- 실제 admin 도메인·DNS/TLS·OCI 개방은 A3 Step 4의 blocked 범위다. 관리자 rollout과 실제 provider/발행/timer 활성화는 별도 승인·검증으로 다룬다.
- 추가 요청으로 A4 `admin-resume-pdf` 4개 step을 등록했다. 관리자에서 PDF를 비공개로 등록·전 페이지 미리보기하고 검토한 버전만 공개한다. 공개본이 있을 때 Resume에서 다운로드하며, 새 업로드만으로 기존 공개본이 바뀌지 않는다. 수정한 파일 교체·버전 메모·이전 버전 재선택·공개 해제를 제공하고 범용 PDF 본문 편집은 포함하지 않는다. 기존 공개 PDF/API의 제거 상태는 아직 그대로다.

### I-01: OCI self-hosted infrastructure

인프라와 클라우드는 OCI를 기본 운영 환경으로 둔다.

- 초기 production target은 OCI Compute 1대다.
- 앞으로 OCI 자원 관리는 Terraform을 기준으로 한다. 기존 자원은 재생성하지 않고 inventory, 코드화, 승인된 import와 no-change plan 순서로 편입한다. 다른 앱과 공유하는 인프라는 `infra/terraform/oci-shared/`의 독립 root/state 경계로 두고 H-Log 앱 및 backend bootstrap state와 분리한다. 실행 상태는 `terraform-infrastructure-adoption` phase에서 관리한다.
- Docker Compose로 Next.js web, blog worker, PostgreSQL + pgvector, Nginx를 관리한다.
- Nginx는 80/443 TLS 종료와 reverse proxy를 담당한다.
- PostgreSQL은 public internet에 노출하지 않는다.
- DB password, API key, SSH key, 서버 IP는 저장소에 커밋하지 않는다.
- 자동 발행 전에는 backup/restore, deploy smoke, rollback runbook이 있어야 한다.
- managed DB나 managed runtime으로 바꾸려면 별도 ADR을 추가한다.

### I-02: 운영 모니터링 계획

2026-10-06 사용자 요청으로 [operations-observability](OBSERVABILITY_PLAN.md)를 8개 step으로 등록했다. 수집 환경, 서버·DB·HTTP 상태, 지속적인 발행/비용·백업 신호, 대시보드/알림, 장애 검증과 승인된 운영 적용을 순서대로 진행한다. 현재 구현된 모니터링으로 간주하지 않는다.

- 자동 발행 미실행·실패·정체, 백업/복구 검증 지연과 수집 자체의 오류를 감지한다.
- 지표·대시보드는 비공개 운영 표면이며 콘텐츠·검색어·credential·내부 식별자를 노출하지 않는다. 기존 published-current/privacy와 비용 guard를 유지한다.
- Steps 0–6은 격리 로컬에서 진행하고 Step 7은 기존 OCI 보류로 blocked다. 외부 HTTP/heartbeat 감시를 포함한 운영 검증을 반복 발행 timer 활성화 전에 완료한다.
- 모니터링 완료에 실제 반복 발행을 요구하지 않는다. 비활성 상태를 구분한 뒤 timer 재개는 기존 자동 발행 phase에서 별도 승인으로 수행한다.
- 2026-10-22 관리자 통합 요청에 따라 A1 관리자 기반과 A4 이력서 PDF를 먼저 진행한 뒤 `operations-observability / Step 0`의 지표·권한·자원 예산을 확정한다. 로컬 Steps 1–6은 A3 모니터링 화면보다 먼저, 운영 Step 7은 관리자 rollout·timer보다 먼저 완료한다. 운영 적용 보류는 유지한다.

### H-02: 파일 기반 블로그 호환 이력

기존 Markdown/MDX loader는 live runtime, import command, fixture consumer 없이 전용 테스트에서만 사용돼 `runtime-contract-pruning / Step 0`에서 제거했다.

- 기존 Markdown/MDX 콘텐츠는 보존하며 파일 import workflow는 현재 제공하지 않는다.
- `/blog`와 `/blog/[slug]` public route의 source of truth는 DB 기반 `posts`와 `post_versions`다.
- file-based list/detail 구현 계획은 active phase registry에서 제거한다.

### A-01: DB 기반 수동 발행 블로그 계약

계약과 public route behavior는 완료됐다. 자동 글 작성보다 먼저 DB 기반 저장, 렌더링, 공개 경계를 코드 contract와 테스트로 고정했다.

- PostgreSQL 기반 `posts`, `post_versions`, `post_sources` 모델
- public route는 `status=published` 최신 버전만 노출
- Markdown/HTML 렌더링 저장
- sitemap/feed/llms.txt 생성 준비
- Blog 관리자 route/UI는 아직 없으며, Blog runtime은 PostgreSQL repository가 사용하는 retract와 `admin_actions` 원자적 감사 기록만 포함. 별도 Second Brain 작성 화면은 H-04를 따른다.

local runtime에서 완료된 항목:

- 실제 PostgreSQL schema와 migration runner
- DB repository와 production public route 연결
- manual `--once` persistent publish job worker
- fake provider 기반 local end-to-end dry-run

아직 완료로 보지 않는 runtime 항목:

- 실제 provider와 scheduler 활성화

### A-02: 발행 후 자동화 계약

- 청킹
- 임베딩
- 검색 인덱스
- 관련 글 추천
- sitemap/feed/llms.txt 갱신
- IndexNow 제출
- Discord 알림
- 실패 job 재시도

위 항목의 순수 contract, public crawler/search surface, persistent job 상태 저장은 완료됐지만, 실제 provider runtime 연결은 A-04 이후 승인 경계에서 수행한다.

현재 public `/api/search` runtime은 embedding provider가 연결되지 않은 keyword-only 경로다. 이 경로는 fake provider 호출이나 `usage_events` row를 만들지 않으며, real embedding adapter가 명시적으로 주입될 때만 기존 budget/usage contract를 사용한다. Short, abnormal, duplicate, rate-limited request는 PostgreSQL public store를 읽기 전에 차단하고, cache hit는 현재 published 상태를 다시 읽어 retracted post를 제거한다. 검색 UI의 결과 상태는 제출 당시 검색어를 표시하며, 이후 draft 편집이나 이전 요청의 늦은 응답이 최신 결과와 검색어를 덮어쓰지 않는다.

### A-03: 완전 자동 글 생성 계약

- GeekNews, 공식 release note, 기술 블로그, 보안/운영 소스 수집
- 원문 출처 확인
- `personal_context_ledger` 기반 홍백님의 기술 맥락 매핑
- `persona.md` 기반 문체 고정
- claim 단위 검증
- 자동 발행 품질 게이트
- 검증 실패 시 비공개 실패 상태 유지

Daily pipeline은 모든 research source의 `fetchedAt`이 `runAt` 이전 24시간 이내인지 먼저 검사한다(양 끝 포함). 만료·미래·잘못된 시각은 사용량 조회/기록, LLM, slug 조회와 저장 전에 오류로 종료하며 원래 입력값을 오류에 넣지 않는다. 이는 자료를 다시 수집/확인한 시각의 검증이며 기사 발행일, topic 수집 시각이나 개인 맥락의 최신성을 보장하지 않는다. 실제 수집기는 후속 작업이다. 정적 한국어 작성 규칙은 T1 Step 1에서 writer에 연결했으며 별도 교정 호출이나 persona feedback learning을 활성화하지 않는다.

현재 daily pipeline은 adapter 기반 contract다. Writer schema와 privacy/article quality gate를 통과한 normalized claim은 pipeline이 구성한 verified `postSources`를 기준으로 기존 `verifyArticleClaims`를 통과해야 하며, 실패하면 persistence 전에 비공개 `generation_failed`로 종료한다. 검증된 생성 결과만 선택적 persistence callback을 통해 `publishing` post와 queued required jobs로 넘기고 public worker 실행 전에 비공개 상태로 멈출 수 있다. PostgreSQL one-shot runner는 서울 날짜별 advisory lock과 기존 post 확인 후에만 Hermes `openai-codex`/`gpt-5.6-sol`을 호출하고 이 private aggregate를 저장한다. Required adapter는 `render`/`privacy_scan`을 공개 전에 처리하고 제한된 canary 전환 뒤 public URL/Markdown/sitemap/content hash를 검증하며 실패 canary를 `correction_pending`으로 숨긴다. Bounded cycle은 해당 daily post의 required job만 유한 횟수로 drain하고, 공식 Hermes image를 사용한 Compose service와 09:00 KST systemd timer를 packaging했다. OCI server-local credential/env/input, live migration, bounded Hermes canary와 audited rollback smoke까지 완료했다. 실제 HTTPS public origin과 privacy 목록이 없으므로 반복 timer와 실제 성과 신호 수집은 활성화하지 않는다.

Writer validation과 claim verification 실패는 `generation_failed` 상태를 유지하면서 선택적 `failure` field의 단계와 기존 redacted `gateName`/`message`만 one-shot operator JSON까지 전달한다. 이 결과는 새 DB 감사 이력이나 durable quality history가 아니다.

현재 DB table/column 구현 여부의 source of truth는 `migrations/*.sql`과 `lib/blog-postgres-repository.ts` query다. `post_generation_runs`를 포함해 migration과 persistence가 없는 모델은 장기 target이며, runtime 진실처럼 보이던 table/field registry와 caller-free generation-run factory는 `runtime-contract-pruning / Step 4`에서 제거했다.

Feedback Steps 0-2의 synthetic contract 이력은 남기되, live caller와 production persistence가 없던 persona, aggregate performance-signal, failure-pattern 모듈은 `auto-publish-code-pruning / Steps 4-6`에서 제거했다. 실제 production signal collection과 learning contract는 HTTPS public origin과 privacy/consent 설정 이후 runtime 요구에 맞춰 별도 설계한다.

### A-04: PostgreSQL/worker runtime 통합

다이어그램 삽입 계약을 완료한 뒤, contract-only 구현을 실제 local runtime의 한 vertical slice로 연결한다.

- PostgreSQL schema와 migration version
- blog repository와 DB-backed public read path
- manual `--once` persistent worker
- fake provider 기반 local end-to-end dry-run
- 운영 안정화 전에는 실제 외부 provider, cron, 공개 발행 비활성화
- OCI/provider/scheduler/public publish 활성화는 별도 사용자 승인 후 수행

## 성공 기준

- MVP 사이트는 `npm run lint`, `npm run test`, `npm run typecheck`, `npm run build`를 통과한다.
- 공개 페이지에는 전화번호, 생년월일, 내부 URL, 서버 IP, API key, 비공개 저장소명, 고객사 내부 업무 흐름이 노출되지 않는다.
- 공개 프로젝트 수는 실제 data source에서 계산하고, 상세 성과 수치는 근거 자료가 확인된 값만 사용한다.
- `/portfolio`를 canonical route로 사용하고 `/projects`는 308 영구 redirect로만 제공한다.
- Blog public route는 `status=published`인 최신 `post_version`만 노출한다.
- Public blog는 PostgreSQL source만 사용하며, 사용하지 않는 파일 기반 loader나 import compatibility wrapper를 유지하지 않는다.
- 자동 블로그 전환 시 failed generation, failed publish, failed verification 상태의 글은 공개 URL에 노출되지 않는다.
- "직접 해봤다"는 표현은 실제 실험/코드/명령/로그/운영 기록이 있는 경우에만 사용한다.
- GeekNews 같은 큐레이션 소스는 주제 발견 신호로만 쓰고, 기술 claim은 원문/공식 문서로 검증한다.
- 방문자 챗봇은 만들지 않는다.
- phase의 `completed`가 contract 완료인지 runtime 완료인지 summary에 명시한다.
- production 자동 발행 완료는 실제 PostgreSQL persistence, persistent worker, 승인된 canary, rollback smoke가 모두 확인된 경우에만 선언한다.
- 실제 성과 신호 수집/학습 계약은 production HTTPS origin과 privacy/consent 설정이 준비된 뒤 runtime 요구에 맞춰 설계한다.
- 도메인 컷오버 전 공개 콘텐츠 승인, PDF 개인정보 검수, 주요 화면 접근성·모바일 탐색성, 페이지별 metadata/canonical/JSON-LD와 전체 sitemap을 `public-site-quality-hardening` phase에서 검증한다.
- 실제 성과 신호 수집, persona 변경, scheduled production activation은 실제 HTTPS public origin이 준비된 뒤에만 수행한다.
- 반복 발행 timer 활성화 전 `operations-observability`의 운영 수집·알림·외부 감시 검증을 완료한다. 계획 등록이나 local smoke만으로 운영 완료를 선언하지 않는다.

## 구현 정책

- 구현 계획과 단계 실행은 Harness 구조를 따른다.
- production code 구현 또는 수정은 TDD를 기본으로 한다.
- phase 파일은 `apps/h-log/phases/` 아래에 둔다.
- 실행 순서는 `diagram-assets-automation -> blog-runtime-integration -> public-site-quality-hardening -> auto-publish-ops-hardening -> feedback-and-persona-learning` contract다. Feedback Steps 0-2의 이력 중 미연결 persona, performance-signal, failure-pattern contract는 pruning Steps 4-6에서 제거했으며, 공개 사이트 품질 게이트를 통과한 뒤 production signal collection/persona activation/timer 단계부터 실제 HTTPS public origin을 요구한다.
- 설계 변경이 생기면 `PRD.md`, `ADR.md`, `ARCHITECTURE.md` 중 관련 문서를 함께 갱신한다.
