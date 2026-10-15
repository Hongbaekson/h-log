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

## 완료 기록 — 2026-10-15

- `BLOG_WRITING_GUIDE.md`에 제목·요약·도입부, 다섯 article mode의 전개, 자연스러운 한국어, 근거/추론 구분과 사실을 보존하는 교정 기준을 정리했다. 원본 사실 수정과 문체 교정을 별도 작업으로 구분한다.
- 초안 2개를 준비했다. **최근 글 조회가 늦어져도 홈은 먼저 보여주기**는 H-Log 코드와 기존 검증 기록에 근거한 `project_record`, **Redis Pub/Sub을 쓰기 전에 정할 메시지 유실 기준**은 공식 Pub/Sub·XREADGROUP·XACK 문서에 근거한 `document_analysis`다.
- 앱의 기존 `private/` 아래 `blog-writing-baseline-2026-10-15` 묶음에 원본·교정본, README, 11개 claim의 근거/미확인 조건, 검증 스크립트와 결과를 보관한다. README가 다음 세션의 시작점이다. 이 자료를 앱에서 import하거나 공개 DB에 저장하지 않았다.
- 설치된 `espada:humanize-korean`과 quick rules로 산문 10곳을 교정했다. 원본/교정본의 코드·inline code·URL·숫자·식별자·제목·표는 동일하며 의미·조건·불확실성·계획/완료 구분도 수동 비교했다.
- `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts`: **35/35 통과**. 초안이 인용한 기존 선택 로직을 재확인한 것이며 UI나 DB 통합 검증을 이번에 다시 실행한 것은 아니다.
- 비공개 묶음의 `verify.mjs`: Markdown 6개 파싱, claim 11개 참조, 상대 링크 7개, 파일 8개의 Git 제외 및 Docker `private` 제외, 보호 항목 비교를 통과했다. source 확인 날짜를 자동 생성의 freshness 검증 결과로 사용하지 않는다.
- 공개 가이드·계획의 Markdown/JSON·링크/읽기 경로 검사와 `git diff --check`를 완료했다. 문서/콘텐츠만 변경했으므로 앱 build와 UI 검증은 실행하지 않았다.
- writer runtime 지침·실제 provider·발행·운영 환경은 변경하지 않았다. 초안은 소유자가 읽을 수 있는 비공개 검토본이며 실제 모델 생성 문체를 검증한 결과로 보고하지 않는다.

다음은 **Step 1: evidence-preserving-writer-style**이다. 이 cycle에서 구현하지 않았다.
