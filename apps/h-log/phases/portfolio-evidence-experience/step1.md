# Step 1: decision-and-evidence-detail

## 개선 사항

판단과 근거가 있는 상세. 같은 phase의 Step 0 완료 후 실행한다.

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
- `apps/h-log/phases/portfolio-evidence-experience/index.json`
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/portfolio-card.ts`

## 작업

문제→선택지→결정→결과 흐름과 공개 가능한 구조도/측정 조건을 배치한다. 기존 승인된 성과를 보존하고 새로운 대안·실적·회사 내부 흐름을 추측하지 않는다. 증거가 없는 항목은 생략한다.

## 인수 기준

사실 설명과 검증/운영 범위가 구분되고 공개 금지 정보가 없다. 첫 적용 프로젝트 하나에서 구조도와 본문 읽기 흐름을 desktop/mobile로 검증한다.

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

## 진행 기록 — 2026-10-19

아래는 2026-10-19 당시 구현과 검증 보류 기록이다. 2026-10-20 재개 결과는 마지막 완료 기록을 따른다.

- `app/portfolio/[slug]/page.tsx`: AI 개발 워크플로우 사례에 문제 → 선택한 접근 → 구현 흐름도 → 기록된 결과 → 근거·적용 범위 순서를 적용했다. 기존 공개 설명으로 구성한 HTML figure는 넓은 화면에서 가로로, 좁은 화면에서 세로로 읽도록 작성했다. 상세 본문은 한 열로 읽고 한국어 목록 복귀 링크에 초점을 표시한다.
- `lib/projects.ts`: 첫 사례에만 선택적인 `detail.evidence`를 추가했다. 근거는 기존 공개 승인 기록이며 단순 기능 구현 시간·컨벤션 리뷰 지적이라는 적용 범위와 공개 기록에 없는 측정 기간·표본 수·비교 조건을 구분한다. 기존 9개 프로젝트의 성과·설명·URL은 수정하지 않았다. 실제 비교한 대안의 기록이 없어 선택지 비교는 생략했다.
- `lib/projects.test.ts`: 근거 설명 부재와 figure/조건부 렌더링 계약 부재의 RED 2개를 확인한 뒤 GREEN을 확인했다. 근거가 없는 다른 사례에는 임의의 설명이나 측정값을 채우지 않는다.
- Focused `node --no-warnings --test --experimental-strip-types lib/projects.test.ts lib/site-seo.test.ts`: 16/16 통과. `npm run test`: 215 pass / 13 DB integration skip. DB·repository·worker·migration 변경은 없다.
- `npm run lint`, `npm run typecheck`, Markdown/JSON·상대 링크 검사, 기존 9개 프로젝트 원문 JSON 비교와 `git diff --check`는 통과했다.
- `npm run build`는 기본 sandbox에서 Turbopack CSS 처리용 Node 프로세스 연결 실패로 종료됐다. 같은 명령의 권한 확대 재실행도 아래 승인 검토 용량 오류로 실행되지 않았다. 변경하지 않은 `app/brain/memory.css` 처리 중 나온 환경 오류를 근거로 Brain 코드나 빌드 설정을 수정하지 않았다.
- 로컬 브라우저 실행은 기본 sandbox의 `ERR_NETWORK_ACCESS_DENIED` 이후 승인 검토에서 `Selected model is at capacity`로 반복 실패했다. 안전성 거절이 아니라 검토 실행 오류이며 PC·모바일 검증을 통과한 것으로 기록하지 않는다.
- 후속 브라우저 검증 스크립트는 Git/Docker 제외 경로 `private/portfolio-detail-check/check.mjs`에 있다. 비교 기준은 Step 0에서 보관한 기존 프로젝트 원문과 Home/레이더 geometry다. 1440/390/320px, 원문·성과 보존, figure 순서·긴 텍스트·초점·복귀 링크, 나머지 8개 상세, 없는 slug 404, legacy 308, JavaScript 없는 읽기를 확인한다.

## 완료 기록 — 2026-10-20

- 승인 검토가 복구된 뒤 같은 `npm run build`를 권한 확대 환경에서 실행해 통과했다. 정적 페이지 생성과 TypeScript 검증을 완료했으며 빌드 설정이나 Brain 코드는 수정하지 않았다.
- 로컬 개발 서버에서 `node --no-warnings --experimental-strip-types apps/h-log/private/portfolio-detail-check/check.mjs`를 실행했다. 1440/390/320px 흐름도 가로/세로 배치, 본문 순서, 근거 설명, 기존 원문·성과 보존, 긴 문자열, 키보드 초점·목록 복귀, 나머지 8개 상세, 없는 slug 404, legacy 308, JavaScript 없는 읽기를 통과했다. 세 화면의 스크린샷도 확인했다.
- Home/레이더 geometry·SVG는 Step 0 비교 기준과 일치한다. 데이터 JSON 비교에서 새 근거 설명 외에 9개 프로젝트의 기존 필드는 동일하다. 브라우저 오류는 없으며 실제 회사 문서·내부 URL·새 측정값·가상의 대안 비교를 추가하지 않았다.
- 검사 중 발견한 제목의 세로 초과는 `overflow: visible`인 글꼴의 정상적인 line box 돌출이었다. 스크린샷에서 잘림이 없음을 확인하고 실제 clipping과 가로 넘침을 검사하도록 비공개 검증 스크립트를 바로잡았다. 제품 코드를 바꿔 검사를 우회하지 않았다.
- 이전에 통과한 focused 16/16, unit 215 pass/13 DB skip, lint와 이번 typecheck/build/browser 결과를 합쳐 기본 gate를 완료했다. 이후 production code 변경은 없다. 문서/JSON·상대 링크 검사와 `git diff --check`도 통과했다. 개발 서버가 바꾼 `next-env.d.ts`는 Next의 `typegen`으로 빌드 기준을 다시 생성해 변경 목록에서 제외했다.
- 고정된 프로젝트 상세이므로 새 DB 조회·빈/오류 분기는 없다. 없는 slug는 기존 404로 확인했다. 스크립트·스크린샷·결과는 계속 Git/Docker에서 제외한다.

다음은 [Step 2: project-post-connections](step2.md)다. Step 2와 phase 전체는 pending으로 유지한다.
