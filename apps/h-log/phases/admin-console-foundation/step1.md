# Step 1: shared-owner-auth-and-shell

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. A1 Step 0 완료.

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
- `plans/automated-blog-publishing-plan.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/admin-console-foundation/index.json`
- `apps/h-log/phases/admin-console-foundation/step0.md`
- `apps/h-log/proxy.ts`
- `apps/h-log/lib/brain-owner.ts`
- `apps/h-log/lib/brain-owner.test.ts`
- `apps/h-log/app/admin/brain/page.tsx`
- `apps/h-log/app/admin/brain/records/route.ts`
- `apps/h-log/app/layout.tsx`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`

## 작업

1. 확정된 단일 소유자 인증을 공통 /admin 경계로 추출하고 page·HTTP handler·데이터 접근에서 확인한다. Brain DB flag와 인증 설정을 분리하되 기존 Brain endpoint의 보호 수준을 유지한다.
2. 관리자 전용 Discord dark 탐색과 비공개 개요를 구현한다. 미구현 메뉴는 명확한 준비 상태로 표시하며 운영 통계나 성공 이력을 꾸며 넣지 않는다. 공개 Header/Footer와 관리자 탐색이 섞이지 않도록 필요한 최소 layout 변경만 한다.
3. 공개 host의 관리자 거부, 관리자 origin 허용·비공개 헤더·인증 전 데이터 차단을 로컬 검증한다. 운영 Nginx를 개방하지 않고 격리 proxy 구성에서 Host 전달·위조 forwarded header·직접 앱 요청을 확인한다.

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

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A1 Step 2 private-queue-lab. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
