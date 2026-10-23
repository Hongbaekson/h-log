# Step 2: private-queue-lab

## 상태와 선행 조건

상태: completed — 2026-10-23 로컬 구현·검증 완료. 공통 인증 뒤로 실험을 이동했고 운영 설정은 변경하지 않았다.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step에서 추가한 실제 인증/정책/요청/조회 파일도 그 완료 기록을 따라 읽는다. 아래 목록은 등록 시 존재하는 파일이다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/ADMIN_CONSOLE_PLAN.md`
- `apps/h-log/.codex/docs/harness/ADMIN_ACCESS_CONTRACT.md`
- `apps/h-log/lib/admin-owner.ts`
- `apps/h-log/lib/admin-server.ts`
- `apps/h-log/app/admin/layout.tsx`
- `apps/h-log/app/admin/page.tsx`
- `apps/h-log/components/admin/AdminNavigation.tsx`
- `apps/h-log/scripts/admin-owner.http.test.mjs`
- `plans/automated-blog-publishing-plan.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/admin-console-foundation/index.json`
- `apps/h-log/phases/admin-console-foundation/step1.md`
- `apps/h-log/app/admin/lab/queue/page.tsx` (이 step에서 기존 공개 page를 이동)
- `apps/h-log/components/lab/QueueReplay.tsx`
- `apps/h-log/lib/queue-lab.ts`
- `apps/h-log/lib/queue-lab.test.ts`
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/lib/blog-crawler-output.ts`
- `apps/h-log/lib/site-seo.test.ts`

## 작업

1. 기존 재생 계산·가상 데이터·한계 설명을 재사용해 /admin/lab/queue로 옮긴다. 실제 운영 작업 제어와 혼동되지 않게 가상 실험임을 유지한다.
2. 공개 /lab/queue를 404로 종료하고 Portfolio의 진입 링크와 sitemap 항목을 제거한다. 공개 경로에서 관리자 주소로 redirect하거나 관리자 링크를 새로 만들지 않는다.
3. 관리자 실험에서 공개 프로젝트로 나가는 읽기 링크는 허용하되 비공개 관리자 정보/credential을 URL에 넣지 않는다. 메타데이터·검색·feed/llms·prefetch에도 관리자 경로/본문이 노출되지 않는지 검증한다.

## 인수 기준

익명/공개 host의 기존 실험 URL은 404이고 새 실험은 인증된 관리자만 읽는다. 공개 링크·sitemap에 실험이 없으며 가상 재생 동작은 동일하다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 공개 실험 URL·sitemap·프로젝트 링크의 노출 RED를 먼저 재현하고 비공개 전환 GREEN을 확인한다.
2. 기존 queue-lab 계산 테스트와 1440/390/320px·키보드·재생/초기화·로그인 유무를 확인한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A1 Step 3 second-brain-admin-integration. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## 완료 기록 — 2026-10-23

기존 가상 실험 page를 `/admin/lab/queue`로 옮기고 공통 Proxy와 page의 `requireAdminOwner()`를 적용했다. 관리자 탐색에 실험실을 연결하고 준비 메뉴는 6개로 줄였다. 기존 Queue 계산·재생 컴포넌트·가상 작업·실제 설계 비교는 유지했다. DB/실제 Worker를 호출하지 않는다.

공개 `/lab/queue` page를 제거해 redirect 없이 404로 종료했다. Portfolio의 실험 진입 영역과 sitemap 항목, 실험의 공개 canonical/OG URL을 제거했다. 실험에서 공개 프로젝트로 나가는 일반 링크는 `HLOG_PUBLIC_BASE_URL`을 사용하고 인증 정보와 관리자 Referer를 전달하지 않는다.

### RED → GREEN

`scripts/admin-owner.http.test.mjs`에 회귀 검증을 먼저 추가했다. 기존 공개 URL 200(기대 404), sitemap의 `/lab/queue` 노출, 관리자 실험 404(기대 200)를 확인한 뒤 이동/노출 제거로 통과했다. 초기 sitemap 검증은 DB 없는 fixture에서 500이어서 기존 격리 DB를 연결한 후 실제 노출 실패를 다시 확인했다. RSC prefetch는 본문 없는 라우트 정보일 수 있어 일반 RSC 본문 검증과 분리했다.

### 검증

앱 디렉터리에서 실행했다. 기존 두 loopback ingress와 격리 DB `hlog_admin_shell_20261023`를 읽기 검증에 재사용했고 Brain 저장 flag는 OFF였다. 새 DB/migration/데이터 변경은 없다.

```bash
node --no-warnings --test --experimental-strip-types lib/queue-lab.test.ts lib/site-seo.test.ts
node private/admin-shell-check/http.mjs
node private/admin-queue-check/browser.mjs
npm run test
npm run lint
npm run typecheck
npm run build
node private/admin-queue-check/verify-docs.mjs
git diff --check
```

- Queue/SEO 5/5, 전체 unit 232 pass/14 DB skip, lint/typecheck/build 통과. DB/repository/worker/migration 변경이 없어 integration 재실행은 생략했다.
- HTTP 4/4(부모 1개+하위 3개): 공개/관리자/직접 upstream의 옛 URL GET·HEAD·RSC 404와 redirect 없음, 새 URL의 공개 host+키 404·익명 HTML/HEAD/RSC/prefetch와 잘못된 키 401·잘못된 Host 403, 소유자 HTML/RSC/prefetch/HEAD 및 비공개 헤더를 확인했다.
- 공개 Home/Resume/Portfolio/사례/Blog·sitemap·검색·feed·llms/llms-full 및 사례 RSC에 관리자 주소/실험 본문이 없음을 확인했다.
- 1440/390/320px에서 재생/일시정지/한 단계/초기화·DLQ 재처리·처리 기록·설정 9조합·키보드 초점·reduced motion·no-JS 초기 상태/관리자 이동을 검수했다. overflow/pageerror와 외부/API 실행은 0건이었다. 공개 사례 이동에서 관리자 credential/Referer 미전달도 확인했다.
- 첫 typecheck/build는 이동 전 `.next/dev/types`가 삭제된 공개 page를 참조해 실패했다. 앱 내부 생성 캐시 경로를 검증해 정리한 뒤 기본 Turbopack build와 typecheck를 다시 통과했다. 개발 검수는 `next dev --webpack`을 사용했다. `next-env.d.ts`는 최종 빌드가 생성한 기존 상태를 유지한다.
- 검수 fixture/결과/스크린샷은 Git 제외 `private/admin-queue-check/`에 보관했다. 공통 HTTP 실행 fixture는 이전 `private/admin-shell-check/`를 재사용한다.
- 문서/상태 검사: 변경 경로 19개(이동 전후 경로 포함), Markdown 10개·JSON 2개, 추가 링크 9개·읽기 경로 30개를 검증했다. Phase JSON 46개·Step 162개 중 A1 Step 2만 완료로 변경됐고 다른 phase 상태와 운영 설정은 보존했다. 관리자 계획은 완료 3·대기 13·차단 1이다.

### 남은 범위

다음은 A1 Step 3의 Brain 명령 revision·중복 요청·감사 통합이다. PDF 등록/다운로드, 블로그/자동화/실제 작업 제어와 모니터링은 후속 phase다. Home/레이더·공개 Brain UI·원문/공개 사본·운영 Compose/Nginx/env·OCI/DNS/TLS·provider/발행/timer는 변경하지 않았다. 운영 배포 전까지 기존 서버의 공개 상태가 바뀌었다고 간주하지 않는다.
