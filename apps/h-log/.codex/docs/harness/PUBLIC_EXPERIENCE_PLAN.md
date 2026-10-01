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
| 5 | 1 | 관련 공개 글 3편 이상일 때 순서가 있는 시리즈 |
| 5 | 2 | 실제 근거를 갖춘 선택/AI 협업/재검증 기록 초안 하나 |
| 6. [backend-operations-lab](../../../phases/backend-operations-lab/index.json) | 0 | deterministic Queue→실패→DLQ→재처리 재생 |
| 6 | 1 | 가상 실험과 실제 프로젝트/글 연결 및 한계 설명 |

각 step 파일에 읽을 파일, 작업 경계, 독립적인 완료 기준, 검증 command를 둔다. 후속 step은 이전 단계의 실제 파일과 결정을 다시 확인한다. 새 parser나 DB 필드가 필요하면 해당 단계에서 필요한 최소 변경만 결정한다.

## 이번 실행 단위

[Phase 1 / Step 1](../../../phases/blog-reading-foundation/step1.md): 안전한 본문 링크를 typed React anchor로 표시하고 괄호/escape/code span·내부 URL·외부 링크 접근성 경계를 검증했다.

- 변경 파일: `apps/h-log/lib/blog-public.ts`, `lib/public-source-url.ts`, 대응 테스트, `app/blog/[slug]/page.tsx`, `package.json`, `package-lock.json`.
- Marked inline lexer를 고정 버전으로 추가하고 기존 Discord 팔레트로 본문 링크의 focus/밑줄/줄바꿈을 적용했다. 저장 content 생성/hash 알고리즘, migration, 레이더는 그대로다.
- 문서: 이 계획, 새 phase/step registry, PRD/ADR/ARCHITECTURE/IMPLEMENTATION_PLAN 중 관련 설명만 동기화한다.
- 성공 기준: focused RED/GREEN, 기존 unit 회귀, lint/typecheck/build, 격리 local DB를 사용한 개발 서버 desktop/mobile 렌더링, JSON/path parser, `git diff --check`.
- 커밋/푸시는 검증한 변경만 포함하고 일반 push를 사용한다.

## 이후 설계 원칙

### 읽기와 디자인

목록·상세는 차분한 본문과 간결한 구분선을 사용한다. 큰 display type과 gradient는 홈/대표 사례에 집중한다. 본문 폭 720~780px, 목차 약 220px, mobile 좌우 20~24px는 검증 시작값이며 실제 코드와 한글 내용으로 조정한다. 기존 Discord 팔레트를 우선하고 레이더 주변을 새 카드나 소개로 대체하지 않는다.

### 도메인과 콘텐츠

글 유형은 현재 다섯 article mode를 재사용하고, tag는 기술 분류, series는 읽기 순서, project relation은 실제 적용 사례를 연결한다. 개별 서비스를 추가하지 않는다. 수집 시각, 원문 발행일, 글 수정일, 직접 검증일을 같은 의미로 표시하지 않는다. 기존 `updatedAt`만으로 검증 완료 badge를 만들지 않는다.

### 별도 후속 작업

- 실제 source collection과 persona/humanize runtime 연결은 기존 자동화 계획의 별도 후속 범위다. 이번 공개 경험 계획이 freshness/claim/privacy gate를 대체하지 않는다.
- 편집 운영 화면은 preview/변경 비교/발행/철회 최소 범위로 남긴다. 인증 방식과 실제 운영 요구를 먼저 정하고 제거된 미연결 admin contract를 복원하지 않는다.
- 대표 인터넷 도메인 하나와 기존 `/`, `/resume`, `/portfolio`, `/blog` 경로를 유지한다. 시리즈/실험 경로는 기능과 콘텐츠가 준비될 때 추가하며 도메인 구매·DNS/TLS·배포는 기존 보류 phase를 따른다.
- 방문자 챗봇, 댓글, 세션 기억, 공개 조회수, 이메일 수집, AI 대결 서비스 복제는 이 계획에 포함하지 않는다.
- RSS/sitemap/Markdown/llms 출력은 이미 존재한다. 새 AI용 파일보다 원본 경험과 내부 연결을 우선한다. [Google AI 검색 안내](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

## 완료 기록

2026-10-01 Phase 1 / Step 0 완료: 코드 fence가 내부 빈 줄을 보존하도록 수정했다. RED 3개를 확인한 뒤 focused 27/27, unit 159 pass/12 DB skip, lint/typecheck/build, 1440/390/320px 개발 서버 검증을 통과했다. 저장 원문/hash와 private 404를 유지했다.

2026-10-01 Phase 1 / Step 1 완료: 안전한 HTTPS/내부 경로/fragment 링크, 중첩 강조와 코드 label, 위험한 주소 차단, 새 창 안내와 키보드 접근을 추가했다. RED 5개, focused 17/17, unit 164 pass/12 DB skip, lint/typecheck/build, 1440/390/320px 격리 DB 개발 서버 검증을 통과했다. 원문/해시·공개 경계·레이더·OCI 보류는 유지했다.

다음 단계는 [Phase 1 / Step 2: 목록과 인용문](../../../phases/blog-reading-foundation/step2.md)이다. 나머지 17개 step은 pending이며 계획 등록을 구현 완료로 간주하지 않는다. 설치 시 확인된 기존 의존성의 보안 경고는 [구현 계획의 별도 후속 조치](IMPLEMENTATION_PLAN.md)에 기록했다.
