# H-Log 기록·탐색 개선 계획

등록일: 2026-11-05. Zerry/Memory 재조사 후 사용자가 개선 방향의 phase/step 등록과 커밋·푸시를 요청했다. **R1–R5: 5개 phase / 14개 step, 모두 pending**이다. 계획 등록을 기능 구현이나 콘텐츠 발행 완료로 표시하지 않는다. 상태의 source of truth는 [전체 레지스트리](../../../phases/index.json)와 각 phase index다.

## 목적과 유지 조건

현재 화면에서 검증 가능한 경험과 판단을 더 잘 찾고, admin에서 같은 수준의 기록을 계속 작성하도록 한다. Portfolio는 문제와 역할, Blog는 선택·재현·검증, Brain은 다시 사용할 기준·질문·후속 회고를 맡는다. 같은 본문을 세 화면에 복제하지 않는다.

- 승인된 Second Brain UI는 유지한다. sidebar·canvas·노드 모양·다섯 배치·검색/필터·reader 배치를 변경하지 않는다. 기존 출처·질문 영역에 검수한 데이터를 채우는 일과 admin 입력 확장은 가능하다.
- Home 레이더의 데이터·형태·동작·주변 배치를 유지한다. 다른 공개 페이지는 현재 Discord dark-only 스타일을 따른다.
- 기존 public selector, published-current/privacy, Brain의 원문/수정 이력/공개 사본, owner 인증·Origin·명령 revision·감사 계약을 재사용한다.
- 실제 경험·코드 관찰·재구성한 회고·열린 질문을 구분한다. 회사 Wiki import나 추측한 감정/날짜/성과 작성은 포함하지 않는다.
- 새 도메인, 방문자 AI/기억, 댓글, 공개 조회수, 별도 임베딩 지도, 임의 코드 실행, 외부 수집/예약 작업은 포함하지 않는다.

## 조사 근거와 한계

2026-11-05 REA MCP의 공개 DOM/접근성·스크린샷·배포 JS 정적 분석과 별도 브라우저의 본문 탐색을 사용했다. 서버 소스·DB나 로그인 후 기능을 확인했다는 뜻은 아니다. 타인의 본문·이미지·코드를 H-Log에 복사하지 않는다.

| 참조 | 확인 범위와 관찰 | 계획 연결 |
| --- | --- | --- |
| [Zerry](https://zerry.co.kr/), [글](https://zerry.co.kr/blog), [프로젝트](https://zerry.co.kr/portfolio) | 상위 5개·보조 2개 페이지, 글 목록 14쪽/132편, 태그 322개 인덱스, 프로젝트 상세 9개와 대표 글 16편 본문. 모든 글 본문/개별 태그 결과를 전수 검증한 것은 아님 | R2 사례·현재성, R3 읽기 경로 |
| [메모리 관찰](https://zerry.co.kr/blog/nextjs-memory-rss-and-heap), [사전 보강 회귀](https://zerry.co.kr/blog/garu-dictionary-expansion-regression) | 측정 조건·실패한 대안·적용 한계를 본문에서 설명. 원 실험을 재실행하지 않음 | R2 근거 중심 원고 |
| [태그](https://zerry.co.kr/blog/tags) | 대소문자·띄어쓰기 동의어가 분산됨. H-Log 사전은 실제 자료를 확인해 별도로 선정 | R4 대표 표기·기존 필터 연결 |
| [지식 우주 후기](https://zerry.co.kr/blog/knowledge-universe-embedding-star-chart) | 예전 소개의 임베딩 설명과 후속 제거 기록이 공존. 현재 서버 구현을 단정하지 않음 | R2 현재/과거 주장 분리, R5 재검토 |
| [Career Hacker Memory](https://www.careerhackeralex.com/memory) | 당시 436개 노드/2,040개 연결 표시, 본문 8개와 주장 29개 연결/묶음 11개 연결 확인. 저자·출처 구분과 편집된 읽기 출발점 | R1 출처·질문, R2 기준 노드/회고, R3 연결 |

Zerry 검색·모바일 후반 검수는 로딩 지연으로 완료하지 못했고 Memory 로그인 후 질문·모바일·전체 본문도 미확인이다. 이 조사로 검색 품질이나 성능 수치를 주장하지 않는다.

REA 증거: Zerry 목록 화면 `ev_415dd46d84d55f469a014f1492db3a32e80e0bf43c22284324d10ca984bc0183`, 사전 보강 본문 `ev_0737ee3e0d584165cae4bfb48369e9e483f4fc795115b643c49e3817a0e21267`; Memory 홈 `ev_a812ff8022050ad06eecde4493f679e09ae19707897150aba8c68f917421a531`, 외부 자료 표시 `ev_5cdfd5413a644dc7acbfeb3a684ad128a47ee8717261e7adcc6164937ea57b93`. 원자료는 Git/Docker 제외 `private/reference-zerry-2026-11-05/`, `private/reference-memory-2026-11-05/`에 있다. 없어도 이 계획과 현재 코드로 실행 범위를 확인할 수 있으며 원자료를 앱에서 import하지 않는다.

## 현재 구현과 실제 차이

기준 앱 commit: `6063988`. 다음 표는 현재 구현이며 아래 R 단계는 후속 계획이다.

| 근거 | 이미 구현한 것 | 이번 개선 |
| --- | --- | --- |
| `lib/brain.ts`, `BrainNote`, `BrainExplorer` | 공개 출처·질문 표시, 검색·목록·관계·독립 상세, S2 Step 5 기본 발견 | 공개 UI 유지 |
| `lib/brain-capture.ts` | 원문/공개 사본과 관계/날짜. 초안에 sources/questions 없음; 공개 변환은 고정 출처·빈 질문 | R1 admin 작성과 사본 보존 |
| `brain-curation`, `brain-suggestions`, `BrainCapture` | 후속 회고·revises·제목/태그 기반 후보 | R2 실제 기록 채우기; 기존 기능 재구현 금지 |
| `lib/brain-catalog.ts` | 정적 28개 노드/42개 연결. 경험 1개·사건일 0개·revises 0개 | 운영 DB 전체 통계가 아님. 확인된 사례/날짜만 보강 |
| `blog-series`, `portfolio-posts`, `blog-editorial` | 시리즈·프로젝트 연결·검증 범위·수정 기록 | R2/R3 내용과 현재성 정리 |
| `brain.ts` 내부 출처 allowlist | Resume/Portfolio 중심. Blog 상세의 현재 공개 연결 계약 없음 | R3 공개 selector 기반 출처 연결 |
| `blog-public`, `blog-search`, `blog-search-ui` | 목록·검색·필터·개수·URL 복원, 태그 표기 정리는 trim 수준 | R4 작은 별칭 사전·동일 결과 집합 |
| `BlogPostRow`, Blog 상세, `BlogContent` | 태그 배지, 목차와 고유 heading # anchor, 코드 복사 | R4 태그 탐색·주소 복사만 보완 |
| admin Brain | 검색·정렬·회고 가능 | R5 버전에 묶인 수동 검토와 다시 찾기 |

## Phase / Step

| Phase | Step | 작업 | 상태 |
| --- | --- | --- | --- |
| R1 [brain-provenance-authoring](../../../phases/brain-provenance-authoring/index.json) | 0 | [공개용 출처·질문 계약](../../../phases/brain-provenance-authoring/step0.md) | pending |
| R1 [brain-provenance-authoring](../../../phases/brain-provenance-authoring/index.json) | 1 | [비공개 저장과 공개 사본](../../../phases/brain-provenance-authoring/step1.md) | pending |
| R1 [brain-provenance-authoring](../../../phases/brain-provenance-authoring/index.json) | 2 | [관리자 출처·질문 입력과 미리보기](../../../phases/brain-provenance-authoring/step2.md) | pending |
| R2 [evidence-content-curation](../../../phases/evidence-content-curation/index.json) | 0 | [현재 주장과 근거의 연결 대장](../../../phases/evidence-content-curation/step0.md) | pending |
| R2 [evidence-content-curation](../../../phases/evidence-content-curation/index.json) | 1 | [재현 근거가 있는 기술 글 한 편](../../../phases/evidence-content-curation/step1.md) | pending |
| R2 [evidence-content-curation](../../../phases/evidence-content-curation/index.json) | 2 | [기준 노드와 후속 회고 후보](../../../phases/evidence-content-curation/step2.md) | pending |
| R3 [public-knowledge-connections](../../../phases/public-knowledge-connections/index.json) | 0 | [현재 공개된 글을 Brain 출처로 연결](../../../phases/public-knowledge-connections/step0.md) | pending |
| R3 [public-knowledge-connections](../../../phases/public-knowledge-connections/index.json) | 1 | [한 사례를 잇는 편집된 읽기 경로](../../../phases/public-knowledge-connections/step1.md) | pending |
| R4 [blog-tag-and-link-polish](../../../phases/blog-tag-and-link-polish/index.json) | 0 | [태그 대표 표기와 별칭](../../../phases/blog-tag-and-link-polish/step0.md) | pending |
| R4 [blog-tag-and-link-polish](../../../phases/blog-tag-and-link-polish/index.json) | 1 | [기존 태그 배지를 탐색 링크로](../../../phases/blog-tag-and-link-polish/step1.md) | pending |
| R4 [blog-tag-and-link-polish](../../../phases/blog-tag-and-link-polish/index.json) | 2 | [글·소제목 주소 복사](../../../phases/blog-tag-and-link-polish/step2.md) | pending |
| R5 [knowledge-review-workflow](../../../phases/knowledge-review-workflow/index.json) | 0 | [재검토 대상과 확인 기록 계약](../../../phases/knowledge-review-workflow/step0.md) | pending |
| R5 [knowledge-review-workflow](../../../phases/knowledge-review-workflow/index.json) | 1 | [소유자 재검토 목록](../../../phases/knowledge-review-workflow/step1.md) | pending |
| R5 [knowledge-review-workflow](../../../phases/knowledge-review-workflow/index.json) | 2 | [연결·공개 경계 로컬 통합 검수](../../../phases/knowledge-review-workflow/step2.md) | pending |

## 실행 순서와 다른 트랙

1. 2026-11-05 기존 SEO S3 Step 0의 [로컬 SEO 릴리스 검수](SEO_RELEASE_REVIEW.md)를 완료했다. 새 R 트랙의 구현을 완료했다는 뜻은 아니다.
2. **다음 로컬 작업은 R1 Step 0 `provenance-contract`**다. 기본 순서는 R1 → R2 → R3 → R4 → R5다.
3. R2 자료 정리와 R4는 R1 구현/개인 경험 확인에 기술적으로 종속되지 않는다. 필요한 자료가 없을 때 독립 작업을 진행할 수 있으며 실행한 step과 순서 변경 이유를 기록한다. R3는 R1의 출처 계약과 R2의 검수 후보를 사용한다.
4. R5의 로컬 통합 검수는 새 트랙의 추가 회귀다. S3 Step 0의 기존 SEO 기준선을 취소하거나 완료된 단계를 다시 pending으로 만들지 않는다.
5. S3 Step 1/2의 실제 도메인·계정·측정 조건은 그대로다. **운영 모니터링 Step 7 → 관리자 A3 Step 4 → timer** 순서와 OCI 보류를 유지한다. R 트랙은 운영 보류 해제를 기다리지 않고 격리 로컬에서 준비할 수 있다.

새 14개 step을 더해 전체는 53개 phase / 187개 step이다. S3 Step 0 완료 후 SEO는 9 completed/1 pending/1 blocked다. 관리자 A 16/0/1, 모니터링 7/0/1의 상태는 바꾸지 않는다. R1/R5의 admin 후속은 별도 R 트랙이며 기존 A 트랙을 다시 열지 않는다.

## R1 계약: 구현 전 확정할 항목

- 최소 공개 필드: 출처 제목·선택 URL, 남겨 둘 질문. 선택적 입력과 이전 레코드 읽기 호환을 기본으로 한다. 구체적인 상한/오류/정규화는 R1 Step 0에서 현재 API 제한과 함께 확정한다.
- 초안 저장은 공개 사본을 바꾸지 않는다. 선택한 공개 버전 안에만 필드를 고정하며 원문·기존 이력은 보존한다.
- 기존 외부 URL validator와 내부 경로 허용을 재사용한다. 내부 Blog 연결의 공개 상태·철회 처리는 R3에서 명시적으로 확장한다. 비공개 제목/slug·로컬 경로·관리자 URL을 공개 응답에 싣지 않는다.
- 공개 renderer 두 곳은 기존 출처·질문 영역을 사용한다. 입력 UI는 admin만 확장한다. schema/table 변경은 필요성이 확인된 최소 범위로 제한하고 새 서비스는 추가하지 않는다.

## R2/R3 콘텐츠 완료와 공개의 구분

기본 산출물은 근거 대장, 기술 글 한 편의 검토본, 관련 Brain 기록 2~3개의 후보와 기존 기준 노드의 읽기 순서다. 이미 검수한 원고는 재사용한다. 사례의 역할은 Portfolio=문제/역할, Blog=선택/검증, Brain=판단/질문으로 나눈다.

근거 없는 경험을 만들지 않는다. 본인 확인이 필요한 항목은 구체적인 확인 질문과 함께 회고 초안으로 둔다. 확인할 수 있는 사례가 전혀 없으면 해당 콘텐츠 step은 완료하지 않고 필요한 자료를 기록한다. 계획 등록은 새 원고의 운영 공개를 승인하는 행위가 아니며 이전 승인은 승인된 자료 범위에 적용한다.

후보 준비·격리 검수·공개 적용을 따로 기록한다. 실제 공개 글이 없는 상태를 데모 글이나 빈 주제 페이지로 채우지 않는다. 태그 결과의 noindex 정책은 유지하고, 주제 길잡이는 기존 시리즈/본문/출처로 시작한다.

## R5 계약: 구현 전 확정할 항목

열린 질문·연결 없는 메모·작성자가 재확인을 지정한 근거를 수동으로 모은다. 검토 대상 revision/hash와 실제 확인 시각·결과를 구분하고 새 버전에는 이전 확인을 승계하지 않는다. 미검토/누락을 완료로 표시하지 않는다. 공개 editorial 날짜·원문·발행 상태는 검토 클릭으로 바뀌지 않는다.

저장 위치와 읽기 상한·동시 명령·감사/복구는 R5 Step 0에서 기존 repository 계약에 맞춰 정한다. 자동 만료 판정·알림·외부 AI·스케줄러는 추가하지 않는다. 시리즈/길잡이 전용 admin CMS는 실제 반복 편집 부담이 확인될 때 별도 검토한다.

## 공통 검증과 완료 판정

- 문서/JSON: 파싱, phase/step 수·상태·경로·상대 링크·중복 등록 검사와 `git diff --check`.
- Production 변경: focused RED의 예상 실패 → GREEN → 최소 정리, `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`. 기존 private helper lint 오류는 새 회귀와 분리해 보고한다.
- DB/repository/API: 별도 합성 DB에서 기존 Brain/public-read integration과 관련 HTTP; 인증/Origin·충돌·중복 명령·감사 실패·이전 자료·미선택 수정·철회·no-store.
- UI: 개발 서버와 production build의 1440/390/320px·키보드·JS ON/OFF·새 탭/뒤로가기. Brain 승인 UI와 Home 레이더 유지.
- 콘텐츠: claim 근거·현재성·원문/hash·수치/명령/출처 보존, 확인되지 않은 개인 경험 구분. 타인의 문장/이미지/코드를 복제하지 않음.
- 마지막 로컬 검수: 출처 연결의 공개 상태와 철회, 태그 결과/개수, 공유 URL, 검토 버전 경계를 실제 응답으로 확인. 검색 순위·AI 인용·실사용 성능 개선은 별도 측정 없이 주장하지 않음.

## 계획 등록 검증 — 2026-11-05

문서/JSON 30개만 추가·동기화했다. Markdown 24개 파싱, 전체 phase/index JSON 54개 파싱, 상대 링크 183개와 step 읽을 경로 295개를 검사했다. 전체 53개 phase/187개 step과 신규 5개/14개 pending, 기존 SEO/A/모니터링 상태 보존을 확인했고 git diff --check를 통과했다. 앱 소스·콘텐츠·schema·배포 설정·공개 상태 변경은 0건이다. 문서 작업이므로 앱 build·브라우저 검증은 실행하지 않았다. 검사기와 결과는 Git 제외 private/reference-plan-2026-11-05/에 보관한다.
