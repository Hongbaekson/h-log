# Portfolio · Blog · Brain 읽기 경로 검수

2026-11-10(KST), [R3 Step 1](../../../phases/public-knowledge-connections/step1.md)을 완료했다. 기준 commit은 `2dba66e95f4c0fd79009ad784dcbf1d8af48bab7`이다. [R2 원고](EVIDENCE_CASE_MANUSCRIPT_REVIEW.md), [Brain 후보](BRAIN_PRINCIPLE_DRAFT_REVIEW.md), [기존 시리즈](BLOG_SERIES_READINESS.md)와 [R3 공개 연결](PUBLISHED_BRAIN_SOURCE_REVIEW.md)을 재사용했다.

이번 완료는 **읽기 순서 편집과 격리 검수**다. 원고 3편·Brain 후보 3개를 실제 운영 DB에 등록하거나 공개하지 않았다. 앱 코드·정적 카탈로그·시리즈 mapping·승인된 Brain UI·Home 레이더는 그대로다.

## 한 사례의 읽기 순서

| 순서 | 읽을 내용 | 다음으로 연결하는 이유 |
| --- | --- | --- |
| 1 | Portfolio: **H-Log 공개 글 조회와 읽기 화면**, `/portfolio/h-log-public-reading` | 문제와 구현 범위를 먼저 읽고 최근 글 조회를 다룬 사례로 들어간다. 기존 mapping 이유는 “H-Log 홈에서 최근 글 조회와 소개 화면을 분리한 구현 기록입니다.” |
| 2 | Blog: **Next.js Suspense로 최근 글 조회와 홈 렌더링 분리하기**, `/blog/home-recent-posts` | 선택한 대기 경계, 비교한 대안, 확인 범위와 한계를 읽는다. ‘연결된 생각’에서 아래 두 구현 메모로 이동한다. |
| 3 | Brain: **홈에서 기다릴 부분을 작게 나누기** | 사례에서 다시 사용할 실패·대기 경계의 기준을 읽는다. 원고 본문을 복제하지 않는다. |
| 4 | Brain: **목록 개수보다 먼저 읽는 양을 본다** | 화면의 대기 경계에서 조회·가공 비용으로 관점을 넓힌다. 기존 관계는 이 메모에서 앞 메모를 향하는 `extends`이며 양쪽 reader에서 탐색할 수 있다. |
| 5 | Brain: **보조 데이터가 없어져도 다시 만들 수 있을까** | 비용을 줄이는 보조 데이터가 사라졌을 때의 복구 조건을 질문한다. 기존 `questions` 관계로 앞 메모와 연결하며 구현 완료·운영 성과로 표현하지 않는다. |

Brain의 출처에서 Blog와 Portfolio로 돌아갈 수 있다. Blog의 ‘연결된 프로젝트’도 같은 Portfolio로 돌아간다. JavaScript를 끈 Portfolio에서는 기존 `noscript`의 **블로그 글 보기 → 목록 → 해당 글**을 사용했다. 직접 연결 영역이 표시되는 JS 환경과 이 경로를 구분했다.

Blog를 이어 읽을 때는 기존 시리즈 **H-Log에서 공개 글을 읽는 경계 만들기** (`h-log-public-reading`)를 사용한다.

| 순서 | 현재 검토본 제목 | 대상 slug · 역할 |
| --- | --- | --- |
| 1 | Next.js Suspense로 최근 글 조회와 홈 렌더링 분리하기 | `home-recent-posts` — 조회 대기와 홈 표시 |
| 2 | 공개 글을 읽을 때 비공개 버전까지 읽어야 할까 | `published-current-read-boundary` — 현재 공개 대상 조회와 후속 내용 검사 |
| 3 | 글을 고친 날짜와 내용을 확인한 날짜를 나누기 | `verification-and-revision-dates` — 확인 범위·수정 이유와 날짜 구분 |

소개 문구는 기존 코드의 “H-Log에서 글을 읽어 오는 과정과 공개할 정보를 나눈 기록입니다. 홈의 조회 대기, 현재 공개 버전 선택, 검증 범위와 수정 이유의 표시를 차례로 살펴봅니다.”를 유지한다. 공개된 편만 기존 순서로 표시하고 중간 편이 철회되면 건너뛴다. 모든 편이 비공개면 시리즈 영역도 없다. 새 주제 페이지나 편집 CMS는 추가하지 않았다. 이번 한 묶음은 기존 코드로 충분했으며 반복 편집 부담을 실사용으로 측정한 것은 아니다.

## 후보 변경과 보존

Git/Docker 제외 `private/r3-reading-path-2026-11-10/`에 `candidates.json`, `manifest.json`, `reading-guide.md`, 등록용 `*.body.md`, 격리 fixture와 검증 로그를 보관했다. 이전 원고·manifest·Brain 후보를 덮어쓰지 않았다.

Brain 후보 `hlog-home-wait-boundary`, `hlog-visible-count-read-cost`의 두 번째 출처만 다음 값으로 연결했다. 첫 번째 Portfolio 출처와 세 번째 복구 질문 후보의 링크 없는 출처는 유지했다.

```json
{
  "label": "Next.js Suspense로 최근 글 조회와 홈 렌더링 분리하기",
  "href": "/blog/home-recent-posts"
}
```

Brain의 본문·요약·질문·원문·종류·근거·사건일·태그 및 기존 연결 6개의 방향/종류/이유는 R2 후보와 동일하다. 새 사건일·감정·revises는 만들지 않았다. 공개 응답의 Blog 제목은 저장 label이 아니라 현재 공개 글 제목으로 갱신된다.

원고 3편은 기존 파일 SHA-256과 일치한다. 관리자 등록용 본문은 파일 맨 앞의 `# 제목`과 구분용 빈 줄만 떼고 title 필드와 분리했다. 줄바꿈을 LF로 정규화한 뒤 **떼어 낸 제목 + 본문 = 기존 원고**를 확인했다. 중복 H1을 발견한 첫 검수 뒤 이 등록용 사본으로 재실행했으며 원본 파일과 기술 내용은 그대로다. 각 본문 사본의 hash도 manifest에 기록했다.

| 입력 | 유지한 검토일 | 기존 원고 SHA-256 |
| --- | --- | --- |
| `private/r2-manuscript-2026-11-09/home-recent-posts.md` | 2026-11-09 | `854a92facedd8e118ee04eef056580aa99d1292fee62f4baccd630f3daf6ffa5` |
| `private/series-manuscripts-2026-10-21/published-current-read-boundary.md` | 2026-10-21 | `d37eb45b3993e41a11a2ab749851ac543f5a53c9f0feefbace55c3caa8ec4bcd` |
| `private/series-manuscripts-2026-10-21/verification-and-revision-dates.md` | 2026-10-21 | `118ff125a733621af763743f324d21e5e36edf984d1eb971d84cf472ed57040d` |

원고의 기존 claim ID·출처·검토일은 유지했다. 이번 결과는 탐색·공개 경계 검증이며 과거 테스트나 성능 측정을 오늘 다시 수행했다는 근거로 사용하지 않는다.

## 검증 결과

앱 디렉터리에서 Node 24.22.1과 기존 Next 개발 서버를 사용했다. 실행 코드와 공개 데이터 변경이 없어 Harness의 문서/비공개 후보 예외를 적용했다. 새 production 동작의 RED/GREEN 단계나 전체 lint/typecheck/build를 수행했다고 표시하지 않는다.

| 검사 | 결과 |
| --- | --- |
| 기존 focused 단위 | `blog-series.test.ts`, `blog-public.test.ts`, `brain.test.ts` **55 pass / 0 fail / 0 skip** |
| 후보 검사 | Markdown/JSON·Brain parser·기본 개인정보 검사 통과. 입력 22개 hash와 원고 내용·관계 이유·미확인 사건일 보존 |
| 메모리 공개 조합 | 글 3편 × Brain 3개 공개 여부의 **64조합**. 현재 제목·공개 집합·시리즈 순서/이전/다음·Portfolio/역방향 연결·빈 결과 확인 |
| 격리 DB | `blog-public-read-path.integration.test.ts` 및 `brain-postgres-repository.integration.test.ts` **4 pass / 0 fail / 0 skip**. 전자는 `npm run test:public-read-path`와 같은 suite |
| 실제 후보 저장 | 임시 DB에서 후보를 비공개 저장한 뒤 명시 공개. 기존 28노드/42관계 → 31노드/48관계. 반환된 note UUID로 후속 관계를 매핑 |
| HTTP | Portfolio·Blog·Brain의 HTML/RSC 왕복, `text/x-component` 확인. Blog 철회 후 출처 제목/href 제거·404, 중간 편 건너뛰기·빈 시리즈 생략 |
| Brain 공개 경계 | 미선택 private 수정 비노출, Blog 상태 변화 전후 저장 public_node 동일. Brain 철회 후 역방향/이웃 링크 제거·404, 세 후보 모두 철회하면 기존 28노드 유지 |
| 브라우저 | **1440/390/320px × JavaScript ON/OFF = 6조합**. Portfolio → Blog → 시리즈 후속 글 → 뒤로가기 → Brain 3개 → Blog → Portfolio. 키보드 Enter·뒤로가기·가로 넘침·pageerror·단일 H1 확인 |
| 문서·레지스트리 | Markdown 9개·JSON index 61개·추가/변경 상대 링크 22개 검사 통과. 전체 60 phase/209 step, R 8 완료/6 대기, F 22 대기 확인. 변경 범위와 git diff --check 통과 |
| 정리 | 검증용 컨테이너·서버·브라우저·임시 credential 파일 종료/정리. 운영 DB·외부 출처·provider 호출 없음 |

```powershell
node --no-warnings --experimental-strip-types private/r3-reading-path-2026-11-10/prepare.mjs
node --no-warnings --experimental-strip-types --test lib/blog-series.test.ts lib/blog-public.test.ts lib/brain.test.ts
# runner가 생성한 임시 loopback DB에서만 실행한 동일 suite
node --no-warnings --experimental-strip-types --test lib/brain-postgres-repository.integration.test.ts lib/blog-public-read-path.integration.test.ts
node --no-warnings --experimental-strip-types private/r3-reading-path-2026-11-10/run.mjs
git diff --check
```

기존 전체 lint의 private helper 오류와 build tracing 경고는 R3 Step 0 기록에 남아 있으며 이번 문서 전용 단계에서 해결하거나 재검증하지 않았다. 공개 상태 판정은 새 서버 응답 기준이다. 이미 열린 탭·다운로드·임의 Markdown 과거 링크를 회수하는 기능은 아니다.

## 실제 등록 시 인계

1. Blog 제목/설명은 manifest를, 본문은 `*.body.md`를 사용한다. 실제 공개할 버전을 다시 검수하고 기존 claim의 날짜를 새 검토일로 덮어쓰지 않는다.
2. Brain 후보는 위 읽기 순서로 비공개 저장한다. 후보 alias나 리허설 UUID는 실제 ID가 아니다. 저장 응답의 ID를 받아 다음 후보의 관계 target에 반영한다.
3. 본문·출처·관계와 공개 범위를 확인하고 기존 명시 공개 명령을 사용한다. 검수만으로 실제 공개가 이뤄진 것으로 표시하지 않는다. 사건일은 계속 비워 두며 저장일과 혼동하지 않는다.
4. 실제 공개 origin/현재 버전으로 Portfolio↔Blog↔Brain 링크를 다시 확인한다. 일부만 공개해도 현재 공개된 연결만 보이는 정책을 유지한다.

R3는 **2/2 완료**, R 트랙은 **completed 8 / pending 6**이다. 다음은 **R4 Step 0 `tag-alias-contract-and-projection`**. 전체 60 phase/209 step과 F 22개 pending은 유지한다. 실제 발행·운영 배포·DNS/TLS·timer·외부 AI 활성화는 수행하지 않았다.
