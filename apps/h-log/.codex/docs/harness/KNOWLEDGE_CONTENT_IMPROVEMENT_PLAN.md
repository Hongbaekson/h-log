# H-Log 기록·탐색 개선 계획

등록일: 2026-11-05. Zerry/Memory 재조사 후 사용자가 개선 방향의 phase/step 등록과 커밋·푸시를 요청했다. **R1–R5: 5개 phase / 14개 step**이다. 2026-11-06 R1 Step 0–2를 완료해 **completed 3·pending 11**이다. R1의 계약·저장·관리자 입력과 미리보기를 마쳤으며 다음은 R2 근거 대장이다. 계획 등록을 기능 구현이나 콘텐츠 발행 완료로 표시하지 않는다. 상태의 source of truth는 [전체 레지스트리](../../../phases/index.json)와 각 phase index다.

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
| `brain.ts` 내부 출처 allowlist | Resume/Portfolio 중심. Blog 상세의 현재 공개 연결 계약 없음 | R3 공개 selector 기반 출처 연결 |
| `blog-public`, `blog-search`, `blog-search-ui` | 목록·검색·필터·개수·URL 복원, 태그 표기 정리는 trim 수준 | R4 작은 별칭 사전·동일 결과 집합 |
| `BlogPostRow`, Blog 상세, `BlogContent` | 태그 배지, 목차와 고유 heading # anchor, 코드 복사 | R4 태그 탐색·주소 복사만 보완 |
| admin Brain | 검색·정렬·회고 및 출처·질문 작성/미리보기 가능. R1 완료 | R5 버전에 묶인 수동 검토와 다시 찾기 |

## Phase / Step

| Phase | Step | 작업 | 상태 |
| --- | --- | --- | --- |
| R1 [brain-provenance-authoring](../../../phases/brain-provenance-authoring/index.json) | 0 | [공개용 출처·질문 계약](../../../phases/brain-provenance-authoring/step0.md) | completed |
| R1 [brain-provenance-authoring](../../../phases/brain-provenance-authoring/index.json) | 1 | [비공개 저장과 공개 사본](../../../phases/brain-provenance-authoring/step1.md) | completed |
| R1 [brain-provenance-authoring](../../../phases/brain-provenance-authoring/index.json) | 2 | [관리자 출처·질문 입력과 미리보기](../../../phases/brain-provenance-authoring/step2.md) | completed |
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
2. 2026-11-06 R1 Step 0–2 완료. **다음 로컬 작업은 R2 Step 0 `current-claims-inventory`**다. 기본 순서는 R1 → R2 → R3 → R4 → R5다.
3. R2 자료 정리와 R4는 R1 구현/개인 경험 확인에 기술적으로 종속되지 않는다. 필요한 자료가 없을 때 독립 작업을 진행할 수 있으며 실행한 step과 순서 변경 이유를 기록한다. R3는 R1의 출처 계약과 R2의 검수 후보를 사용한다.
4. R5의 로컬 통합 검수는 새 트랙의 추가 회귀다. S3 Step 0의 기존 SEO 기준선을 취소하거나 완료된 단계를 다시 pending으로 만들지 않는다.
5. S3 Step 1/2의 실제 도메인·계정·측정 조건은 그대로다. **운영 모니터링 Step 7 → 관리자 A3 Step 4 → timer** 순서와 OCI 보류를 유지한다. R 트랙은 운영 보류 해제를 기다리지 않고 격리 로컬에서 준비할 수 있다.

새 14개 step을 더해 전체는 53개 phase / 187개 step이다. S3 Step 0 완료 후 SEO는 9 completed/1 pending/1 blocked다. 관리자 A 16/0/1, 모니터링 7/0/1의 상태는 바꾸지 않는다. R1/R5의 admin 후속은 별도 R 트랙이며 기존 A 트랙을 다시 열지 않는다.

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

### URL 경계

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
