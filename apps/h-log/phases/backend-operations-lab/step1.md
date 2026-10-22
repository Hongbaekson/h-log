# Step 1: lab-case-study-connection

## 개선 사항

실험과 실제 설계의 연결. 같은 phase의 Step 0 완료 후 실행한다.

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
- `apps/h-log/phases/backend-operations-lab/index.json`
- `apps/h-log/app/lab/queue/page.tsx`
- `apps/h-log/components/lab/QueueReplay.tsx`
- `apps/h-log/lib/queue-lab.ts`
- `apps/h-log/lib/queue-lab.test.ts`
- `apps/h-log/phases/backend-operations-lab/step0.md`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/site.ts`
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

완성된 Queue 실험에 실제 프로젝트/글의 공개 가능한 설계 설명을 연결한다. 가상 모델이 생략한 동시성·네트워크·영속성 조건을 설명하고 실험 수치를 실무 성과로 사용하지 않는다. 실험 하나를 위한 대형 메뉴/플랫폼은 만들지 않는다.

## 인수 기준

실험→설계 설명→관련 글 이동이 동작하고 가상/실제 근거가 구분된다. 링크한 글의 published 경계와 mobile 탐색을 확인한다.

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

## 시작 상태 — 2026-10-22

Step 0을 완료했다. `/lab/queue`의 고정 가상 모델과 로컬 검증을 재사용한다. 실제 사례·공개 글과의 연결 및 기존 화면에서의 진입점/검색 노출 정리는 이 Step 1의 남은 범위다. 실험 수치를 프로젝트 실적으로 사용하지 않고, 링크는 기존 published-current/privacy 판정을 따른다.

## 완료 — 2026-10-22

**Step 1과 Phase 6 전체를 completed로 변경했다. 공개 경험 개선은 6개 phase / 19개 step 전체 완료**다. 다음은 [operations-observability / Step 0](../operations-observability/step0.md)의 지표·권한·자원 예산 계약이다. 기존 OCI 보류와 운영 적용 승인 경계는 유지한다.

- `/lab/queue`에 동시성·중복 처리, 네트워크·처리 확인, 영속성·복구 비교를 추가했다. 비교는 실제 설계 시 확인할 조건이며 모두 구현/검증했다는 경험 주장으로 쓰지 않는다. DLQ 재처리 가정과 프로젝트 성과 수치의 측정 근거가 아님을 명시했다.
- 기존 `getProjectBySlug`의 Redisson/DLQ 제목·경로를 사용해 사례로 연결했다. 해당 사례 상세에만 `Queue 흐름 직접 보기`를 추가해 실험으로 돌아온다. 별도 메뉴·실험 데이터 layer·DB/API·의존성을 추가하지 않았다.
- 실험→프로젝트→관련 글은 기존 `ProjectRelatedPosts` / `getPublicProjectPostConnections`의 published-current/privacy 판정을 재사용한다. Redis Pub/Sub 문서 분석을 프로젝트의 도입/교체 경험으로 보이지 않게 기존 연결 이유를 유지했다. Blog 본문과 연결 selector를 수정하지 않았다.
- sitemap의 정적 경로에 `/lab/queue`를 추가했다. 기존 canonical과 Blog-only feed/llms, Home/레이더·Second Brain·프로젝트 성과·재생 계산은 유지했다.

### 검증 결과

앱 디렉터리에서 실행했다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-crawler-output.test.ts lib/queue-lab.test.ts lib/site-seo.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
node private/series-check/integration.mjs
node private/lab-connection-check/smoke.mjs
node private/lab-connection-check/check.mjs
node private/lab-connection-check/failure.mjs
node private/lab-connection-check/verify-docs.mjs
git diff --check
```

- **UI RED → GREEN**: 실험→프로젝트 링크, 프로젝트→실험 링크, sitemap 항목이 모두 없는 것을 확인한 뒤 같은 검증을 통과시켰다. 첫 실행의 개발 서버 연결 거부는 환경 준비 실패로 구분하고 서버를 띄운 뒤 실제 RED를 확인했다.
- 기존 계산·공개 글·크롤러·SEO focused **51/51**, unit **227 pass / 14 DB skip**, public-read integration **1/1**, lint·typecheck·build 통과. DB/repository/실제 worker/migration 변경이 없어 나머지 DB suite는 재실행하지 않았다.
- 새 격리 로컬 DB의 합성 글과 이전 비공개 버전으로 1440/390/320px의 실험→사례→글→사례→실험 왕복, anchor/키보드 초점·헤더 가림 없음·긴 텍스트·재생/초기화를 확인했다. 철회·초안·현재 버전 없음·privacy 위반에서 글 링크 생략/404와 sitemap 제외를 검증했다. 실험 링크는 유지하고 관련 없는 프로젝트에는 추가하지 않는다.
- 가상 글의 저장 Markdown/HTML/hash와 Markdown endpoint를 보존했다. 과거 비공개 제목·본문 노출, 가로 overflow, 브라우저 page error는 없었다. sitemap의 실험 항목은 한 번만 나오며 feed/llms에 실험을 넣지 않는다.
- DB가 연결되지 않는 별도 로컬 운영 모드에서도 실험·정적 사례 본문·왕복 링크는 동작한다. 관련 글 영역의 일반 오류와 동일 URL GET 재시도만 표시한다. `next start` standalone 안내가 있으므로 배포 이미지/OCI 검증으로 표시하지 않는다.
- 변경 문서 12개·phase JSON 42개·추가/수정 상대 링크 16개와 `git diff --check`를 검증했다. 공개 경험 19/19 완료, 다음 모니터링 Step 0, 기존 OCI 차단 상태와 실제 원고 3편의 SHA-256 보존을 확인했다.

### 별도 후속: JavaScript 없는 기존 블로그 목록

JavaScript 없는 실험↔프로젝트 왕복과 글 URL 직접 읽기는 통과했다. 프로젝트의 기존 noscript 대체 링크는 `/blog`로 이동하지만, **기존 Blog 목록의 loading boundary는 JavaScript 없이 로딩 화면에 머무른다.** no-JS 전체 글 탐색은 완료로 표시하지 않는다. 기존 목록 스트리밍/로딩 계약을 보존하는 보완은 [공개 경험 계획의 별도 후속](../../.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md)에 남겼다. 이번 변경은 목록·로딩 UI를 수정하지 않았다.

검수 과정에서 합성 본문의 H1을 페이지 제목과 혼동한 선택자와 noscript 링크 선택자를 실제 화면 구조에 맞게 수정했다. UI/DB 검수 코드·합성 자료·로그·화면은 Git/Docker 제외 경로 `private/lab-connection-check/`에 보관한다. 실제 원고 공개·회사 내부 문서 사용·운영 DB/OCI 변경은 하지 않았다.
