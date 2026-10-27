# Step 3: automation-policy-controls

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. A2 Steps 0–2 및 operations-observability Step 0의 신호 계약 완료.

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
- `apps/h-log/phases/admin-blog-publishing/index.json`
- `apps/h-log/phases/admin-blog-publishing/step2.md`
- `apps/h-log/.codex/docs/harness/DRAFT_GENERATION_REQUESTS.md`
- `apps/h-log/migrations/009_blog_draft_requests.sql`
- `apps/h-log/lib/blog-draft-requests.ts`
- `apps/h-log/lib/blog-draft-server.ts`
- `apps/h-log/lib/blog-draft-http.ts`
- `apps/h-log/app/admin/automation/page.tsx`
- `apps/h-log/scripts/blog-draft.http.test.mjs`
- `apps/h-log/lib/blog-auto-publish-runner.ts`
- `apps/h-log/lib/blog-auto-publish-cycle.ts`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.ts`
- `apps/h-log/lib/blog-usage-ledger.ts`
- `apps/h-log/scripts/blog-auto-publish.mjs`
- `apps/h-log/scripts/blog-worker.mjs`
- `apps/h-log/deploy/systemd/hlog-auto-publish.timer`

## 작업

1. 자동 초안 생성 허용/자동 공개 허용/새 작업 처리 허용을 분리해 초기 OFF의 지속 정책으로 저장한다. A2 Step 2의 요청/실행 경로와 감사 계약을 재사용하고 requested/effective/blocked reason을 표시한다.
2. 관리자·CLI·scheduler·worker의 관련 경로에서 외부 호출 직전과 공개 전이 직전 정책을 재확인한다. 서버 운영 허용 설정이 상한이며 정책 조회 실패는 fail closed다. UI만 비활성화하는 제어는 허용하지 않는다.
3. 정책 변경과 새 실행 admission을 직렬화하고 이미 시작한 요청/lease는 화면에 구분한다. 중지 이후에도 공개된 글 검증·실패 시 숨김·철회는 동작해야 한다. timer나 provider credential을 웹에서 바꾸지 않는다.
4. 자동 공개가 OFF이면 자동 생성 결과를 초안에 남긴다. ON 모드의 수동 승인 생략은 기존 검증 gate 통과 조건 안에서만 허용하고 실제 운영 활성화는 별도 단계로 남긴다.

## 인수 기준

설정이 재시작 뒤 유지되고 모든 실행 경로에서 같은 정책을 적용한다. OFF/오류/서버 차단에서 새 외부 실행 또는 공개 전이가 발생하지 않으며 inflight와 보호 작업의 처리 결과가 명시된다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. OFF→ON→OFF, 동시 정책 변경, DB 오류, worker 재시작, 외부 호출 직후 중지를 fake provider와 격리 DB로 재현한다.
2. CLI/scheduler의 UI 우회 실행도 차단되는지, 감사/설정 revision과 관측 상태가 일치하는지 확인한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A3 Step 0 job-and-audit-inspection. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## Step 2 인계

초안 요청 소비자는 구현됐다. HLOG_BLOG_DRAFT_GENERATION_ENABLED 기본 OFF와 유한한 일/월 한도를 상한으로 사용한다. 이 환경 flag는 지속 정책이나 진행 중 호출 취소 기능이 아니다. 공용 generation advisory lock과 별도의 Seoul daily lock, needs_review 보류, result_ready 저장만 재개, daily 검증용 postId와 공개 보호 작업을 유지하며 정책 admission을 연결한다. 외부 결과가 불명확한 요청을 정책 ON만으로 queued로 되돌리지 않는다.
