# Step 1: evidence-preserving-writer-style

## 개선 사항

기존 글 생성 지침에 한국어 문체 연결. 같은 phase Step 0의 작성 가이드와 검토한 일반화 예문이 준비되어야 한다.

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
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/blog-writing-quality/index.json`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/lib/blog-hermes-article-provider.ts`
- `apps/h-log/lib/blog-hermes-article-provider.test.ts`
- `apps/h-log/lib/blog-article-generation.ts`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- `apps/h-log/lib/blog-topic-research.ts`

## 작업

1. Step 0에서 만드는 BLOG_WRITING_GUIDE.md와 현재 prompt/caller를 읽고, 한국어 문체·유형별 설명 순서·짧은 일반화 예문·사실 보존 점검을 기존 writer prompt에 필요한 만큼만 반영한다.
2. 기존 no-tool 단일 provider 호출, JSON 출력, verified INPUT, source/claim 일치, article mode와 publishDecision 계약을 그대로 유지한다. 정적 문체 규칙 주입을 persona feedback learning 활성화로 표현하지 않는다.
3. provider test double로 실제 전달되는 prompt와 출력 처리 경로를 검증한다. 코드 문자열을 그대로 복제한 테스트 대신 입력 근거·mode·출처 제약과 문체 지침이 함께 전달되는지 확인한다.
4. 별도 LLM 교정 호출이나 도구 권한을 추가하지 않는다. 구현 후 PRD/ARCHITECTURE와 자동화 계획의 미연결 상태 중 실제 바뀐 부분만 갱신한다.

## 인수 기준

기존 writer가 작성 가이드의 규칙을 받고 factual/experience 경계를 유지한다. malformed output, unsupported claim, privacy 실패는 계속 차단된다. 테스트는 호출 계약을 검증하며 실제 생성 문체 평가는 Step 2와 구분한다.

## 검증

앱 명령은 `apps/h-log`에서 실행한다. production behavior 변경은 가까운 실패를 먼저 확인한 뒤 같은 검증의 GREEN을 남긴다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-hermes-article-provider.test.ts lib/blog-article-generation.test.ts lib/blog-daily-auto-article.test.ts lib/blog-topic-research.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```



완료 시 이 파일과 phase index에 변경 파일·명령·실제 결과·다음 step을 기록하고 전체 registry와 관련 계획을 동기화한다. 아직 실행하지 않은 항목은 pending으로 둔다.

## 하지 말 것

- 확인되지 않은 경험·성과·감정을 추가하지 말 것. 이유: 개인 기록의 사실 범위를 보존해야 한다.
- 회사 원문·내부 식별자·private 버전·토스 원문/이미지를 공개 콘텐츠로 복사하지 말 것. 이유: 승인된 근거와 자산만 사용한다.
- Home/레이더·Second Brain·무관한 schema나 기능을 변경하지 말 것. 이유: 이번 단위는 Blog의 문체와 읽기 개선이다.
- 저장 글을 일괄 수정/삭제하거나 OCI·실제 provider·자동 공개 발행·timer를 실행하지 말 것. 이유: 이 로컬 개선 계획은 기존 운영 보류와 발행 경계를 변경하지 않는다.
