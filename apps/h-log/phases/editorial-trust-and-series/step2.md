# Step 2: decision-record-case-study

## 개선 사항

선택과 재검증 기록 하나. 같은 phase의 Step 0 완료 후 실행한다. Step 1이 콘텐츠 부족으로 blocked이고 준비 조건을 기록했다면, 시리즈 UI와 독립적인 이 초안 검토를 먼저 진행한다. Step 1을 완료 처리하거나 인수 기준을 생략하는 예외는 아니다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 아래 파일과 수정 대상의 실제 caller를 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`
- `apps/h-log/.codex/docs/harness/BLOG_SERIES_READINESS.md`
- `apps/h-log/phases/editorial-trust-and-series/index.json`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/blog-article-generation.ts`
- `apps/h-log/lib/blog-topic-research.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-public.ts`

## 작업

실제 공개 가능한 경험 하나를 선택해 문제·대안·선택 이유·검증 결과·한계 구조의 초안을 준비한다. AI 협업 사례라면 명세/수정 판단/테스트 결과를 연결한다. source 수집은 기존 freshness/claim/privacy 계약을 따르고 글 공개는 별도 운영 경계에 둔다.

2026-10-15 추가한 [문체·읽기 개선 계획](../../.codex/docs/harness/BLOG_EDITORIAL_READING_PLAN.md)의 `blog-writing-quality`에서 적합한 검토 초안이 준비됐다면 재사용한다. 이 step의 근거·검증 범위·시점 기준을 다시 확인하며 같은 초안을 중복 작성하지 않는다. T1 초안 검토만으로 이 step이나 시리즈 기능을 완료 처리하지 않는다.

T1 Step 2에서 **최근 글 조회가 늦어져도 홈은 먼저 보여주기**를 사례 후보로 연결했다. [작성 가이드의 검수 요약](../../.codex/docs/harness/BLOG_WRITING_GUIDE.md)을 먼저 확인하고 로컬 비공개 교정본을 재사용한다. 확인한 구현 선택·기존 검증과 미측정 운영 조건을 구분한 글이며, 이 단계에서는 대안·선택 이유의 근거와 검증 시점을 다시 확인한다. 초안을 쓸 수 없으면 원본 근거를 다시 확인하며 운영 성과나 경험을 만들어 채우지 않는다. 이 step은 pending을 유지한다.

## 인수 기준

각 경험/성과 주장의 근거와 공개 가능 여부가 확인된다. 초안을 실제 발행 완료로 표시하지 않으며 수집 시각만 바꿔 오래된 자료를 재검증한 것처럼 만들지 않는다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 바꾸는 public behavior의 RED를 확인한 뒤 최소 구현으로 같은 테스트의 GREEN을 확인한다. 순수 콘텐츠/문서 변경은 파서·링크·형식 검증으로 대체한다.
2. UI는 개발 서버와 격리 local DB의 synthetic fixture로 1440/390/320px, focus, 긴 글, 빈/오류 상태를 확인한다. DB/repository/worker/migration 변경 시 `npm run test:integration`을 추가한다.
3. phase index와 이 step에 실제 결과·검증 command·다음 단계를 기록한다. 완료된 기능만 completed로 표시한다.

## 하지 말 것

- 레이더의 데이터·축·형태·배치·주변 영역을 변경하지 말 것. 사용자가 명시적으로 보존을 요청했다.
- 저장 Markdown/HTML/hash나 기존 URL을 무단 재작성하지 말 것. 발행 무결성과 기존 링크를 유지해야 한다.
- raw HTML 주입, private 글/내부 evidence/근거 없는 실적 노출을 허용하지 말 것. 공개 콘텐츠 경계를 유지해야 한다.
- OCI·DNS/TLS·운영 timer·실제 provider 호출·공개 발행을 실행하지 말 것. 로컬 개선 계획이며 기존 OCI 보류는 유지된다.
