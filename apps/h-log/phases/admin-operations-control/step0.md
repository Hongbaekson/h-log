# Step 0: job-and-audit-inspection

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. A1/A2 완료. 운영 정책/감사 원본이 존재해야 한다.

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
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-usage-ledger.ts`
- `apps/h-log/migrations/001_blog_core.sql`
- `apps/h-log/migrations/002_publish_job_leases.sql`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`

- `apps/h-log/.codex/docs/harness/AUTOMATION_POLICY.md`
- `apps/h-log/lib/blog-automation-policy.ts`
- `apps/h-log/lib/blog-automation-runner.ts`
- `apps/h-log/migrations/010_blog_automation_policy.sql`

## 작업

1. 인증된 /admin/jobs와 /admin/audit에 제한된 페이지/필터 조회를 추가한다. 실제 publish_jobs 상태·required/retryable·lease·시도 횟수·안전한 오류 분류, 작업 대상 버전과 현재 공개 버전을 구분한다.
2. 관리자 명령/정책 변경 이력과 기존 usage_events의 비용·한도·unknown을 조회한다. 원문·secret·내부 경로·raw stack trace를 출력하지 않는다.
3. job 없음·worker idle·프로세스 미관측·관측값 stale·DB 오류를 구분한다. 현재 schema에 없는 DLQ/실행 이력/heartbeat를 존재한다고 표시하지 않는다.

## 인수 기준

실제 원장에 기반한 조회가 가능하며 재시도/정책 명령을 실행하지 않는다. 0건/미관측/오류가 구분되고 private 응답은 인증·cache 경계를 지킨다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. queued/running/retrying/failed/succeeded 및 expired lease/unknown 비용/오류 원문 sentinel fixture를 조회한다.
2. 대량 fixture에서 제한된 query/페이지와 1440/390/320px·키보드·오류 화면을 검증한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A3 Step 1 bounded-retry-and-pause. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## A2 Step 3 인계

정책 변경/일일 admission은 admin_actions, 초안/worker admission revision은 각 원장에 있다. 실제 0건·정책 차단·만료 lease·불명확 결과·프로세스 미관측을 구분한다. 보호 경로와 unknown 자동 재호출 금지를 보존한다.
