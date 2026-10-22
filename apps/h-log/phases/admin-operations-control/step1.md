# Step 1: bounded-retry-and-pause

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. A3 Step 0 및 A2의 지속 정책/감사 계약 완료.

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
- `apps/h-log/phases/admin-operations-control/index.json`
- `apps/h-log/phases/admin-operations-control/step0.md`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-persistent-worker.integration.test.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/migrations/002_publish_job_leases.sql`
- `apps/h-log/scripts/blog-worker.mjs`

## 작업

1. 허용된 failed 작업 한 건의 명시적 재시도를 추가한다. required/retryable의 post 상태 복구 조건, 버전/hash·원인 확인·사유·재시도 상한·감사를 정의하고 기존 처리 함수를 재사용한다.
2. 현재 lease·이미 성공한 작업·철회 글·오래된 버전·중복 요청을 차단한다. retry_count 이력을 0으로 되돌리거나 임의 job을 새로 만들어 한도를 우회하지 않는다.
3. A2의 정책으로 새 claim을 pause/resume하고 running 작업은 끝내거나 기존 lease 복구 규칙을 따른다. 중지의 적용 경계를 worker transaction으로 검증하며 프로세스 강제 종료와 혼동하지 않는다.

## 인수 기준

재시도 하나가 하나의 허용된 상태 전이/감사로 수렴하고 동시 worker와 충돌해 중복 공개/외부 호출을 만들지 않는다. pause 중 신규 claim은 없고 진행 중/재개 결과를 설명할 수 있다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 더블 클릭·두 worker·lease 만료·재시도 상한·철회 경합·pause와 claim 경합·재시작을 격리 DB에서 검증한다.
2. 실제 broker/DLQ나 shell/systemctl/docker 경로가 생기지 않았는지 diff를 검토한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

operations-observability Steps 1–6, 이후 A3 Step 2. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
