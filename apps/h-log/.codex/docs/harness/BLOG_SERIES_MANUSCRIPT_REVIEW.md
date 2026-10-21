# 시리즈 원고 3편 준비 결과

검수일: 2026-10-21. [Phase 5 Step 1](../../../phases/editorial-trust-and-series/step1.md)의 콘텐츠 준비 작업으로 원고 2편을 작성했다. 기존 [첫 글의 사례 검수본](BLOG_CASE_STUDY_REVIEW.md)과 합쳐 관련 원고 3편이 준비됐으며, 콘텐츠 부족 사유를 해제한다. **Step 1은 pending**이다. 시리즈 기능과 화면 검증을 완료한 것은 아니다.

## 시리즈명과 읽기 순서

시리즈명: **H-Log에서 공개 글을 읽는 경계 만들기**

소개: H-Log에서 글을 읽어 오는 과정과 공개할 정보를 나눈 기록입니다. 홈의 조회 대기, 현재 공개 버전 선택, 검증 범위와 수정 이유의 표시를 차례로 살펴봅니다.

| 순서 | 제목 | 구현에 사용할 slug | 원고 상태 |
| --- | --- | --- | --- |
| 1 | 최근 글 조회가 늦어져도 홈은 먼저 보여주기 | `home-recent-posts` | Step 2 검수본 재사용, 본문·hash 유지 |
| 2 | 공개 글을 읽을 때 비공개 버전까지 읽어야 할까 | `published-current-read-boundary` | 신규 원고·주장 8개 검수 완료 |
| 3 | 글을 고친 날짜와 내용을 확인한 날짜를 나누기 | `verification-and-revision-dates` | 신규 원고·주장 10개 검수 완료 |

첫 글의 slug는 기존 [프로젝트 연결](../../../lib/portfolio-posts.ts)에 맞췄다. 이전 초안 manifest의 후보 주소는 보존하며 실제 공개 URL을 바꾸지 않았다. 위 slug는 로컬 구현 대상이며 운영 DB의 존재 여부를 확인하거나 글을 발행했다는 뜻은 아니다. 시리즈 식별자는 `h-log-public-reading`으로 정했다.

신규 두 글은 `project_record` 유형이다. 태그는 각각 PostgreSQL/공개 조회/개발 기록, 콘텐츠 모델/검증 기록/개발 기록으로 정리했다. 각 글은 조회 대기, 읽는 버전의 범위, 독자에게 설명할 확인 범위를 다루며 같은 원고를 분할해 편수를 늘리지 않았다. Redis 문서 분석 글과 UI용 합성 글은 시리즈에서 제외한다.

## 원고의 근거

코드 기준은 `27725e9f46ed552d8319f0d589067a6bd6b9e5c7`이다. 신규 원고의 주장 18개마다 근거와 한계를 검토했다.

| 글 | 확인한 설명 | 근거와 판정 |
| --- | --- | --- |
| 2 | 모든 글/버전을 읽던 조회를 SQL 후보부터 제한 | `8015eb7`의 실제 repository diff. 변경 전후 읽기 범위를 확인했으며 정보 유출 사고로 표현하지 않음 |
| 2 | 발행 상태·현재 버전·소유 관계와 slug parameter | [repository](../../../lib/blog-postgres-repository.ts), [공개 판정](../../../lib/blog-content-model.ts)의 현재 코드 |
| 2 | 후보의 본문 검사 후 태그·출처·현재 버전 자산까지 재검사 | repository와 관련 통합 테스트. SQL 조건과 내용 검사의 역할을 구분 |
| 2 | 기존 공개 판정 유지, index/페이지 나누기 제외 | [당시 작업 범위](../../../phases/public-read-boundary-hardening/step0.md). 대안 비교는 이번 코드 분석이며 쿼리 비용 측정으로 표현하지 않음 |
| 2 | 공개 조회 결과와 소비 경로 검증 | repository·public-read integration. 실제 SQL 문장은 코드로 확인했으며 쿼리 로그·운영 부하·동시 발행/철회 경합 검증은 주장하지 않음 |
| 3 | 상태 갱신·수집·버전 생성·발행과 확인 날짜 구분 | [ADR-035](ADR.md), repository의 철회 갱신, content model |
| 3 | 현재 버전에 선별한 공개 기록과 확인 방법/범위/한계 | [editorial parser](../../../lib/blog-editorial.ts), [상세 화면](../../../app/blog/[slug]/page.tsx). 과거 비공개 버전이나 내부 감사 기록으로 자동 생성하지 않음 |
| 3 | DB 객체 제약과 parser 검사, 저장 거절과 읽기 생략 | [migration 005](../../../migrations/005_blog_public_editorial.sql), repository·parser. 글 자체의 기존 공개 판정은 유지 |
| 3 | 선택적 기록, 원문/hash 보존과 상세 날짜 누락 처리 | public/model/detail 코드와 테스트. 목록·탐색의 날짜 fallback은 남아 있음을 명시 |
| 3 | 로컬 테스트와 과거 화면 기록의 범위 | 이번 unit/integration 결과와 [2026-10-20 검수 기록](../../../phases/editorial-trust-and-series/step0.md). 브라우저·운영 migration은 새로 수행하지 않음 |

공개 H-Log 코드·변경 기록과 합성 테스트 결과만 사용했다. 회사 원문, 내부 주소·접속 정보, 성능 개선 수치나 실제 장애 경험을 원고에 넣지 않았다. 외부 자료를 새로 수집하지 않았고 첫 글의 React 자료 확인 시각도 바꾸지 않았다. 향후 자동 발행에 넣을 때는 기존 freshness/claim/privacy 계약을 다시 확인해야 한다.

## 문체와 보관

사실 검토본을 먼저 작성하고 `espada:humanize-korean`으로 산문 4곳을 다듬었다. 사실 검토본과 최종 교정본의 제목·코드·표·식별자·URL·숫자·날짜를 비교해 동일함을 확인했다. 과거 경험, 이번 분석과 미검증 범위가 교정 뒤에도 구분되는지 수동 검토했다.

두 원고의 사실 검토본·최종본·주장 대장·시리즈 순서·검수 결과는 Git/Docker 제외 경로 `private/series-manuscripts-2026-10-21/`에 있다. 첫 글은 `private/case-study-review-2026-10-21/home-recent-posts.md`를 그대로 참조한다. 세 글 모두 비공개 원고이며 공개 DB에 넣지 않았다. 본문 확인 링크는 원고 안에 공개 저장소의 고정 commit URL로 연결했다.

## 검증 결과

앱 디렉터리에서 다음을 실행했다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-content-model.test.ts
node private/series-manuscripts-2026-10-21/run-integration.mjs
node --no-warnings --experimental-strip-types private/series-manuscripts-2026-10-21/verify.mjs
node private/series-manuscripts-2026-10-21/verify-docs.mjs
git diff --check
```

- 단위 테스트 **61/61**, 격리 DB 통합 테스트 **7/7** 통과. 실패·skip 없음. 통합 검증은 migration 1개, repository 5개, public-read 1개다. 기존 로컬 클러스터의 테스트용 DB 이름이 비어 있는지 확인한 뒤 실행했고 각 suite가 생성한 DB만 정리했다.
- 원고 3편의 Markdown/HTML/hash와 공개 읽기 모델 파싱, SQL 코드와 실제 소스 일치, 기본 privacy 검사를 통과했다. 메모리의 `drafted` 원고 3편은 공개 selector에서 모두 제외됐다. 파싱용 메모리 투영과 실제 발행을 구분했다.
- 신규 주장 18개·산문 교정 4곳·근거 파일 17개의 hash, 이전 입력 3개의 보존을 확인했다. 첫 글의 본문/hash와 이전 sourceReviewedAt은 유지했다.
- 변경 문서/JSON 11개·추가/변경된 상대 링크 39개·전체 phase JSON 42개와 상태/다음 단계 정합성, `git diff --check`를 통과했다. 문서 검증 스크립트의 첫 실행은 manifest 속성명 오기로 실패했고 실제 `members/targetSlug`에 맞춰 수정한 뒤 재실행했다. 앱 코드·UI를 바꾸지 않아 lint·typecheck·build·브라우저 검수는 이번 실행 결과에 포함하지 않는다.

## 다음 작업

공개 경험 개선은 **16/19개 step 완료, 0개 blocked, 3개 pending**이다. 다음은 Step 1의 **시리즈 기능 구현**이다. 위 순서와 slug를 사용하되 공개 화면에는 현재 published 버전만 표시한다. 기존 URL·원문/hash·레이더를 보존하고, 비공개/철회 글 제외·이전/다음·빈 시리즈·canonical·화면 검수를 마쳐야 Step 1을 completed로 바꾼다. 실제 운영 발행은 구현의 선행 조건이 아니다.
