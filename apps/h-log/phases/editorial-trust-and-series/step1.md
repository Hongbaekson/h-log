# Step 1: ordered-series

## 개선 사항

순서가 있는 시리즈. 같은 phase의 Step 0 완료 후 실행한다.

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
- `apps/h-log/.codex/docs/harness/BLOG_SERIES_MANUSCRIPT_REVIEW.md`
- `apps/h-log/phases/editorial-trust-and-series/index.json`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

실제 공개 가능한 관련 글 3편 이상이 모인 주제 하나에 시리즈명·소개·글 순서를 연결한다. 태그/글 유형/시리즈의 역할을 구분하고 기존 글 URL을 유지한다. 내용이 없으면 fixture를 공개 콘텐츠로 채우지 않고 준비 조건을 기록한다.

## 인수 기준

시리즈 순서·이전/다음·비공개 글 제외·철회 뒤 빈 시리즈 처리·canonical이 일관된다. 신규 persistence는 DB integration으로 검증한다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts
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

## 준비 확인 — 2026-10-21

당시 상태는 `blocked`였다. 로컬 검수 초안은 H-Log 구현 기록과 Redis 문서 분석 각 1편이며, 같은 주제로 공개 가능한 3편이 준비되지 않았다. UI 검수 DB의 초안 복사본·합성 글을 편수에 포함하지 않았다. 운영 DB의 글 수는 조사하지 않았다.

[첫 시리즈 준비 기록](../../.codex/docs/harness/BLOG_SERIES_READINESS.md)에 글별 상태, H-Log 시리즈 3편 구성안, 근거 파일, 미작성 2편, 후보 slug와 프로젝트 연결 slug의 차이, 구현 재개 조건을 남겼다. 시리즈 UI·저장 계층·공개 글은 추가하지 않았다. 기존 인수 기준은 미충족이므로 completed로 표시하지 않는다.

다음은 [Step 2: decision-record-case-study](step2.md)의 기존 첫 글 검토다. Step 0 완료와 이 준비 확인을 전제로 Step 2를 먼저 실행하며, 그 뒤 이 Step 1에서 나머지 원고 준비와 시리즈 구현을 이어간다. 실제 운영 발행을 구현의 선행 조건으로 요구하지 않는다.

문서 전용 검증: 앱 디렉터리에서 `node private/series-readiness-check/verify.mjs`로 초안 manifest·원고 존재/제외, Markdown·추가/변경된 상대 링크 28개, phase JSON 42개·상태·15/19 완료 개수·다음 단계 연결을 확인했고 `git diff --check`도 통과했다. 앱 코드·DB·UI는 변경하지 않아 해당 실행 검증은 이번 결과에 포함하지 않는다.

### Step 2 완료 후 이어갈 일 — 2026-10-21

Step 2에서 첫 H-Log 원고의 선택 이유·대안·검증 시점 검토를 마쳤다. [검수 기록](../../.codex/docs/harness/BLOG_CASE_STUDY_REVIEW.md)을 읽고 [시리즈 구성안](../../.codex/docs/harness/BLOG_SERIES_READINESS.md)의 나머지 원고 2편을 준비한다. 이 콘텐츠 준비는 다음에 실행할 수 있는 작업이다. 이 step의 시리즈 구현은 여전히 blocked이며 원고 3편 준비와 기능 검증을 마쳐야 완료할 수 있다. 과거 자료를 재확인하지 않고 시각만 갱신하거나 새 글을 실제 장애/운영 성과로 꾸미지 않는다.

### 원고 준비 완료 — 2026-10-21

위 후속 작업으로 공개 현재 버전 조회와 검증·수정 날짜를 다룬 원고 2편을 준비했다. 기존 Step 2 원고와 합쳐 관련 글 3편이 준비돼 콘텐츠 부족 사유를 해제하고 **현재 상태를 `pending`으로 변경**했다. 시리즈 기능은 아직 구현하지 않았으므로 completed는 아니다.

[원고 준비 결과](../../.codex/docs/harness/BLOG_SERIES_MANUSCRIPT_REVIEW.md)에 시리즈명·소개·읽기 순서·구현 대상 slug와 신규 주장 18개의 근거를 남겼다. 공개 코드·변경 기록과 격리 테스트에 근거하며 운영 장애·성능 측정 경험을 만들지 않았다. 사실 검토 뒤 Korean 스킬로 산문 4곳을 교정했고 코드·표·숫자·URL 등 보호 항목을 보존했다. 첫 글의 본문/hash·기존 입력·자료 확인 시각도 유지했다. 전체 원고와 근거 대장은 Git/Docker 제외 경로에 보관했고 실제 발행은 하지 않았다.

검증: 앱 디렉터리에서 `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-content-model.test.ts` **61/61**, `node private/series-manuscripts-2026-10-21/run-integration.mjs` **7/7**을 통과했다. 원고 파싱/hash·기본 privacy·비공개 selector·보호 항목과 문서/JSON 검증 명령은 원고 준비 결과에 기록했다. 앱 코드·UI 변경은 없어 lint·typecheck·build·브라우저 검수는 실행하지 않았다.

다음은 이 step의 **시리즈 기능 구현**이다. `h-log-public-reading`의 명시적 순서를 기존 공개 selector와 글 URL에 연결하는 최소 변경부터 시작한다. 비공개/철회 글 제외, 시리즈 안의 이전/다음, 빈 영역 생략, canonical 유지의 RED→GREEN과 화면 검수를 완료해야 이 step을 완료한다. 운영 선발행은 필요하지 않다.
