# Step 4: approved-admin-origin-rollout

## 상태와 선행 조건

계획 등록 상태: blocked — OCI 보류. A1/A2/A4 및 A3 Steps 0–3와 operations-observability Step 7 완료. OCI 보류 해제·실제 공개/관리 origin·TLS·인증·migration/backup 범위의 명시 승인 필요.

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
- `apps/h-log/phases/admin-operations-control/step3.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/compose.yaml`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/phases/operations-observability/step7.md`
- `apps/h-log/phases/auto-publish-ops-hardening/step4.md`
- `apps/h-log/phases/admin-resume-pdf/index.json`
- `apps/h-log/phases/admin-resume-pdf/step3.md`

## 작업

1. A4 PDF 저장·검증 예산/비공개 backup을 포함한 승인된 도메인/인증 방식/대상 서버/운영 secret을 비공개 환경에서 확정하고 변경 전 backup·격리 restore·migration 및 artifact rollback 가능성을 확인한다.
2. 공개 host의 /admin 차단을 유지한 채 관리자 host의 허용 경로·HTTPS·인증·제한을 적용한다. 직접 upstream을 외부에 열지 않고 public canonical/worker origin을 보존한다.
3. 익명/잘못된 host/Origin/키·실제 관리자 읽기·비공개 헤더·모니터링·키 회전/차단 rollback을 승인 범위에서 확인한다. 실제 개인 글/Brain 사본/PDF 공개·외부 provider·timer는 이 rollout으로 실행하지 않는다.
4. 관측 결과·권한·현재 OFF 정책·미승인 기능을 기록한다. 실제 자동 발행 재개는 기존 auto-publish-ops-hardening Step 4로 넘긴다.

## 인수 기준

승인된 관리자 origin만 소유자에게 열리고 공개 host/직접 upstream에는 관리 데이터가 없다. 모니터링·rollback 검증 후에도 timer/자동 발행 허용은 별도 승인 전 OFF다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 승인 전에는 문서/설정 예시와 로컬 검증만 수행하고 blocked를 유지한다.
2. 승인 후 실제 HTTPS·host/auth·public crawler·private cache·backup/rollback 근거를 비밀값 없이 기록한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- 승인 전 OCI/DNS/TLS/운영 migration을 변경하지 말 것. 현재 보류는 계획 등록으로 해제되지 않는다.

## 다음 단계

별도 승인된 auto-publish-ops-hardening Step 4. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
