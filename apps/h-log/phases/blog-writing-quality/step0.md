# Step 0: verified-writing-baseline

## 개선 사항

실제 기술 초안과 한국어 작성 기준. 이 추가 트랙의 첫 단계다. 기존 공개 경험 phase를 완료 처리하지 않고 독립적으로 시작한다.

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
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/phases/blog-writing-quality/index.json`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/blog-topic-research.ts`
- `apps/h-log/lib/blog-hermes-article-provider.ts`

## 작업

1. 공개된 H-Log 프로젝트·검증된 코드/기록에서 서로 다른 유형의 기술 글 2~3개를 고른다. 최소 1개는 확인된 구현/검증 기록, 1개는 자료 분석으로 구성하고 근거·작성자 경험·추론을 구분한다.
2. 전체 초안과 근거 대장은 private/ 제외 규칙을 확인한 뒤 비공개로 준비한다. 독립 세션에서 재사용할 파일 위치와 검토 상태를 기록하되 원문·내부 경로를 공개 문서에 복사하지 않는다.
3. 커밋 가능한 `apps/h-log/.codex/docs/harness/BLOG_WRITING_GUIDE.md`를 작성한다. 자연스러운 한국어, 제목·도입부, 글 유형별 전개, 사실/코드/출처 보존, 직접 경험과 분석 표현을 일반화한 예문으로 설명한다.
4. 설치된 espada:humanize-korean SKILL.md를 읽고 초안을 교정한다. 기존 자동화 계획의 persona 초안을 고정 목차로 적용하지 않으며 확인되지 않은 수치·실패·감정은 추가하지 않는다.

## 인수 기준

초안 2~3개의 유형·근거·미확인 부분이 구분되고 작성 가이드가 완성된다. 원본과 교정본의 사실·수치·코드·출처 차이를 검토한다. 초안·예문을 published 글이나 LLM 품질 검증 완료로 표시하지 않는다.

## 검증

앱 명령은 `apps/h-log`에서 실행한다. 문서/콘텐츠 검토와 runtime 검증 결과를 구분한다.

Markdown 파싱과 문서 링크·참조 경로를 검사한다. private/ 초안이 git check-ignore로 제외되는지 확인하고 git diff --check를 실행한다.

완료 시 이 파일과 phase index에 변경 파일·명령·실제 결과·다음 step을 기록하고 전체 registry와 관련 계획을 동기화한다. 아직 실행하지 않은 항목은 pending으로 둔다.

## 하지 말 것

- 확인되지 않은 경험·성과·감정을 추가하지 말 것. 이유: 개인 기록의 사실 범위를 보존해야 한다.
- 회사 원문·내부 식별자·private 버전·토스 원문/이미지를 공개 콘텐츠로 복사하지 말 것. 이유: 승인된 근거와 자산만 사용한다.
- Home/레이더·Second Brain·무관한 schema나 기능을 변경하지 말 것. 이유: 이번 단위는 Blog의 문체와 읽기 개선이다.
- 저장 글을 일괄 수정/삭제하거나 OCI·실제 provider·자동 공개 발행·timer를 실행하지 말 것. 이유: 이 로컬 개선 계획은 기존 운영 보류와 발행 경계를 변경하지 않는다.
