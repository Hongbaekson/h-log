# Step 2: local-editorial-pilot

## 개선 사항

초안 교정과 작성 흐름의 로컬 검증. 같은 phase Steps 0~1을 완료한 뒤 실행한다.

## 읽을 파일

경로는 저장소 루트 기준이다. 수정 전 아래 파일과 실제 caller를 확인한다. T1 Step 0 이후에는 그 단계에서 만든 작성 가이드와 비공개 검수 초안도 읽는다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/BLOG_EDITORIAL_READING_PLAN.md`
- `apps/h-log/.codex/docs/harness/BLOG_WRITING_GUIDE.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/phases/blog-writing-quality/index.json`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/lib/blog-hermes-article-provider.test.ts`
- `apps/h-log/lib/blog-article-generation.test.ts`
- `apps/h-log/lib/blog-daily-auto-article.test.ts`
- `apps/h-log/lib/blog-topic-research.test.ts`

## 작업

1. Step 0의 초안 2~3개를 BLOG_WRITING_GUIDE.md와 humanize-korean 기준으로 다시 읽고 제목·도입부·선택 이유·결과·한계를 교정한다. 이미 충분한 문장을 기계적으로 바꾸지 않는다.
2. 원본/교정본의 수치·코드·URL·조건·주장 강도와 개인 경험 범위를 비교하고 근거가 없는 문장은 분석 표현으로 낮추거나 제거한다. 최신성 조건이 필요한 검증 입력은 실제 확인 시각을 사용한다.
3. 기존 writer/daily/claim/privacy 테스트와 fake-provider 경로로 작성 입력부터 공개 전 gate까지의 계약을 확인한다. 외부 provider를 호출하지 않은 결과를 실제 모델 생성 품질 검증으로 기록하지 않는다.
4. 공개 가능한 검수 요약과 남은 질문을 작성 가이드에 남기고 전체 초안은 비공개로 보관한다. 그중 최소 1편은 후속 editorial-trust-and-series Step 2의 사례 후보로 연결한다.

## 인수 기준

2~3개 초안의 문체 수동 검토와 사실 보존 비교, 기존 gate 회귀 결과가 기록된다. 실제 provider 호출/발행 여부를 명시한다. synthetic 데이터와 실제 기록을 혼동하지 않는다.

## 검증

앱 명령은 `apps/h-log`에서 실행한다. 문서/콘텐츠 검토와 runtime 검증 결과를 구분한다.

node --no-warnings --test --experimental-strip-types lib/blog-hermes-article-provider.test.ts lib/blog-article-generation.test.ts lib/blog-daily-auto-article.test.ts lib/blog-topic-research.test.ts

콘텐츠/문서 파싱·링크·공개 가능 범위와 git diff --check를 추가 확인한다. 수정이 필요하면 이 step의 교정/검증 범위만 다루고 새 runtime 기능은 별도 step으로 남긴다.

완료 시 이 파일과 phase index에 변경 파일·명령·실제 결과·다음 step을 기록하고 전체 registry와 관련 계획을 동기화한다. 아직 실행하지 않은 항목은 pending으로 둔다.

## 하지 말 것

- 확인되지 않은 경험·성과·감정을 추가하지 말 것. 이유: 개인 기록의 사실 범위를 보존해야 한다.
- 회사 원문·내부 식별자·private 버전·토스 원문/이미지를 공개 콘텐츠로 복사하지 말 것. 이유: 승인된 근거와 자산만 사용한다.
- Home/레이더·Second Brain·무관한 schema나 기능을 변경하지 말 것. 이유: 이번 단위는 Blog의 문체와 읽기 개선이다.
- 저장 글을 일괄 수정/삭제하거나 OCI·실제 provider·자동 공개 발행·timer를 실행하지 말 것. 이유: 이 로컬 개선 계획은 기존 운영 보류와 발행 경계를 변경하지 않는다.

## 완료 기록 — 2026-10-15

- H-Log 최근 글 조회 경계(`project_record`)와 Redis Pub/Sub 전달 조건(`document_analysis`) 초안의 제목·요약·도입부·선택 이유·결과·한계를 검토했다. 11개 claim을 현재 코드·기존 검증 기록 및 공식 문서와 비교했다. 제목과 구조는 유지했다.
- 사실 검토에서 Redis `NOACK`의 설명을 새 메시지 조회로 한정했다. pending 이력과 `CLAIM` 회수의 예외를 공식 XREADGROUP 문서에서 확인했으며, 이 수정은 Korean 문체 교정과 따로 기록했다.
- `espada:humanize-korean`의 SKILL.md와 quick rules에 따라 산문 3곳만 교정했다. 사실 검토본과 교정본의 코드·inline code·URL·숫자·식별자·제목·표를 비교하고 경험 범위·조건·불확실성을 보존했다. 이전 Step 0 초안은 hash로 동일성을 확인했다.
- `private/blog-editorial-pilot-2026-10-15/`에 사실 검토본·교정본·manifest·검증 스크립트·결과·README를 보관했다. 전체 초안은 Git과 Docker에서 제외하며 앱 dependency나 DB seed로 연결하지 않았다.
- 공개 `BLOG_WRITING_GUIDE.md`에 검수 요약·남은 질문을 기록했다. H-Log 글은 `editorial-trust-and-series / Step 2`의 후보로 연결했으며 그 step과 시리즈 기능은 pending을 유지한다. PRD·문체 계획·공개 경험/구현/자동화 계획 및 phase registry를 동기화했다. runtime 구조가 같아 ADR/ARCHITECTURE는 변경하지 않았다.

### 검증 결과

앱 디렉터리에서 실행했다.

| 명령 | 결과 |
| --- | --- |
| `node --no-warnings --test --experimental-strip-types lib/blog-hermes-article-provider.test.ts lib/blog-article-generation.test.ts lib/blog-daily-auto-article.test.ts lib/blog-topic-research.test.ts` | 39/39 통과 |
| `node --no-warnings --experimental-strip-types private/blog-editorial-pilot-2026-10-15/verify.mjs` | 두 초안·실패 경로의 5개 시나리오 통과. 보호 항목·기준 초안 hash·코드 근거 hash와 Git/Docker 제외 확인 |

준비한 초안을 실제 Hermes adapter의 test double 응답으로 사용하고 daily pipeline의 입력·mode·JSON·schema/privacy/claim 검증과 공개 전 handoff까지 확인했다. topic routing과 usage는 synthetic이며 persistence callback은 메모리에만 보관한다. 성공 2건은 `publishing`/queued jobs, 공개 selector 0건이다. 잘못된 sourceId·synthetic 내부 URL·writer block 3건은 저장 callback 전에 실패했다. 최초 검사에서는 모의 응답이 정규화 전 URL을 사용해 실패했고 verified INPUT의 URL을 선택하도록 로컬 검증 스크립트만 수정해 재검증했다.

공식 자료를 실제 읽은 시각 `2026-10-15T05:33:14.000Z`를 freshness 입력에 사용했고 파일의 검수 날짜를 새 수집 시각으로 대신하지 않았다. 기존 gate가 자료의 의미나 자연스러운 문체를 자동 판정한다고 해석하지 않는다. 의미 일치는 수동 검토이며 실제 provider·Redis·브라우저 실행, DB 저장·공개 발행·OCI·timer 변경은 하지 않았다. 프로덕션 코드나 UI 변경이 없어 TDD·전체 build/integration·뷰포트 검증은 추가하지 않았다.

저장소 루트의 `node apps/h-log/private/blog-editorial-pilot-2026-10-15/verify-docs.mjs`로 Markdown 8개·변경 JSON·상대 링크 50개·읽을 파일 경로 38개, 전체 41개 phase/145개 step, 비공개 문서/JSON 7개와 링크 7개를 검증했다. 이 Step 2와 해당 phase 외의 상태는 유지했고 runtime diff가 없음을 확인했다. Git/Docker 제외 규칙과 `git diff --check`도 통과했다.

**T1 Steps 0–2 완료. 다음은 T2 `blog-list-presentation / Step 0: readable-post-rows`**다. 검토한 초안의 제목·요약으로 일반 목록과 검색 결과를 확인한다. 실제 모델의 생성 품질과 운영 지연, Redis 재연결·중복 처리·보관 조건 검증은 남아 있다.
