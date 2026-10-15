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
