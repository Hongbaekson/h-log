# H-Log 기록·탐색 개선 계획

등록일: 2026-11-05. Zerry/Memory 재조사 후 사용자가 개선 방향의 phase/step 등록과 커밋·푸시를 요청했다. **R1–R5: 5개 phase / 14개 step**이다. 2026-11-12 R5 Step 1까지 완료해 **completed 13·pending 1**이다. R1의 계약·저장·관리자 입력, R2의 [근거 대장](CURRENT_CLAIMS_INVENTORY.md)·[원고 검수](EVIDENCE_CASE_MANUSCRIPT_REVIEW.md)·[기록 후보](BRAIN_PRINCIPLE_DRAFT_REVIEW.md)를 준비했으며 [현재 공개 출처 연결](PUBLISHED_BRAIN_SOURCE_REVIEW.md)도 구현했다. [편집된 읽기 경로](CURATED_READING_PATH_REVIEW.md)의 준비·격리 검수도 완료했으며 [태그 대표 표기와 별칭](BLOG_TAG_ALIAS_REVIEW.md)도 적용했다. [태그 배지 탐색](BLOG_TAG_NAVIGATION_REVIEW.md)과 [글·소제목 주소 복사](BLOG_LINK_COPY_REVIEW.md)까지 구현했다. [R5 수동 재검토 계약](#r5-manual-review-contract)에 따른 [관리자 목록·버전별 확인](BRAIN_MANUAL_REVIEW_REVIEW.md)을 구현했다. 다음은 R5 Step 2의 로컬 통합 검수다. 계획 등록을 기능 구현이나 콘텐츠 발행 완료로 표시하지 않는다. 상태의 source of truth는 [전체 레지스트리](../../../phases/index.json)와 각 phase index다.

## 목적과 유지 조건

현재 화면에서 검증 가능한 경험과 판단을 더 잘 찾고, admin에서 같은 수준의 기록을 계속 작성하도록 한다. Portfolio는 문제와 역할, Blog는 선택·재현·검증, Brain은 다시 사용할 기준·질문·후속 회고를 맡는다. 같은 본문을 세 화면에 복제하지 않는다.

- 승인된 Second Brain UI는 유지한다. sidebar·canvas·노드 모양·다섯 배치·검색/필터·reader 배치를 변경하지 않는다. 기존 출처·질문 영역에 검수한 데이터를 채우는 일과 admin 입력 확장은 가능하다.
- Home 레이더의 데이터·형태·동작·주변 배치를 유지한다. 다른 공개 페이지는 현재 Discord dark-only 스타일을 따른다.
- 기존 public selector, published-current/privacy, Brain의 원문/수정 이력/공개 사본, owner 인증·Origin·명령 revision·감사 계약을 재사용한다.
- 실제 경험·코드 관찰·재구성한 회고·열린 질문을 구분한다. 회사 Wiki import나 추측한 감정/날짜/성과 작성은 포함하지 않는다.
- 새 도메인, 방문자 AI/기억, 댓글, 공개 조회수, 별도 임베딩 지도, 임의 코드 실행, 외부 수집/예약 작업은 포함하지 않는다.
- 사용자 결정: **Second Brain AI 질문·답변은 도입하지 않는다.** 관리자 전용 시험 운영·방문자 회원가입·질의 API·응답 스트리밍·AI 비용 제한 기능도 이 트랙에 추가하지 않는다. 아래 `questions`는 작성자가 기록에 직접 남긴 질문 목록이며 자동 답변이나 방문자 입력을 받지 않는다.

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

2026-11-06 R1 Step 1/2에서 저장·공개 경로와 관리자 작성 흐름을 검증했다. 아래 표는 이번 변경을 포함한 구현이며 남은 상태는 phase 레지스트리를 따른다.

| 근거 | 이미 구현한 것 | 이번 개선 |
| --- | --- | --- |
| `lib/brain.ts`, `BrainNote`, `BrainExplorer` | 공개 출처·질문 표시, 검색·목록·관계·독립 상세, S2 Step 5 기본 발견 | 공개 UI 유지 |
| `lib/brain-capture.ts`, `brain-curation.ts` | 선택형 sources/questions의 비공개 저장·공개 사본·이전 형식 호환. 원문/관계/날짜 보존 | R1 저장·공개 사본 완료 |
| `brain-curation`, `brain-suggestions`, `BrainCapture` | 후속 회고·revises·제목/태그 기반 후보 | R2 실제 기록 채우기; 기존 기능 재구현 금지 |
| `lib/brain-catalog.ts` | 정적 28개 노드/42개 연결. 경험 1개·사건일 0개·revises 0개 | 운영 DB 전체 통계가 아님. 확인된 사례/날짜만 보강 |
| `blog-series`, `portfolio-posts`, `blog-editorial` | 시리즈·프로젝트 연결·검증 범위·수정 기록 | R2/R3 내용과 현재성 정리 |
| `brain.ts` / `brain-blog-sources.ts` | Resume/Portfolio 및 현재 공개 Blog 참조, 서버 공개 응답 투영과 역방향 연결 | R3 Step 0/1 완료. 후보 읽기 경로·격리 검수 완료, 실제 발행 별도 |
| `blog-public`, `blog-search`, `blog-search-ui` | 목록·검색·필터·개수·URL 복원, 명시 태그 별칭·공통 투영 | R4 Step 0–2 완료 |
| `BlogPostRow`, Blog 상세, `BlogContent` | 태그 배지, 목차와 고유 heading # anchor, 코드 복사 | R4 태그 탐색·canonical 주소 복사 완료 |
| admin Brain | 검색·정렬·회고 및 출처·질문 작성/미리보기 가능. R1 완료 | R5 Step 1 완료. 제한 목록·버전별 확인과 비공개 메모 제공 |

## Phase / Step

| Phase | Step | 작업 | 상태 |
| --- | --- | --- | --- |
| R1 [brain-provenance-authoring](../../../phases/brain-provenance-authoring/index.json) | 0 | [공개용 출처·질문 계약](../../../phases/brain-provenance-authoring/step0.md) | completed |
| R1 [brain-provenance-authoring](../../../phases/brain-provenance-authoring/index.json) | 1 | [비공개 저장과 공개 사본](../../../phases/brain-provenance-authoring/step1.md) | completed |
| R1 [brain-provenance-authoring](../../../phases/brain-provenance-authoring/index.json) | 2 | [관리자 출처·질문 입력과 미리보기](../../../phases/brain-provenance-authoring/step2.md) | completed |
| R2 [evidence-content-curation](../../../phases/evidence-content-curation/index.json) | 0 | [현재 주장과 근거의 연결 대장](../../../phases/evidence-content-curation/step0.md) | completed |
| R2 [evidence-content-curation](../../../phases/evidence-content-curation/index.json) | 1 | [재현 근거가 있는 기술 글 한 편](../../../phases/evidence-content-curation/step1.md) | completed |
| R2 [evidence-content-curation](../../../phases/evidence-content-curation/index.json) | 2 | [기준 노드와 후속 회고 후보](../../../phases/evidence-content-curation/step2.md) | completed |
| R3 [public-knowledge-connections](../../../phases/public-knowledge-connections/index.json) | 0 | [현재 공개된 글을 Brain 출처로 연결](../../../phases/public-knowledge-connections/step0.md) | completed |
| R3 [public-knowledge-connections](../../../phases/public-knowledge-connections/index.json) | 1 | [한 사례를 잇는 편집된 읽기 경로](../../../phases/public-knowledge-connections/step1.md) | completed |
| R4 [blog-tag-and-link-polish](../../../phases/blog-tag-and-link-polish/index.json) | 0 | [태그 대표 표기와 별칭](../../../phases/blog-tag-and-link-polish/step0.md) | completed |
| R4 [blog-tag-and-link-polish](../../../phases/blog-tag-and-link-polish/index.json) | 1 | [기존 태그 배지를 탐색 링크로](../../../phases/blog-tag-and-link-polish/step1.md) | completed |
| R4 [blog-tag-and-link-polish](../../../phases/blog-tag-and-link-polish/index.json) | 2 | [글·소제목 주소 복사](../../../phases/blog-tag-and-link-polish/step2.md) | completed |
| R5 [knowledge-review-workflow](../../../phases/knowledge-review-workflow/index.json) | 0 | [재검토 대상과 확인 기록 계약](../../../phases/knowledge-review-workflow/step0.md) | completed |
| R5 [knowledge-review-workflow](../../../phases/knowledge-review-workflow/index.json) | 1 | [소유자 재검토 목록](../../../phases/knowledge-review-workflow/step1.md) | completed |
| R5 [knowledge-review-workflow](../../../phases/knowledge-review-workflow/index.json) | 2 | [연결·공개 경계 로컬 통합 검수](../../../phases/knowledge-review-workflow/step2.md) | pending |

## 실행 순서와 다른 트랙

1. 2026-11-05 기존 SEO S3 Step 0의 [로컬 SEO 릴리스 검수](SEO_RELEASE_REVIEW.md)를 완료했다. 새 R 트랙의 구현을 완료했다는 뜻은 아니다.
2. 2026-11-12 R5 Step 1 구현 완료. **다음 로컬 작업은 R5 Step 2 `local-knowledge-release-rehearsal`**다. 기본 순서는 R1 → R2 → R3 → R4 → R5다.
3. R2 자료 정리와 R4는 R1 구현/개인 경험 확인에 기술적으로 종속되지 않는다. 필요한 자료가 없을 때 독립 작업을 진행할 수 있으며 실행한 step과 순서 변경 이유를 기록한다. R3는 R1의 출처 계약과 R2의 검수 후보를 사용한다.
4. R5의 로컬 통합 검수는 새 트랙의 추가 회귀다. S3 Step 0의 기존 SEO 기준선을 취소하거나 완료된 단계를 다시 pending으로 만들지 않는다.
5. S3 Step 1/2의 실제 도메인·계정·측정 조건은 그대로다. **운영 모니터링 Step 7 → 관리자 A3 Step 4 → timer** 순서와 OCI 보류를 유지한다. R 트랙은 운영 보류 해제를 기다리지 않고 격리 로컬에서 준비할 수 있다.

R 등록 당시 전체는 53개 phase / 187개 step이었다. 2026-11-06 [성능 F1–F7](PERFORMANCE_REBUILD_PLAN.md)의 pending 22개 step을 더해 전체는 60개 phase / 209개 step이다. 기존 콘텐츠 트랙의 다음은 R5 Step 2이고 성능 트랙의 시작은 F1 Step 0이다. S3 Step 0 완료 후 SEO는 9 completed/1 pending/1 blocked다. 관리자 A 16/0/1, 모니터링 7/0/1의 상태는 바꾸지 않는다. R1/R5의 admin 후속은 별도 R 트랙이며 기존 A 트랙을 다시 열지 않는다.

## R1 계약 — 2026-11-06 Step 0–2 완료

`BrainDraft`/`parseBrainDraft`가 선택형 출처·질문을 검증·보존하고 `toPublicBrainNode`가 공개용 사본으로 변환한다. `brain-curation`은 기존 공개 사본의 키 생략만 읽기 기본값으로 처리한다. 저장은 `brain_note_versions.draft`, 공개 사본은 `brain_notes.public_node` JSONB이며 migration 004/006과 명령 감사는 그대로다. **새 테이블·열·migration 없이 기존 API로 구현**했다. 아래 저장/API 계약은 Step 1에서 검증했고 `BrainNote`/`BrainExplorer`는 기존 표시 영역을 유지한다. Step 2는 같은 parser/public projection으로 관리자 입력·미리보기를 연결했다.

### 입력과 표시

`POST /admin/brain/records`의 `action: "save"` 안에 있는 `draft`에만 다음 선택 필드를 추가한다. 기존 필수 필드·명령 envelope·262,144바이트 요청 상한은 유지한다. 공개용으로 적는 값이지만 저장 시점에는 비공개다.

| 필드 | 입력 계약 | 공개 사본/DTO |
| --- | --- | --- |
| `sources?` | `{ label: string; href?: string }[]`, 0–12개. 항목은 배열이 아닌 객체, 허용 키는 `label`, `href`뿐이며 `label` 필수 | 입력 순서대로 새 배열/객체를 복사. 추가 키나 내부 메타데이터는 내보내지 않음 |
| `sources[].label` | 원래 문자열의 JS `length` 1–160, NUL 금지, `trim()` 후 빈 값 금지. trim한 제목이 같은 항목은 거부 | 양끝 공백을 제거한 일반 텍스트. 자동 제목 추출/HTML 렌더링 없음 |
| `sources[].href?` | 생략 가능. 문자열이면 공백을 포함한 원래 JS `length` 2,048 이하, NUL 금지. trim 후 비면 링크 없는 출처, 아니면 아래 URL 계약 충족 | 양끝 공백 제거 후 허용 내부 경로 또는 기존 validator로 정규화한 HTTPS URL. 빈 값은 키 생략 |
| `questions?` | `string[]`, 0–12개. 각 원래 문자열의 JS `length` 1–300, NUL 금지, trim 후 빈 값/동일 질문 중복 금지 | 순서대로 양끝 공백만 제거한 일반 텍스트. 질문 안의 줄바꿈·한글·기술 표기 보존, 자동 분할/답변 없음 |

숫자·`null`·다른 자료형, 상한 초과, 알려지지 않은 키는 `400 invalid_draft`다. 중복 비교는 trim한 문자열의 정확한 일치만 사용하며 대소문자·Unicode 정규화·자동 병합은 하지 않는다. 서로 다른 제목이 같은 URL을 가리키는 것은 허용한다. 기존 reader의 React key가 출처 제목/질문 문자열이므로 중복을 입력 경계에서 막는다.

**저장 parser는 값의 검증과 복사만 수행한다.** 입력 순서·공백·줄바꿈과 생략된 필드를 보존하고, 기본값을 저장용 draft에 주입하거나 URL을 다시 쓰지 않는다. 공개 사본을 만드는 단계에서만 위 표시 정규화를 한다. 기존 원문·태그 등 다른 필드의 처리도 바꾸지 않는다. 이 구분은 과거 명령 fingerprint와 동일 요청 재확인을 유지하기 위한 것이다.

### URL 경계 — R1 당시 계약

아래는 R1 완료 시점의 계약이다. 2026-11-10 R3 Step 0부터 `/blog/[slug]`와 공개 origin의 절대 Blog URL도 지원하며 현재 공개 상태를 서버에서 확인한다. [R3 검수 결과](PUBLISHED_BRAIN_SOURCE_REVIEW.md)의 계약을 우선한다.

`lib/brain.ts`의 `publicSourceHref`와 `lib/public-source-url.ts`의 기존 정책을 함께 사용한다. 내부 경로 판정은 trim 후 정확한 `/resume` 또는 `^/portfolio/[a-z0-9]+(?:-[a-z0-9]+)*$`만 허용한다. 다른 상대 경로는 거부하며 외부 URL은 `normalizePublicSourceUrl`의 HTTPS·userinfo·내부 호스트 검사를 통과해야 한다. 새 입력의 거부된 URL은 저장 오류이며 조용히 제거하지 않는다. 기존 공개 카탈로그의 위험한 href를 제거하는 방어 동작은 유지한다.

| 예시 입력 | 결과 |
| --- | --- |
| `{ "label": "공식 문서" }`, href가 빈 문자열/공백 | 제목만 있는 출처. 빈 목록 `[]`도 허용 |
| ` https://example.com/guide#retry ` | 허용. private draft는 입력 보존, 공개 사본은 `https://example.com/guide#retry` |
| `/resume`, `/portfolio/backend-notes` | 기존 내부 허용 형식. Portfolio slug 실존 판정을 새로 추가한다는 뜻은 아님 |
| `/resume?download=1`, `/portfolio`, `/portfolio/backend-notes#detail` | 내부 허용 형식 밖이므로 거부 |
| `/blog/example`, `/brain/example`, `/admin/brain`, `/api/search`, `//example.com/path` | R1에서는 거부. Blog 상세의 현재 공개 상태와 철회 처리는 R3 Step 0 담당 |
| `http://example.com`, `javascript:alert(1)`, `data:text/plain,hi`, `file:///private/note` | HTTPS 외 scheme이므로 거부 |
| `https://user:pass@example.com`, `https://localhost`, `https://127.0.0.1`, `https://10.0.0.1`, `https://service.internal`, `https://[::1]` | userinfo 또는 내부 목적지이므로 거부 |

외부 URL은 **구문·공개용 정보 검사**이며 실제 접근 가능/공개 소유권/콘텐츠 안전성을 보증하지 않는다. DNS 조회·서버 fetch·미리보기 수집·본문 import는 없다. 절대 HTTPS URL을 내부 Blog 연결로 해석하지도 않는다. R3에서 내부 Blog selector와 철회 정책을 확정하기 전에는 이를 내부 링크의 우회 방식으로 사용하지 않는다. 관리자는 링크와 공개용 제목에 비공개 정보가 없는지 확인한다. 비공개 제목/slug·로컬 경로·관리자 URL을 공개 출처로 사용하지 않는다.

### 저장 → 공개 → 조회와 이전 기록 호환

| 경계 | 확정 동작 |
| --- | --- |
| 비공개 저장/조회 | 기존 전체 draft 저장 방식 유지. 새 버전 JSONB에 선택 필드를 보존하고 owner 상세/이력에서 그대로 반환. 공개 DTO·검색·HTML/RSC에는 아직 반영하지 않음 |
| 필드 없는 이전 draft | 유효한 입력으로 읽고 재저장 가능. GET/parser에서 새 키를 주입하지 않음. 원래 저장본·원문·이력·기존 감사 fingerprint를 갱신하지 않음 |
| 생략과 빈 배열 | `sources` 생략 시 공개 변환의 기존 기본값 `[{ label: "작성자가 직접 정리한 공개 메모" }]`, `questions` 생략 시 `[]`. 명시적 `sources: []`는 출처 없음. 기본 출처는 추가 근거나 경험 인증을 뜻하지 않음 |
| 전체 draft 수정 | PATCH/이전 버전 merge가 아님. 새 저장에서 필드를 생략하면 위 생략 규칙으로 돌아가며 이전 값을 자동 복구하지 않음. 편집기는 불러온 draft의 필드를 보존하고 명시 삭제는 `[]`로 전송 |
| 공개 명령 | 기존 `confirmed: true`, 현재 저장 revision·commandRevision 일치가 필요. 해당 저장본으로 사본 생성 후 모든 공개 필드의 privacy 검사. 과거 임의 revision을 선택해 발행하는 새 기능은 없음 |
| 개인정보 검사 | 출처 label/href와 질문도 전체 공개 사본의 `assertSafeBrainPublication` 검사 대상. 비공개 경로·연락처·secret·제한어는 `422 public_copy_blocked`. draft 저장 자체는 원문과 같은 비공개 흐름을 유지하며 공개 차단 시 기존 사본을 보존 |
| 공개 후 수정/재공개 | v1 공개 후 v2 저장은 v1 사본 유지. v2 명시 공개 성공 때만 출처·질문을 포함한 사본을 교체. 이전 v1 draft는 불변 |
| 기존 공개 사본 | 이미 저장된 sources/questions는 그대로 사용. 키가 없는 이전 형식만 읽기 투영에서 개별 기본값 적용. DB를 다시 쓰거나 현재 draft에서 보충하지 않음. `[]`는 생략과 구분하고 `null`/잘못된 타입을 이전 형식으로 취급하지 않음 |
| 공개 DTO/reader | `sources`, `questions`는 항상 배열. `selectPublicBrain`의 명시 DTO와 안전한 href 정책을 유지. `BrainNote`/`BrainExplorer` 기존 영역에만 표시. 빈 질문 숨김과 출처 영역의 정리일 유지 |
| 공개 해제 | 기존 공개 포인터·사본을 해제하고 private 버전·원문·감사 이력은 보존. 공개 graph/독립 상세/HTML/RSC/sitemap에서 철회 기록 제외 |

새 provenance 필드는 선택 필드지만 malformed 값을 정상 빈 값으로 바꾸지 않는다. 저장·공개·조회에서 지원하는 것은 **키 생략 호환**이다. 잘못된 레코드의 자동 수리나 오래된 스냅샷 전체 재생성은 이번 범위가 아니다.

### 명령·오류와 후속 검증 위치

기존 `commandId`·`commandRevision`·현재 revision의 transaction/감사 경계를 재사용한다. fingerprint는 정렬된 객체 키와 원래 draft 값으로 계산하고 배열 순서는 유지한다. 새 필드 값·순서·공백이 달라지면 다른 요청이다. 생략과 `[]`도 다른 요청이며 이들을 정규화해 같은 요청으로 만들지 않는다. 새 오류 envelope·별도 저장 API는 추가하지 않는다.

| 사례 | 기대 결과 | 후속 테스트 위치 (`apps/h-log/` 기준) |
| --- | --- | --- |
| 한글/줄바꿈/양끝 공백/순서, 출처 12개·질문 12개·label 160·href 2,048·질문 300 경계 | private 값 그대로, public만 표시 정규화. 상한 +1/공백뿐인 항목/중복/null/unknown key는 400 | `lib/brain-capture.test.ts`, `lib/brain-capture-http.test.ts` |
| 위 허용/거부 URL, plain text 마크업, 비공개 표식이 label/href/question에 있을 때 | URL 오류 400; privacy 차단 422와 원문 없는 오류. public DTO에 private 추가 키 없음 | `lib/brain-capture.test.ts`, `lib/brain.test.ts` |
| 키 없는 legacy draft/기존 사본, 명시 `[]`, 재저장, v1→v2 수정/재공개 | 과거 JSONB/원문 보존, 기본값 구분, 미선택 필드는 public에 없음 | `lib/brain-postgres-repository.integration.test.ts`, `lib/brain-curation.test.ts` |
| 같은 commandId와 같은 payload를 동시에/응답 유실 후 재전송 | 같은 receipt, 새 버전·감사 중복 없음. 이전 배포에서 기록한 키 없는 draft의 명령도 같은 결과 | `lib/brain-postgres-repository.integration.test.ts` |
| 같은 commandId에 sources/questions만 변경 또는 배열 순서 변경 | `409 command_conflict`. object key 순서만 바뀌면 기존과 같은 요청 | `lib/brain-postgres-repository.integration.test.ts` |
| 오래된 draft revision 또는 publish/unpublish 뒤 오래된 commandRevision | 각각 `409 revision_conflict` / `409 command_revision_conflict`. 현재 사본 유지 | `lib/brain-postgres-repository.integration.test.ts` |
| 감사 쓰기/공개 검사 실패, 명시 공개 해제 | 전체 transaction rollback 또는 정상 철회. 불변 이력·현재 공개 사본 확인 | `lib/brain-postgres-repository.integration.test.ts` |
| 인증·Origin·media type·body 상한 실패 | 기존 401/403/415/413, 오류 본문에 원문 없음, private no-store 유지 | `lib/brain-capture-http.test.ts`, `scripts/brain-capture.http.test.mjs` |
| admin 작성→저장→재열기→공개→수정→철회, 오류 후 입력 보존 | 기존 공개 두 reader의 데이터 일치, 비공개 HTML/RSC/sitemap 노출 없음, 기존 Brain UI·Home 레이더 유지 | `scripts/brain-capture.http.test.mjs`와 Step 2 브라우저 검수 |

Step 1은 parser/public projection 단위 RED부터 시작해 기존 `npm run test:brain`, `npm run test:brain:http`를 격리 합성 DB/loopback에서 실행한다. 실제 이전 payload의 fingerprint로 감사 행을 준비한 뒤 재요청해 배포 간 호환도 확인한다. 새 parser로 만든 두 요청만 비교하고 legacy 검증으로 간주하지 않는다. Step 2는 동일 계약으로 admin 입력·미리보기만 연결한다. Step 1 저장/API와 Step 2 관리자 UI 검증은 아래 각 완료 기록을 따른다.

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

## R1 Step 1 완료 검증 — 2026-11-06

출처·질문 보존 RED는 `invalid_draft`, 입력 경계 RED는 예외 누락, 이전 공개 사본 RED는 질문 배열 누락으로 실패한 뒤 각각 GREEN을 확인했다. 입력 값/생략을 저장에 그대로 남기고 공개 시에만 표시용 공백·URL을 정리한다. 기존 API·repository transaction·JSONB·공개 reader를 재사용했다.

- 단위 310개: **283 pass / 27 DB skip**, Brain focused 21/21. Windows sandbox 임시 파일 경로 때문에 기존 관측성 테스트가 처음 실패했으며, 동일 전체 단위를 일반 로컬 환경에서 실행해 통과했다.
- 별도 합성 PostgreSQL의 관련 integration **3/3**: 과거 payload로 직접 만든 감사 fingerprint 재확인, 새 필드/순서 변경 충돌, 동시 중복 요청, 불변 원문/버전, legacy 공개 사본 읽기 전후 JSONB 동일, 미선택 수정·재공개·빈 목록·privacy 차단·감사 실패 rollback·철회를 확인했다.
- production 공개/관리자 ingress HTTP **1/1**: 공개 전·v1 공개·v2 비공개 수정·v2 공개·차단된 v3·철회의 6상태 × HTML/RSC/사이트맵 5응답 = **30개 공개 응답**에서 선택 사본과 비공개 미노출을 확인했다. 일반 상세는 404, 이미 시작된 RSC는 HTTP 200일 수 있어 Next의 `NEXT_HTTP_ERROR_FALLBACK;404`·no-store와 내용 미노출을 함께 검사한다.
- `npm run typecheck`, Docker runner의 `npm run build`, 앱 source lint 통과. `npm run lint`는 기존 Git 제외 private helper의 오류 10개/경고 6개로 실패했다. 검사 범위를 좁힌 source lint 결과로 전체 lint 성공을 주장하지 않는다.
- 검수용 컨테이너 3개·network·임시 인증 파일을 정리했다. 원자료는 Git/Docker 제외 `private/r1-snapshots-2026-11-06/`. 앱 UI·Home 레이더·migration·배포 설정·운영 상태는 변경하지 않았고 브라우저 화면 검수는 입력 UI를 추가하는 Step 2에서 진행한다.

## R1 Step 2 완료 검증 — 2026-11-06

`BrainCapture`의 공개용 메모에 출처/질문 입력과 개수·길이 제한, 빈 값/중복/주소 오류를 연결했다. 미리보기는 `parseBrainDraft`와 `toPublicBrainNode`를 재사용하며 내부 출처는 공개 사이트로 연다. 원문은 미리보기에 넣지 않고 새 입력이나 삭제는 명시 저장·공개 전까지 기존 사본을 바꾸지 않는다. 필드 없는 이전 기록을 단순 편집할 때 기본값을 저장하지 않으며, 출처를 표시하지 않을 때는 명시적 빈 배열로 저장한다.

- TDD RED: 기존 production 이미지에서 작성 도중 `출처 추가` 버튼을 찾지 못해 실패. 구현 후 같은 작성 흐름의 GREEN과 확장 검수를 확인했다. 브라우저 테스트는 문자열 유무만 검사하지 않고 입력→API→재열기→공개 페이지의 값을 비교한다.
- `scripts/brain-editor.browser-check.mjs`: production/dev 각각 1440/390/320px × JS ON/OFF = **12표본**. JS ON 6회에서 두 출처/질문의 순서·줄바꿈, 중복/안전하지 않은 URL, 키보드 추가, 응답 유실 후 같은 명령 재확인, 재열기, 공개/미선택 수정, 빈 목록 재공개/철회, legacy 필드 생략 유지까지 확인했다. 1440px에서는 12개/160·300자 상한과 URL maxlength 2,048도 확인했다. JS OFF는 안내와 가로 넘침을 확인했다.
- 공개 독립 상세와 기존 Memory reader에서 출처·질문이 같고 뒤로가기로 목록에 복귀한다. 별도 HTTP **1/1**의 30개 HTML/RSC/사이트맵 응답에서도 비공개/미선택/철회 값 미노출을 재확인했다. 공개 reader·graph·검색/필터 코드와 Home 레이더 변경은 0건이다.
- 단위 **283 pass/27 DB skip**, 관련 DB integration **3/3**, source lint·typecheck·Docker production build 통과. 전체 lint는 기존 private helper 오류 10개/경고 6개로 실패했으며 이번 앱 source 검증과 구분한다.
- 마지막 production 검수 컨테이너 3개와 network, dev 검수 DB 컨테이너 1개·network·본 작업의 dev 프로세스와 임시 인증 파일을 정리했다. 스크린샷·로그·원자료는 Git/Docker 제외 `private/r1-editor-2026-11-06/`에 둔다. 운영 적용·실제 콘텐츠 발행은 실행하지 않았다.

## R2 Step 0 완료 — 2026-11-09

[현재 주장과 근거의 연결 대장](CURRENT_CLAIMS_INVENTORY.md)에 대표 5건을 정리했다. Portfolio·Resume·Blog 후보·정적 Brain의 대응을 확인하고 현재 코드, 과거 경력/로컬 검증, 추론과 질문을 분리했다. 원고 후보는 S2 Step 4의 Home/Suspense 글을 재사용한다. 기존 원고·과거 원본과 S2 근거 11개 파일의 hash가 같으며 새 글로 중복 계산하지 않는다.

문서/JSON·링크·읽을 경로·상태 개수·private 제외·diff 검수를 통과했다. 본인 확인이 필요한 측정 조건은 질문으로 남겼고 새 운영 관측이나 개인 감정을 만들지 않았다. R 트랙은 4 completed/10 pending, 다음은 R2 Step 1이다. 원고 재검수·Brain 후보 준비·공개 연결은 각 후속 step에서 진행한다.

## R2 Step 1 완료 — 2026-11-09

기존 Home/Suspense 원고에 재현 환경·명령, 과거/현재 검증 구분과 요청 cache·후속 성능 계획 설명을 보완했다. [검수 결과](EVIDENCE_CASE_MANUSCRIPT_REVIEW.md)에 주장 16개·출처 25개·47/47 단위, 파싱·privacy·문체 protected span·editorial 후보·원본/hash 보존과 메모리 공개 경계를 기록했다. DB/HTTP/브라우저·운영 성과는 이번에 재실행하지 않았다. 원고는 비공개 후보이며 다음은 R2 Step 2다. R completed 5·pending 9, F 22개 pending과 SEO/A/모니터링 상태는 유지한다.

## R2 Step 2 완료 — 2026-11-10

[검수 결과](BRAIN_PRINCIPLE_DRAFT_REVIEW.md)에 기준 노드 3개·기존 관계 13개와 비공개 기록 후보 3개·연결 6개를 정리했다. 기존 단위 9/9, parser/privacy·근거/문체/hash·8개 공개 부분집합·실제 ID 매핑과 문서 검수를 통과했다. 사건일·감정·revises는 추가하지 않았다. R2 3/3 완료, R completed 6·pending 8이며 다음은 R3 Step 0이다. 실제 DB 등록·공개 적용과 UI 변경은 수행하지 않았다.

## R3 Step 0 완료 — 2026-11-10

2026-11-10 R3 Step 0 `published-source-connections` 완료. Brain 출처의 Blog 상대 경로와 확정된 공개 origin의 절대 URL을 현재 published-current/privacy 결과로 확인한다. 비공개·철회·누락 대상의 제목/주소는 공개 응답에서 제거하고, Blog 상세에는 현재 공개 Brain으로 가는 ‘연결된 생각’을 제공한다. 조회 실패는 연결 영역에서 안내하며 기존 원문·공개 사본을 바꾸지 않는다. [검수 결과](PUBLISHED_BRAIN_SOURCE_REVIEW.md)에 RED/GREEN, 단위 288 pass/28 DB skip·관련 DB 4/4·production/dev HTML/RSC·1440/390/320px JS ON/OFF 검증과 기존 lint 오류를 기록했다. **R completed 7·pending 7, 다음은 R3 Step 1 `curated-reading-paths`**다. 실제 콘텐츠 발행·배포는 없으며 F 22개 pending과 운영 조건은 유지한다.

## R3 Step 1 완료 — 2026-11-10

2026-11-10 R3 Step 1 `curated-reading-paths` 완료. 기존 Portfolio 사례·원고 3편의 시리즈와 Brain 후보 3개를 하나의 읽기 순서로 묶었다. Brain 출처 2곳을 원고에 연결하고 기존 본문·질문·관계 6개·검토일을 보존했다. 등록용 제목/본문 사본은 원본과 분리해 준비했다. [검수 결과](CURATED_READING_PATH_REVIEW.md)에 단위 55/55·공개 조합 64개·격리 DB 4/4·HTML/RSC·1440/390/320px JS ON/OFF 왕복 검증을 기록했다. **R3 전체 완료, R completed 8·pending 6, 다음은 R4 Step 0 `tag-alias-contract-and-projection`**이다. 실제 발행·운영 DB 등록·앱 코드/UI 변경은 없으며 F 22개 pending과 운영 보류는 유지한다.

## R4 Step 0 완료 — 2026-11-11

2026-11-11 R4 Step 0 `tag-alias-contract-and-projection` 완료. Next.js/nextjs와 PostgreSQL/postgres의 명시 사전을 공개 목록·검색·집계·URL 상태와 새 관리자 초안 저장에 적용했다. 사전 밖 태그와 과거 원문/버전/hash는 보존한다. [검수 결과](BLOG_TAG_ALIAS_REVIEW.md)에 focused RED 5개→GREEN 76/76, 단위 293 pass/28 DB skip·DB 4/4·production/dev HTTP·브라우저 6조합과 source lint/typecheck/build 결과를 기록했다. 기본 lint의 기존 private 오류 10개와 build 경고 2개는 남아 있다. **R completed 9·pending 5, 다음은 R4 Step 1 `navigable-tag-badges`**다. F 22개 pending·승인된 Brain UI·Home 레이더·운영 보류는 유지한다.

## R4 Step 1 완료 — 2026-11-11

2026-11-11 R4 Step 1 `navigable-tag-badges` 완료. 일반 목록·검색 결과·상세의 태그 배지를 기존 필터 URL로 연결했다. 검색 결과는 제출한 검색어를 유지하고 1페이지로 이동하며 상세는 태그 일반 목록으로 이동한다. [검수 결과](BLOG_TAG_NAVIGATION_REVIEW.md)에 실제 브라우저 RED 15표본→production/dev GREEN 30표본, 단위 294 pass/28 DB skip·DB 2/2·source lint/typecheck/build를 기록했다. 기본 lint의 기존 private 오류 10개와 build 경고 2개는 남아 있다. **R completed 10·pending 4, 다음은 R4 Step 2 `article-and-section-link-copy`**다. F 22개 pending·승인된 Brain UI·Home 레이더·운영 보류는 유지한다.

## R4 Step 2 완료 — 2026-11-11

글 주소와 기존 소제목 주소를 서버 canonical 기준으로 복사한다. 실패/미지원 때는 직접 복사 링크를 제공하며 기존 # 탐색과 관리자 미리보기, 목차·원문을 보존했다. 실제 클립보드 및 실패 처리·JS ON/OFF·세 폭의 production/dev 24표본과 단위/격리 DB 검증을 통과했다. [검수 결과](BLOG_LINK_COPY_REVIEW.md). R4 전체 완료, R completed 11/pending 3이며 다음은 R5 Step 0이다.

<a id="r5-manual-review-contract"></a>

## R5 수동 재검토 계약 — 2026-11-12 Step 0

**2026-11-12 Step 1 구현·격리 검수 완료.** [구현 결과](BRAIN_MANUAL_REVIEW_REVIEW.md)를 따른다. 아래는 Step 0에서 정한 계약과 당시 코드 조사 기록이며 구현의 기준으로 유지한다. 기준 commit은 `b9db296307665cdabf6aa24ccbab361b8f74184a`다. 앱 코드·schema·운영 데이터는 이 단계에서 변경하지 않는다. 결정 근거는 [ADR-044](ADR.md#adr-044)와 다음 실제 호출 경로다.

| 현재 코드 | 확인한 경계와 후속 변경 |
| --- | --- |
| [Brain 입력](../../../lib/brain-capture.ts), [공개 사본](../../../lib/brain-curation.ts) | `sources/questions`는 draft의 선택 필드다. 질문별 해결 상태·자료 날짜·수동 확인 기록은 없다. 공개 DTO에 재검토 필드를 넣지 않는다 |
| [저장소](../../../lib/brain-postgres-repository.ts), [004](../../../migrations/004_brain_capture.sql)·[006](../../../migrations/006_brain_admin_commands.sql) | `(note_id, revision)`의 원문 이력은 불변이다. 명령 UUID 예약→note 잠금→revision/commandRevision 비교→상태와 감사 commit을 재사용한다 |
| [관리자 페이지](../../../app/admin/brain/page.tsx), [편집기](../../../components/brain/BrainCapture.tsx), [HTTP](../../../lib/brain-capture-http.ts) | 기존 목록·원문 이력은 전체 조회, 감사 이력은 최근 20개다. 새 재검토 목록만 제한 조회로 추가하며 기존 전체 목록/이력 개선은 [F6 Step 0](../../../phases/owner-asset-performance/step0.md)로 남긴다 |
| [owner 인증](../../../lib/admin-owner.ts), [Brain 인증](../../../lib/brain-owner.ts) | 관리자 flag·키·Host/Origin·Brain DB flag와 private/no-store 헤더를 그대로 사용한다 |
| [Blog editorial](../../../lib/blog-editorial.ts), [Blog 검토](../../../lib/blog-admin-review.ts) | 공개 검증일/수정일은 작성자가 정한 메타데이터다. 관리자 검토의 버전/hash 및 자료 수집 시각과 같은 의미가 아니다 |
| [감사 조회](../../../lib/blog-admin-operations.ts), [migration runner](../../../scripts/blog-migrations.mjs) | 새 `review` action의 한국어 label과 테이블 inventory를 후속 구현에서 함께 갱신한다. 감사 화면에 짧은 비공개 메모를 복제하지 않는다 |

### 대상과 다시 찾는 이유

쓰기 대상은 기존 `/admin/brain`에서 저장한 **DB 기록의 현재 revision**이다. 공개 여부와 무관하다. 미저장 입력·과거 revision·현재와 다른 공개 revision에는 확인 명령을 실행하지 않는다. 정적 카탈로그와 Blog/Portfolio/Resume를 일반화한 통합 CMS는 만들지 않는다. 이 자료들의 현재성 문제는 [R2 대장](CURRENT_CLAIMS_INVENTORY.md)의 ID와 파일/commit·기존 hash를 기준으로 수동 인계한다.

| 이유 코드 | 조건 | 의미와 한계 |
| --- | --- | --- |
| `questions` | 현재 draft의 `questions`가 비어 있지 않음 | 기존 문자열은 모두 ‘남겨 둔 질문’이다. 확인 클릭이 질문을 해결/삭제하지 않으며, 해결 내용을 적거나 질문을 정리할 때는 기존 편집/새 버전을 사용한다 |
| `unlinked` | 현재 기록에 유효한 Brain 관계가 하나도 없음 | 현재 DB draft와 서버의 공개 정적 카탈로그를 기준으로 **들어오는 관계와 나가는 관계 모두** 검사한다. 존재하는 다른 기록을 향한 `links`/catalog edge만 센다. 과거 버전의 관계·자기 자신·없는 대상은 제외하며 `sources`의 외부/Blog URL은 그래프 관계로 세지 않는다 |
| `manual` | 현재 revision의 마지막 확인 결과가 `needs_review` | 작성자가 특정 출처·주장 등을 다시 보기로 지정했다. 짧은 메모로 대상을 적으며 변동 가능한 sources 배열 index를 별도 식별자로 저장하지 않는다 |
| `version_changed` | 이전 revision에 확인 이력이 있지만 현재 revision에는 없음 | 같은 텍스트를 새로 저장한 경우도 별도 버전이다. 제목·질문·출처·관계 등을 포함한 새 저장에 과거 확인을 승계하지 않는다 |

이유는 중복될 수 있고 오류/정확도 점수가 아니다. 날짜가 오래됐거나 공개되지 않았다는 이유만으로 후보를 만들지 않는다. 다른 기록의 관계나 외부 출처 내용이 바뀌었다고 현재 기록의 확인을 자동 취소하지 않는다. 외부 사실의 현재성을 보장하는 기능이 아니므로 필요한 재확인은 작성자가 지정한다.

### 상태와 버전 경계

| 상태 | 현재 revision의 해석 |
| --- | --- |
| `unreviewed` / 미검토 | 이 기록의 어느 revision에도 확인 이력이 없음. 기존 레코드와 새 기록의 기본값 |
| `needs_review` / 확인 필요 | 현재 revision의 마지막 결과가 `needs_review`, 또는 이전 revision의 이력만 있음 |
| `confirmed` / 확인 완료 | 현재 revision의 마지막 결과가 `confirmed` |

‘마지막’은 기록별 `command_revision` 순서다. 시계·자료 날짜로 순서를 정하지 않는다. `confirmed`는 이 버전을 사람이 확인했다는 기록이며 공개 승인·정확성 인증·실험 재현을 뜻하지 않는다. 확인 후 질문이 남아 있어도 기본 확인 대기 목록에서 제외하고 질문/확인 완료 필터에서는 찾을 수 있다. 같은 버전에 다시 `needs_review`를 남기면 확인 필요로 돌아오며 앞선 확인은 이력에 남는다.

`publish/unpublish`는 commandRevision만 바꾸므로 같은 내용 버전의 확인 결과를 유지한다. 새 `save`는 current revision을 올려 과거 확인을 승계하지 않는다. 공개 v1을 둔 채 비공개 v2를 저장/확인해도 v1 사본이나 공개 날짜는 변하지 않는다. 내용·질문·관계를 고치거나 회고를 잇는 것은 기존 저장 흐름이며 확인 버튼이 대신 실행하지 않는다.

### 날짜는 서로 바꾸어 쓰지 않는다

| 값 | 출처와 의미 |
| --- | --- |
| 정리일 `recordedAt` | DB 기록의 최초 `created_at`을 Seoul 날짜로 표시하는 기존 규칙. 새 확인일로 덮어쓰지 않음 |
| 사건일 `occurredOn` | 작성자가 아는 사건 날짜. 없으면 미상이며 생성/저장/확인 시각에서 추정하지 않음 |
| 자료 날짜 | 출처가 명시한 발행/수정/측정 날짜. 현 sources에는 구조화된 날짜 필드가 없으므로 이번 기능에서 파싱하거나 채우지 않음. Blog `fetchedAt`은 수집 시각일 뿐 |
| 확인 이력 시각 `recorded_at` | 서버 DB transaction 시각으로 저장하는 명령 처리 시각. 클라이언트가 보내지 못하며 표시만 Asia/Seoul로 변환 |
| 실제 확인 표시 `checkedAt` | 결과가 `confirmed`인 해당 이력의 `recorded_at`. `needs_review`를 지정한 시각을 실제 확인일로 표시하지 않음. 사람이 검토를 시작한 시각이나 외부 검증일을 추정하지 않음 |
| Blog 공개 `verification.checkedOn` / `revisions[].revisedOn` | 공개용 작성 계약 유지. Brain 재검토 클릭으로 생성·갱신하거나 새로운 근거로 간주하지 않음 |

### 최소 저장 계약

R5 Step 1에서 기존 PostgreSQL에 **append-only `brain_note_reviews` 한 테이블**을 추가한다. 현재 마지막 migration은 012이며 다음 순번은 구현 시 live 목록에서 확인한다. 기존 draft JSON·공개 사본·원문 이력에 검토 상태를 섞지 않는다.

| 열 | 계약 |
| --- | --- |
| `note_id`, `revision` | `brain_note_versions(note_id, revision)`을 참조하는 복합 FK. 해당 버전을 특정하므로 추가 content hash를 생성하지 않음 |
| `command_revision` | 확인 명령 성공 후의 기록별 command revision. `(note_id, command_revision)`을 PK로 사용 |
| `command_id` | 기존 owner command UUID, unique. 같은 transaction의 `admin_actions`와 대조할 식별자. 별도 FK로 공통 감사 정리 흐름을 결합하지 않음 |
| `result` | `needs_review` 또는 `confirmed` |
| `memo` | 비공개 plain text, 원래 입력 최대 500 UTF-16 code units, NUL 금지. `needs_review`는 공백 아닌 이유 필수, `confirmed`는 빈 문자열 허용. parser는 원래 입력을 보존해 fingerprint를 만든다 |
| `recorded_at` | 서버 transaction 시각, 동일 명령 재확인 때 새 시각을 만들지 않음 |

DB도 result enum·`char_length(memo) <= 500`·비어 있는 지정 사유를 제한한다. UTF-16 단위 상한과 NUL 거부는 입력 parser에서 적용하며 PostgreSQL text의 문자 수와 같은 단위라고 가정하지 않는다. 기존 원문과 같은 방식으로 UPDATE/DELETE를 막고, 취소/재확인은 새 행으로 추가한다. `revision > 0`, `command_revision > 0`, FK·unique와 기존 명령 metadata 검증을 적용한다. 최신 행 조회는 PK의 note prefix와 역순 command revision으로 가능하며, 과거 이력의 내용을 갱신하는 projection을 원본으로 삼지 않는다.

`brain_note_versions`와 `brain_note_reviews`가 원본이며 화면의 상태/후보/최신 확인 요약은 그 값에서 다시 계산한다. 별도 Redis·검색 저장소·스케줄러를 추가하지 않는다. 확인 이력이 없으면 원문 날짜나 감사 성공만으로 confirmed를 복원하지 않는다. 기존 행에는 확인 이력을 backfill하지 않는다. 이력은 기존 DB backup/restore에 함께 포함하고 자동 만료/삭제를 하지 않는다. 조회량 제한과 원본 보존 기간은 별개다.

### 명령과 동시성

기존 `POST /admin/brain/records`에 `action: "review"` 하나를 추가한다. 입력은 `action`, `id`, 현재 `revision`, `commandId`, 현재 `commandRevision`, `review: { result, memo }`뿐이다. 알 수 없는 키·잘못된 타입·범위·NUL은 400으로 거부한다. `draft`, `confirmed`, 사용자 시각, publish 지시는 받지 않는다. 성공 receipt는 기존 `{ id, revision, commandRevision }`를 유지하며 revision은 같고 commandRevision만 1 증가한다.

1. repository 접근 전에 기존 owner 인증과 Brain flag를 검사한다. POST의 정확한 Host/Origin·JSON 본문/256 KiB 상한·no-store와 고정 오류 envelope를 유지한다.
2. `admin_actions`의 owner UUID 고유 키로 예약한다. 새 review fingerprint는 action/id/revision/commandRevision/review의 정렬된 객체 키와 원래 메모를 포함한다. **기존 save/publish/unpublish fingerprint의 키·값·직렬화는 변경하지 않는다.** 배포 전 명령의 재전송도 같은 receipt를 받아야 한다.
3. 중복 UUID와 같은 fingerprint는 저장된 receipt로 종료한다. 서로 다른 내용/대상/작업이면 `command_conflict`(409)다. 중복 확인은 현재 revision 검사보다 먼저 처리하되 UI는 receipt를 현재 상태로 오해하지 않고 기록/목록을 다시 읽는다.
4. 새로운 명령은 `brain_notes FOR UPDATE` 뒤 현재 revision과 commandRevision을 비교한다. 다른 저장/공개/확인과 경합하면 기존 `revision_conflict` 또는 `command_revision_conflict`(409)로 종료한다. 없는 대상은 404다.
5. 확인 행 추가·명령 revision 증가·감사를 한 transaction으로 commit한다. 감사 action은 `review`, target은 기존 `brain_note`다. reason은 `manual_review_requested` 또는 `manual_review_confirmed` 고정 코드이며 원문·출처 전문·메모는 감사/receipt에 넣지 않는다. 어느 한 쓰기라도 실패하면 UUID 예약을 포함해 전부 rollback한다.

확인 명령은 `current_revision`, `published_revision`, `public_node`, 원문/버전, `brain_notes.updated_at`을 변경하지 않는다. 따라서 기존 저장/공개 정렬 시각도 확인 클릭으로 흔들리지 않는다. 새 action은 migration의 기존 action CHECK 목록을 **보존하며 확장**하고 Brain actions 타입·이력 한국어 label·공통 감사 action label에도 반영한다.

UI는 미저장 변경·미저장 새 기록·다른 진행/결과 미확인 명령이 있을 때 확인 명령을 잠근다. 결과 유실/503은 같은 payload와 UUID로 재확인하고, 충돌 뒤 자동으로 새 revision을 승인하지 않는다. 기존 pendingCommand·중복 클릭 잠금·미저장 이탈 안내를 재사용한다. 메모 수정과 확인 결과 변경도 명시적 새 명령이다.

### 제한 조회와 공개 경계

`GET /admin/brain/records?view=review` 분기를 추가한다. 기존 `GET` 전체 목록과 `?id=...` 상세 응답의 의미는 유지한다. 새 분기에서 `status=attention|unreviewed|needs_review|confirmed|all`, `reason=all|questions|unlinked|manual|version_changed`, `after=<note id>`만 받는다. 기본은 attention/all/첫 페이지이며 중복·알 수 없는 query key, 혼용한 id, 잘못된 enum/cursor는 `invalid_review_query`(400)다.

- attention은 **이유가 1개 이상이고 confirmed가 아닌 기록**이다. 나머지 status는 이름 그대로 전체 현재 기록에서 필터링한다. reason은 그 결과와 교집합이다. 전체/확인 완료 필터로 이전 확인도 다시 찾을 수 있다.
- SQL에서 이유/상태를 필터링한 뒤 `note_id ASC`, `id > after`, `LIMIT 21`을 적용한다. 응답은 최대 20개와 `nextCursor`이며 전체 count·원문·질문/출처 전문·관계 전체를 보내지 않는다. 제목은 기존 160자 상한, 항목은 id/revision/commandRevision/publishedRevision/이유/상태/최근 확인 시각만 갖는다.
- current draft·확인 이력·관계의 한 read-only repeatable-read snapshot으로 계산하고 `statement_timeout=3s`를 사용한다. 관계 판정의 scan 비용이 없어지는 것은 아니며 반환량 제한을 DB 작업량의 절대 상한으로 주장하지 않는다. 이유가 있는 행을 메모리로 전부 읽어 slice하는 방식은 쓰지 않는다.
- 정적 카탈로그는 이미 서버가 가지고 있는 graph만 전달한다. DB 목록 전체를 새 queue 계산용으로 클라이언트에 추가 전송하지 않는다. 안정적인 id cursor를 쓰지만 페이지 사이 수정으로 결과는 바뀔 수 있으므로 새로 조회할 때 cursor를 초기화한다.
- owner 상세에는 현재 상태와 **최근 확인 이력 20개 + 더 있음 표시**만 추가한다. 원래 원문 history 전체 조회는 F6로 남기며 이미 있던 전체 목록/상세가 제한 조회로 바뀌었다고 주장하지 않는다.
- 정상 0건, 미검토 기록, 기능 미설정, 저장소/timeout 오류를 구분한다. DB 오류를 빈 목록이나 미검토 성공으로 바꾸지 않는다. error는 기존 `storage_unavailable`(503)로 일반화한다.
- 공개 `findPublicGraph`는 기존 `public_node`만 읽는다. HTML/RSC·graph·독립 상세·Blog 연결·검색·sitemap에 검토 상태/시각/메모가 나오지 않아야 한다. 메모는 owner 상세에서 escaped text로만 읽으며 일반 감사 화면·console에도 넣지 않는다. no-JS에서는 조회와 기본 탐색만 제공하고 쓰기는 기존 안내를 유지한다.

### R5 Step 1 검증 행렬과 인계

| 검증 | 확인할 결과 |
| --- | --- |
| 이전 형식·질문 없음·출처만 있음·단방향 incoming/outgoing·없는 대상 | 기존 payload 보존, 미검토 기본값, 관계 양방향/현재 버전 판정, 질문 이유와 확인 상태 분리 |
| v1 확인→동일 텍스트 v2 저장→v2 확인→재확인 지정 | v1 이력 불변, v2 확인 필요, 명령 순서에 맞는 결과, 지정 이유 필수 |
| 공개 v1 + private v2, 공개/철회 후 확인 | 공개 사본·원문·공개 날짜 불변, 같은 내용 revision의 확인 유지, review 명령으로 발행/철회하지 않음 |
| 중복/동시 동일 UUID, 같은 UUID의 payload 변경, save/publish/review 경합 | 한 이력·한 감사·한 command revision, 기존 receipt, 409, 감사/이력 실패 시 원자적 rollback |
| 기존 명령 fingerprint·legacy migration·dump/restore | 이전 요청 재확인 호환, 새 테이블/enum 추가 외 원문·사본·감사 보존, 복구 뒤 동일 상태와 이력 |
| 20개 경계·필터 후 21번째·cursor·조회 실패 | 서버 제한/계속 읽기, 빈 결과와 503 구분, 고정 query timeout, 전체 자료 선로딩 없음 |
| 인증 OFF/키/Host/Origin/직접 endpoint와 no-store | 조회 전 차단, 쓰기 CSRF 경계, private sentinel이 공개 응답에 없음 |
| dev/production 1440/390/320px·키보드·JS ON/OFF | 이유→기록→확인→수정 후 다시 확인, 미저장/유실 응답 복구, 기존 Brain UI·Home 레이더 유지 |

구현은 입력/선정 단위 RED에서 시작하고, 기존 Brain repository integration·HTTP·공통 감사 label·migration inventory/upgrade·필요한 복구 검증을 추가한다. 쓰기 대상이 다른 서비스로 확장되는 추상화나 새 AI·예약 알림은 만들지 않는다. R2-C01–C05는 Step 1에서 기존 근거와 현재 코드 범위를 수동 대조해 ‘수정 필요/추가 확인/유지’를 기록한다. 회사 자료나 실제 운영을 확인하지 않고 미확인을 해소하지 않으며, 공개 변경은 별도 검수/선택에 따른다.

Step 0에서는 위 계약과 읽을 파일/상태/링크만 검증했다. runtime 검증·migration 파일 작성/실행·버튼 구현·콘텐츠 확인 완료는 다음 단계다. R completed 12/pending 2, 다음은 **R5 Step 1 `owner-review-queue`**다.

## R5 Step 1 완료 — 2026-11-12

2026-11-12 R5 Step 1 `owner-review-queue` 완료. 기존 관리자 Brain에 이유·상태별 20개 조회와 버전별 확인·재확인 지정, 비공개 메모·최근 확인 이력을 추가했다. 확인 명령은 원문과 공개 사본을 바꾸지 않으며 새 버전은 다시 확인한다. [검수 결과](BRAIN_MANUAL_REVIEW_REVIEW.md)에 단위 300 pass/29 DB skip, 격리 DB 8/8, production/dev HTTP 2/2·브라우저 12표본, 합성 이력 20건·원문 24버전 dump/restore를 기록했다. source lint/typecheck/build는 통과했고 기본 lint의 기존 private 오류 10개·경고 6개와 build 경고 2개는 남아 있다. R2-C01–C05의 유지·추가 확인 사항도 갱신했다. **R completed 13·pending 1, 다음은 R5 Step 2 `local-knowledge-release-rehearsal`**다. F 22개 pending과 운영 보류를 유지한다. 아래 날짜별 기록은 당시 상태다.
