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

### 구현 완료 — 2026-10-22

**Step 1과 Phase 5 전체를 completed로 변경했다.** 원고 준비 뒤 시리즈 기능과 로컬 검증을 완료했다. 공개 경험 개선은 **17/19개 step 완료, 0개 blocked, 2개 pending**이며 다음은 [backend-operations-lab / Step 0](../backend-operations-lab/step0.md)이다.

- `lib/blog-series.ts`에 시리즈명·소개·명시적 slug 순서와 공개 목록/이전·다음 계산을 추가했다. 기존 공개 판정을 재사용해 현재 제목·기존 URL만 반환하며 철회·비공개·누락 글을 제외한다. 원래 편 번호는 유지하고 0편이면 시리즈도 생략한다.
- `BlogSeries`를 기본 목록 첫 페이지와 글 상세에 연결했다. 검색·태그 결과는 기존 구성을 유지한다. 상세는 native details·현재 편 표시를 제공하고 하단 이동은 시리즈 내부 순서를 따른다. 시리즈가 없는 글의 기존 날짜순 이동과 관련 글은 유지한다.
- [ADR-036](../../.codex/docs/harness/ADR.md)에 정적 편집 목록을 선택한 이유와 한계를 기록했다. 새 DB/schema/API·의존성·시리즈 URL을 추가하지 않았다. 원문/HTML/hash·canonical과 Home/레이더·Second Brain은 변경하지 않았다.

검증 명령은 앱 디렉터리 기준이다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-series.test.ts lib/blog-public.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
node private/series-check/integration.mjs
node private/series-check/red.mjs
node private/series-check/check.mjs
node private/series-check/failure.mjs
node private/series-check/verify-docs.mjs
git diff --check
```

- RED: 시리즈 모델 부재와 이전/다음 함수 부재를 각각 확인한 뒤 구현했다. 브라우저에서도 기본 목록의 시리즈 영역 0건을 확인했다. GREEN: focused **47/47**, unit **225 pass / 14 DB skip**, public-read integration **1/1**, lint·typecheck·build 통과. 이 변경은 DB/repository를 수정하지 않아 나머지 DB suite는 재실행하지 않았다.
- 1440/390/320px에서 순서·현재 표시·앞/중간/마지막 이동, 기존 canonical, 검색/태그 목록, 긴 텍스트·키보드 초점을 확인했다. 격리 DB에서 중간 글 철회·초안·현재 버전 누락·관계 privacy 위반, 공개 1편/0편, 전체 빈 목록과 private 404를 확인했다. JavaScript 없는 펼치기·글 이동, 저장 Markdown/HTML/hash와 Markdown endpoint 보존도 통과했다. 브라우저 page error는 0건이다.
- 빌드 후 별도 로컬 운영 모드에서 DB 연결 실패 시 일반 오류 안내·시리즈 미표시·동일 URL 재시도를 확인했다. standalone 배포 이미지 검증은 이번 범위가 아니다.
- 변경 파일 16개 중 문서/JSON 11개, 추가/변경 상대 링크 15개, 전체 phase JSON 42개와 완료 개수·다음 단계 정합성을 확인했다. 기존 원고 3편의 파일 hash와 Home/레이더·Second Brain의 변경 없음, `git diff --check`도 확인했다.
- 검수 setup의 합성 태그 ID 누락은 트랜잭션이 롤백된 빈 DB를 확인한 뒤 수정했다. 초점 검증의 초기 2px 고정값은 공통 3px 스타일을 확인해 2px 이상 조건으로 바로잡았다. 제한된 실행 환경의 빌드가 최적화 단계에서 멈춰 해당 빌드 프로세스만 종료했고, 권한을 넓힌 동일 명령은 통과했다.

검수용 코드·합성 자료·로그·화면은 Git/Docker 제외 경로 `private/series-check/`에 보관한다. 실제 원고 3편은 기존 비공개 경로에 그대로 있으며 운영 DB 저장·공개 발행·OCI 적용은 하지 않았다.
