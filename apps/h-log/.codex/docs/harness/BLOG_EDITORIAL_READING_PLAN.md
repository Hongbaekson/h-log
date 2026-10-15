# H-Log 기술 글 문체와 읽기 화면 개선 계획

기준일: 2026-10-15. 토스 기술 블로그 분석을 바탕으로 3개 phase / 7개 step을 등록했다. **T1 Steps 0–2와 T2 Step 0을 완료했고 나머지 3개 step은 pending**이다. 실행 상태는 [전체 registry](../../../phases/index.json)와 각 phase index를 따른다.

## 목표와 범위

- 실제 기술 글의 문제·판단·근거를 자연스러운 한국어로 전달한다.
- 목록에서 제목·요약·날짜를 빠르게 비교하고 긴 본문을 편하게 읽게 한다.
- Blog의 Discord dark-only 팔레트, 검색과 모바일 필터, 목차·코드 복사·표·출처·관련 글을 유지한다.
- Home/레이더 전체와 Second Brain은 수정 범위에서 제외한다.
- 현재 DB-backed published-current/privacy, 원문·버전·hash, 기존 URL·crawler 계약을 유지한다.
- 이번 계획은 운영 배포, 실제 provider 호출, 자동 발행·timer 활성화나 테스트 DB 글 삭제를 실행하지 않는다. 기존 OCI 보류를 따른다.

## 관찰과 적용 판단

2026-10-15 REA로 공개 DOM·JavaScript와 화면을 확인하고 1440/390/320px에서 비교했다. 서버 소스는 조사하지 않았으며 아래 수치는 관찰 당시의 값이다. 토스의 문장·이미지·브랜드 자산을 H-Log 콘텐츠로 가져오지 않는다.

| 확인한 화면 | 관찰 | H-Log 적용 판단 |
| --- | --- | --- |
| [Engineering 목록](https://toss.tech/category/engineering) | 단순한 행, 제목·두 줄 요약, 선택적 썸네일 | 제목과 요약을 우선하고 이미지가 없는 글도 자연스럽게 표시 |
| 같은 목록 | 제목 약 20px/모바일 19px, 요약 약 17px | H-Log 제목 22~24px/모바일 19~20px, 요약 16~17px부터 실제 글로 검증 |
| 같은 목록 | 데스크톱 직무 필터, 관찰한 모바일 화면에서는 필터 숨김 | 개인 블로그의 기존 검색과 compact topic filters를 유지 |
| [지정 본문](https://toss.tech/article/spark-connect-on-kubernetes-2) | 약 700px 읽기 폭, 17px 본문, 설명과 이어지는 도표 | 본문 700~760px·17px을 시작값으로 검토하고 기존 목차와 조화 |
| 같은 본문 | 문제·제약·시도·실패 이유·확인 결과·남은 한계를 연결 | 글 유형에 따라 구조를 고르고 근거 없는 경험은 만들지 않음 |

위 수치는 고정 합격 기준이 아니다. 한글 긴 제목, 코드·표와 모바일 화면을 보고 결정한다. 본문의 기술적 주장은 재현하지 않았으며 문체와 설명 구조를 참고했다.

REA 근거:
- 목록 DOM: `ev_1a3664376e06da71ce1ed89c58b68f616e2b7e35bbf653597e4446d3228c7e29`
- 본문 DOM: `ev_0b5681927ed3d309518414b1342badaae6c1ae564993d2f2fe4f6911c0b142e1`
- 공개 bundle: `ev_4da71578ff4f0035ffac5b4fa3f11fa96c0ec6c3341286d90f8861f590526202` (45개 script 분석)
- 원본 캡처는 로컬 조사 자료이며 다음 세션의 필수 입력으로 삼지 않는다. UI 구현 시 필요한 화면만 다시 확인한다.

## 현재 코드와의 차이

- `lib/blog-hermes-article-provider.ts`의 writer prompt에 T1 Step 1에서 한국어 문체·다섯 글 유형의 전개·근거 보존 기준을 추가했다. 기존 검증 입력·출처·출력 형식 규칙과 단일 호출을 유지하며 실제 생성 문체 평가는 별도로 남아 있다.
- `hlog-persona-v1` 기록이나 `style_drift` 분류만으로 자연스러운 문체가 자동 검증된다고 보지 않는다.
- T2 Step 0에서 일반 목록과 검색 결과가 `BlogPostRow`를 공유하도록 맞췄다. 제목 24px/모바일 20px, 16px 두 줄 요약을 사용하며 날짜·글 유형/검색 일치 정보·태그를 분리한다. 기존 URL 기반 탐색은 유지한다.
- 본문은 안전한 Markdown, 목차·코드 복사·표·관련 글을 지원한다. 새 renderer를 만들지 않는다.
- 목록에 쓸 썸네일의 현재 공개 조회 계약은 구현 시 확인한다. 본문용 asset을 검증 없이 대표 이미지로 간주하지 않는다.

## Phase / Step

이 표의 T1~T3는 이번 추가 트랙의 번호다. 기존 공개 경험 Phase 1~6의 번호와 완료 이력을 바꾸지 않는다.

| Phase | Step | 개선 사항 | 완료 결과 |
| --- | --- | --- | --- |
| T1. [blog-writing-quality](../../../phases/blog-writing-quality/index.json) | [0](../../../phases/blog-writing-quality/step0.md) | 공개 가능한 근거로 기술 초안 2~3개와 한국어 문체 기준 준비 | 완료: 비공개 초안 2개·근거 대장·[작성 가이드](BLOG_WRITING_GUIDE.md) |
| T1 | [1](../../../phases/blog-writing-quality/step1.md) | 기존 writer에 문체·유형별 전개·근거 보존 기준 반영 | 완료: 기존 단일 호출에 정적 규칙 반영·provider 전달 및 gate 회귀 검증 |
| T1 | [2](../../../phases/blog-writing-quality/step2.md) | 초안 교정과 로컬 작성 흐름 검증 | 완료: 초안 2개·11개 claim 검토, 산문 3곳 교정, 사실 조건 1곳 보완, 로컬 5개 시나리오 검증 |
| T2. [blog-list-presentation](../../../phases/blog-list-presentation/index.json) | [0](../../../phases/blog-list-presentation/step0.md) | 일반 목록·검색 결과의 제목·요약·메타정보 위계 정리 | 완료: 공통 행·24/20px 제목·16px 두 줄 요약, 3개 폭과 검색/탐색 회귀 검증 |
| T2 | [1](../../../phases/blog-list-presentation/step1.md) | 검증된 자산이 있을 때만 선택적 썸네일 표시 | 이미지 유무가 섞여도 읽히는 반응형 목록 |
| T3. [blog-reading-polish](../../../phases/blog-reading-polish/index.json) | [0](../../../phases/blog-reading-polish/step0.md) | 본문 폭·글자·줄 간격·제목과 그림 여백 조정 | 기존 읽기 도구와 조화되는 상세 화면 |
| T3 | [1](../../../phases/blog-reading-polish/step1.md) | 준비한 실제 기술 초안으로 목록→본문 통합 검토 | 데스크톱·모바일 검수와 남은 발행 준비 항목 |

## 실행 순서와 기존 계획 연결

- 기존 공개 경험 트랙의 `blog-discovery-and-home / Step 3: rss-and-work-evidence-links`는 별도로 pending을 유지한다.
- 계획 등록 직후 이어가기 요청을 토스 트랙으로 진행해 **T1 Steps 0–2와 T2 Step 0을 완료**했다. 이 트랙의 다음은 **T2 Step 1: optional-verified-thumbnails**다. T1 → T2 → T3 순서로 한 cycle에 한 step을 진행한다.
- T1 Step 0의 근거 검토를 통과한 초안을 뒤의 문체·UI 확인에 재사용한다. 초안을 준비하지 못하면 원인을 기록하고 실제 경험을 만들어 채우지 않는다.
- `editorial-trust-and-series`의 수정 이력·시리즈 기능은 기존 phase에서만 구현한다. 그 Step 2는 이번 초안 중 적합한 사례를 재사용하되 당시 인수 기준을 다시 확인한다. 이번 초안 작성이 시리즈나 공개 발행 완료를 뜻하지 않는다.
- 완료된 `blog-reading-foundation/navigation`과 `blog-discovery-and-home`의 검색·필터를 재구현하지 않는다.
- 실제 source collection, production feedback learning, 모니터링과 배포는 각 기존 계획에서 계속 관리한다.

## 문체와 콘텐츠 기준

- 해요체를 중심으로 짧고 분명하게 설명하되 모든 문장을 같은 어미로 강제하지 않는다.
- 경험·실험 기록은 증상과 조건 → 단서·대안 → 선택 → 확인 결과 → 남은 한계를 연결한다.
- 문서 분석은 질문·판단 기준 → 출처 비교 → 적용 조건·미확인 부분으로 전개한다. 모든 글에 같은 목차를 강제하지 않는다.
- 직접 경험·측정 표현은 근거가 있는 경우에만 사용한다. 분석이나 예상 문제를 실제 장애·감정·성과로 바꾸지 않는다.
- `espada:humanize-korean`을 초안 교정에 사용하며 사실·수치·코드·출처·경험 범위를 보존한다. 실행 환경에 설치된 해당 SKILL.md를 읽고, 개인 PC의 설치 경로를 저장소 계약으로 만들지 않는다.
- runtime은 기존 writer의 짧은 규칙과 자체 문체 점검부터 사용한다. 별도 LLM 교정 호출, 문체 점수 서비스, persona learning DB를 이 계획에서 만들지 않는다.
- 문체 수정 후에도 기존 claim/privacy/quality 검증을 유지한다. prompt 테스트 통과를 실제 LLM 문체 품질 검증으로 보고하지 않는다.
- 실제 초안은 저장소의 `private/` 제외 규칙을 확인한 뒤 비공개 작업물로 준비한다. 커밋할 작성 가이드와 예문에는 공개 가능한 일반화된 내용만 넣는다.
- synthetic UI fixture는 로컬 테스트용으로 표시하고 실제 글·성과로 발행하지 않는다. 운영 테스트 글 정리는 DB와 콘텐츠 소유 범위를 확인하는 별도 배포 작업이다.

## 검증과 상태 기록

- 문서/콘텐츠만 바꾼 step은 Markdown/JSON 파싱, 링크·참조 경로, 공개 가능 내용 검토, `git diff --check`를 실행한다.
- production behavior를 바꾸면 가장 가까운 RED/GREEN 뒤 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다. DB/repository/migration 변경 시 격리 DB의 `npm run test:integration`을 추가한다.
- UI는 개발 서버의 1440/390/320px에서 키보드, 긴 제목/본문, 이미지 유무, 빈/오류 상태, 페이지 가로 넘침과 기존 검색·목차·복사 회귀를 확인한다.
- 각 step에 수정 파일, 실행 명령과 결과, 수동 문체/화면 검수 범위, 다음 step을 기록한다. 실제 완료된 step만 completed로 바꾼다.

## 완료 기록

2026-10-15 T2 Step 0: 일반 목록과 검색 결과의 제목·두 줄 요약·날짜·글 유형/검색 일치 정보·태그를 공통 행으로 맞췄다. 초안 2개의 제목·요약과 긴 텍스트용 가상 글을 격리 로컬 DB에서 확인했다. 브라우저 RED→GREEN, 1440/390/320px·키보드·검색 URL/history/pagination·빈/제한/오류/재시도 회귀, focused 45/45, 전체 210 pass/13 DB skip, lint/typecheck/build를 통과했다. Home/레이더·Second Brain·DB/API 계약과 운영 발행은 변경하지 않았다. 다음은 T2 Step 1의 검증된 선택적 썸네일이다.

2026-10-15 T1 Step 2: 비공개 초안 2개와 11개 claim을 다시 검토했다. Redis `NOACK`의 새 메시지 조건을 사실 검토에서 보완한 뒤 Korean 스킬로 산문 3곳을 다듬고 보호 항목과 의미를 비교했다. 기존 테스트 39/39와 두 초안·실패 경로를 사용한 모의 writer 시나리오 5/5를 통과했다. 실제 provider·DB·공개 발행은 호출하지 않았다. [작성 가이드](BLOG_WRITING_GUIDE.md)에 검수 요약·남은 질문을 남기고 H-Log 글을 기존 사례 단계의 후보로 연결했다. T1은 완료했으며 다음은 T2 Step 0이다.

2026-10-15 T1 Step 1: 기존 writer prompt에 한국어 문체·글 유형별 전개·근거 보존·자체 점검을 연결했다. 지침 누락 RED→GREEN, verified INPUT·source/block·단일 호출 계약과 관련 39/39 테스트, 전체 210 pass/13 DB skip, lint/typecheck/build가 통과했다. sandbox 빌드의 자식 프로세스 연결 오류는 같은 명령을 sandbox 밖에서 재실행해 해소했다. 외부 LLM 호출이나 실제 생성 문체 평가는 수행하지 않았다. 다음은 Step 2의 초안 교정과 로컬 작성 흐름 검토다.

2026-10-15 T1 Step 0: [한국어 작성 가이드](BLOG_WRITING_GUIDE.md)와 H-Log 최근 글 조회 경계/Redis Pub/Sub 판단 기준의 비공개 초안 2개를 준비했다. 구현 기록과 문서 분석을 구분하고 11개 claim의 근거·미확인 범위를 기록했다. Korean 스킬로 교정한 산문 10곳의 보호 항목과 의미를 비교했다. 기존 공개 글 테스트 35/35, Markdown/JSON/경로·Git/Docker 제외·diff 검사를 통과했다. 전체 초안은 Git과 공개 DB에 넣지 않았다. prompt 연결은 Step 1, 추가 교정과 로컬 작성 계약 검토는 Step 2에 남아 있다.
