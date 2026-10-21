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

T1 Step 2에서 **최근 글 조회가 늦어져도 홈은 먼저 보여주기**를 사례 후보로 연결했다. [작성 가이드의 검수 요약](../../.codex/docs/harness/BLOG_WRITING_GUIDE.md)을 먼저 확인하고 로컬 비공개 교정본을 재사용한다. 확인한 구현 선택·기존 검증과 미측정 운영 조건을 구분한 글이며, 이 단계에서는 대안·선택 이유의 근거와 검증 시점을 다시 확인한다. 초안을 쓸 수 없으면 원본 근거를 다시 확인하며 운영 성과나 경험을 만들어 채우지 않는다. 이전 문체 검토만으로 이 step을 완료 처리하지 않는다.

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

## 완료 기록 — 2026-10-21

- 기존 **최근 글 조회가 늦어져도 홈은 먼저 보여주기** 초안을 재사용했다. ADR-032·현재 caller/selector/loader와 테스트를 대조해 문제·대안·선택 이유·검증 결과·한계가 이어지도록 보완했다. 대안은 이번 코드 검토의 분석이며 당시 구현·성능 비교를 했다고 쓰지 않았다.
- 날짜 fallback, 전체 공개 조회와 모델 처리 비용, 전체 페이지 GET 재시도와 해당 catch의 로그 범위를 명확히 했다. 과거 35개 테스트·DB 지연·모바일 검증은 저장소의 과거 기록으로 남기고 이번 44개 테스트 실행과 구분했다. 과거 임시 실행 자료를 현재 경로에서 확인하지 못했고 DB·브라우저를 새로 실행하지 않았다.
- claim 11개의 근거·공개 가능 범위를 검토했다. 실제 확인한 React 문서만 새 검수 시각을 기록하고 기존 대장의 자료 시각·초안은 보존했다. 회사 내용·운영 수치·AI 협업 이력을 만들어 추가하지 않았다.
- 사실 보완본을 만든 뒤 Korean 스킬로 산문 3곳을 교정하고 코드·숫자·날짜·URL·제목·표와 의미를 비교했다. 원고·대장·검수 스크립트·결과는 Git/Docker 제외 경로 `private/case-study-review-2026-10-21/`에 있다. 공개 가능한 검수 요약은 [BLOG_CASE_STUDY_REVIEW.md](../../.codex/docs/harness/BLOG_CASE_STUDY_REVIEW.md)에 기록했다.
- `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts`: 44/44 통과, 실패·skip 없음. `node --no-warnings --experimental-strip-types private/case-study-review-2026-10-21/verify.mjs`: 원고 파싱/hash, 근거 파일 11개 보존, 보호 항목·기본 privacy·비공개 selector 0건 확인. `node private/case-study-review-2026-10-21/verify-docs.mjs`로 Markdown·상대 링크 37개·phase JSON 42개/상태·다음 단계 정합성을 확인했고 `git diff --check`도 통과했다. 앱 코드 변경이 없어 lint·typecheck·build·DB integration·브라우저는 이번 검증에서 제외한다.

Step 2만 completed로 바꾼다. 실제 발행과 시리즈 기능은 완료하지 않았다. 다음은 [Step 1](step1.md)의 나머지 원고 2편 준비이며, 관련 글 3편의 준비 조건을 통과한 뒤 시리즈 구현을 진행한다.
