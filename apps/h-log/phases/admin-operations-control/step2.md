# Step 2: monitoring-overview

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. operations-observability Steps 0–6과 A3 Steps 0–1 완료. 모니터링 Step 7/실제 timer는 선행 조건이 아니다.

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
- `apps/h-log/phases/admin-operations-control/step1.md`
- `apps/h-log/lib/blog-job-retry.ts`
- `apps/h-log/lib/blog-job-retry.integration.test.ts`
- `apps/h-log/migrations/011_publish_job_admin_id.sql`
- `apps/h-log/phases/admin-operations-control/step1.md`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`
- `apps/h-log/phases/operations-observability/index.json`
- `apps/h-log/phases/operations-observability/step3.md`
- `apps/h-log/phases/operations-observability/step5.md`
- `apps/h-log/phases/operations-observability/step6.md`
- `apps/h-log/lib/blog-usage-ledger.ts`
- `apps/h-log/lib/blog-auto-publish-cycle.ts`

## 작업

1. 선행 모니터링 phase에서 실제 생성한 collector/read model/dashboard 파일을 먼저 확인한다. 관리자 개요/monitoring에서 서비스·scheduler 비활성·최근 attempt와 required 검증 성공·비용·백업/복구 시각을 읽는다.
2. 미수집/stale/error/disabled/never succeeded를 실제 정상/0과 구분한다. 초기 구현은 수동 새로고침 또는 제한된 주기의 조회로 충분하며 SSE나 새 신호 저장소를 만들지 않는다.
3. 비공개 Grafana로 인증된 진입 안내를 제공한다. 공개 iframe/anonymous sharing/service token 전달 없이 기존 접근 정책을 유지하고 모니터링 실패가 발행 상태/재시도를 바꾸지 않게 한다.

## 인수 기준

기존 모니터링 값과 관리자 요약의 단위·시각·성공 의미가 일치한다. 수집 중단/연결 미설정은 정상으로 보이지 않고 운영 토큰/metrics가 공개되지 않는다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 로컬 실제 수집과 collector 중단·stale·DB 오류·never succeeded를 재현해 화면/경보 원본을 대조한다.
2. 익명 접근·직접 API·캐시·1440/390/320px·키보드 및 공개 route 비노출을 확인한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A3 Step 3 local-admin-release-rehearsal. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
