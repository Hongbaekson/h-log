# Step 1: shared-owner-auth-and-shell

## 상태와 선행 조건

상태: completed — 2026-10-23 로컬 구현·검증 완료. 선행 A1 Step 0의 계약을 적용했으며 운영 ingress는 변경하지 않았다.

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
- `plans/automated-blog-publishing-plan.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/admin-console-foundation/index.json`
- `apps/h-log/phases/admin-console-foundation/step0.md`
- `apps/h-log/proxy.ts`
- `apps/h-log/lib/brain-owner.ts`
- `apps/h-log/lib/brain-owner.test.ts`
- `apps/h-log/lib/admin-owner.ts`
- `apps/h-log/lib/admin-owner.test.ts`
- `apps/h-log/lib/admin-server.ts`
- `apps/h-log/app/admin/layout.tsx`
- `apps/h-log/app/admin/page.tsx`
- `apps/h-log/app/admin/admin.css`
- `apps/h-log/components/admin/AdminNavigation.tsx`
- `apps/h-log/scripts/admin-owner.http.test.mjs`
- `apps/h-log/app/admin/brain/page.tsx`
- `apps/h-log/app/admin/brain/records/route.ts`
- `apps/h-log/lib/brain-capture-http.ts`
- `apps/h-log/lib/brain-capture-http.test.ts`
- `apps/h-log/lib/brain-server.ts`
- `apps/h-log/scripts/brain-capture.http.test.mjs`
- `apps/h-log/app/layout.tsx`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`

## 작업

1. 확정된 단일 소유자 인증을 공통 /admin 경계로 추출하고 page·HTTP handler·데이터 접근에서 확인한다. Brain DB flag와 인증 설정을 분리하되 기존 Brain endpoint의 보호 수준을 유지한다.
2. 관리자 전용 Discord dark 탐색과 비공개 개요를 구현한다. 미구현 메뉴는 명확한 준비 상태로 표시하며 운영 통계나 성공 이력을 꾸며 넣지 않는다. 공개 Header/Footer와 관리자 탐색이 섞이지 않도록 필요한 최소 layout 변경만 한다.
3. 공개 host의 관리자 거부, 관리자 origin 허용·비공개 헤더·인증 전 데이터 차단을 로컬 검증한다. 운영 Nginx를 개방하지 않고 격리 proxy 구성에서 Host 전달·위조 forwarded header·직접 앱 요청을 확인한다.

Step 0 확정 사항: `lib/admin-owner.ts`로 기존 비교/검사를 추출하고 `HLOG_ADMIN_ENABLED/OWNER_KEY/ORIGIN`을 사용한다. 구 Brain owner 환경값으로 fallback하지 않으며 HTTP fixture/문서도 함께 이전한다. 공통 shell은 Brain DB 없이 열리고 records는 기능 OFF 시 404다. `/admin`과 모든 하위 경로를 보호하고 page·handler에서 데이터 조회 전 재검사한다. 새 세션/명령 DB는 이 step에서 만들지 않으며 Brain 명령 revision/감사는 Step 3의 범위다.

## 인수 기준

인증된 소유자만 공통 관리자 shell과 기존 Brain에 접근한다. Brain DB가 꺼져도 인증된 관리자 shell은 열리고 Brain은 미설정으로 표시된다. 공개 host와 비인증 HTML/API/RSC에는 private 데이터가 없다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 기존 brain-owner/brain-capture-http 테스트와 새 인증 경계 테스트의 RED/GREEN, 인증된 정상 이동·누락 설정·잘못된 origin·host·재시작을 확인한다.
2. 1440/390/320px·키보드·오류 화면을 확인하고 기존 public layout/레이더를 보존한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

Focused 시작 명령은 `node --no-warnings --test --experimental-strip-types lib/admin-owner.test.ts lib/brain-owner.test.ts lib/brain-capture-http.test.ts`다. 새 파일은 RED부터 작성하고 wrapper 제거 시 실제 테스트 경로를 기록한다. 계약의 `127.0.0.1:3030`/`localhost:3031` 격리 ingress에서 공개 host+올바른 키·익명 RSC·누락 Host·위조 forwarded header·same-site/null/누락 Origin을 확인한다. 운영 HTTP 설정은 거부하고 실제 TLS/SSH 개방은 A3 Step 4에 남긴다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A1 Step 2 private-queue-lab. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## 완료 기록 — 2026-10-23

`admin-owner.ts`에 설정/Host/Basic/Origin 검사와 비공개 헤더를 모으고 `/admin/:path*` Proxy, page의 `requireAdminOwner`, Brain records의 공통 인증+기능 flag로 적용했다. 구 Brain owner 환경값 fallback은 없다. Brain OFF여도 관리자 개요와 미설정 안내는 열리며 records는 404다. DB 장애는 기존 안전한 503/영역 오류로 표시한다.

관리자 전용 Discord 탐색·개요와 준비 메뉴 7개를 추가했다. 공개 Header/Footer는 관리자 경로에서 렌더링하지 않고 Home/레이더·공개 Brain UI는 유지했다. 기존 Brain 공개 보기 링크가 관리자 host에서 404가 되는 문제를 재현해 `HLOG_PUBLIC_BASE_URL`의 공개 주소로 수정했다. 원문/버전/공개 snapshot과 데이터 저장 계약은 바꾸지 않았다.

### RED → GREEN

- 공통 설정으로 Brain 없이 인증: 기존 guard 404 → 새 guard 허용.
- 누락 Host/`same-site` 변경 요청: 기존 허용 → 각각 403.
- Brain 인증 환경 이전: 기존 테스트 6개 404 실패 → 새 설정으로 6/6.
- 관리자 개요: 실제 HTTP 404 → 200, 공개 Header/Footer 없음.
- 공개 Brain 링크: 상대 주소로 인한 공개 origin assertion 실패 → 공개 origin 사용.
- DB 오류 화면: 제목 크기와 모바일 메뉴 높이 assertion 실패 → 공통 제목 스타일과 모바일 grid 행 크기 수정 후 통과.

### 검증

앱 디렉터리에서 실행했다. HTTP/DB/브라우저 fixture는 별도 loopback 환경과 합성 기록만 사용했다.

```bash
node --no-warnings --test --experimental-strip-types lib/admin-owner.test.ts lib/brain-owner.test.ts lib/brain-capture-http.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
node private/admin-shell-check/http.mjs
node private/admin-shell-check/brain-check.mjs
node private/admin-shell-check/browser.mjs
node private/admin-shell-check/lifecycle.mjs
node private/admin-shell-check/verify-docs.mjs
git diff --check
```

- Focused 11/11, 전체 unit 232 pass/14 DB skip, lint/typecheck/build 통과.
- 격리 DB `hlog_admin_shell_20261023`에서 기존 migration 5개 적용 후 Brain repository integration 1/1·Brain HTTP 1/1 통과. 저장/과거 원문/충돌/명시적 공개/비공개 수정/해제와 공개 graph/sitemap 경계를 확인했다. DB/repository/worker/migration 코드를 바꾸지 않아 전체 integration 재실행은 생략했다.
- 공개 `127.0.0.1:3030`·관리자 `localhost:3031` Nginx → 동일 loopback 앱으로 admin HTTP 1/1 통과. 공개 host+정상 키 404, 익명/잘못된 키 401, HTML/API/RSC·HEAD, 잘못된/누락 Host, sibling/null/누락 Origin, 위조 forwarded header와 관리자 경로 허용 목록을 확인했다. 누락 Host는 Node HTTP parser의 400 또는 guard 403으로 닫힌다.
- 1440/390/320px의 개요·Brain 미설정/연결/DB 오류, 준비 목록 펼치기·키보드 왕복·공개 메뉴 유지·no-JS 이동을 검수했다. 가로 넘침과 pageerror는 0건이었다.
- 실제 재시작 5종: 키 누락 404, Brain ON+관리자 OFF 404, 키 회전 뒤 이전 키 401/새 키 200, Brain DB 오류 화면과 API 503, production HTTP origin 404.
- 문서/상태 검사: 변경 파일 32개, Markdown 12개·JSON 3개 파싱, 추가 링크 9개·읽기 경로 67개 확인. Phase JSON 46개·Step 162개의 상태를 비교해 A1 Step 1만 완료로 바뀌었음을 검증했다. 관리자 계획은 완료 2·대기 14·차단 1이며 운영 설정과 다른 phase 상태는 그대로다.
- 로컬 Turbopack 개발 컴파일 지연으로 검수 서버는 Next가 지원하는 `dev --webpack`을 사용했다. production build는 기본 Turbopack으로 통과했다. 환경값/스크린샷/결과는 Git 제외 `private/admin-shell-check/`에 보관했다.

### 남은 범위

다음은 Step 2의 `/lab/queue` 비공개 이동과 공개 링크/sitemap 제거다. 현재 Queue는 여전히 공개이고 관리자 실험실은 준비 상태다. 새 명령 revision/감사/정책·PDF 다운로드는 구현하지 않았다. Basic의 브라우저 인증 캐시 한계와 키 폐기는 안내하되 별도 로그아웃/세션 DB는 추가하지 않았다. 운영 Compose/Nginx/env·DNS/TLS·SSH 접근·OCI·실제 provider/발행/timer는 변경하지 않았다.
