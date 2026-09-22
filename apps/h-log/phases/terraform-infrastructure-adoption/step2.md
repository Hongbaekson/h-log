# Step 2: adopt-existing-resources-with-no-change-plan

## 읽을 파일

- `apps/h-log/AGENTS.md`, `.codex/skills/harness/SKILL.md`
- `apps/h-log/.codex/docs/harness/`의 `PRD.md`, `ADR.md`, `ARCHITECTURE.md`, `WORKFLOW.md`, `AGENT_LOOP.md`, `IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`, `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/phases/terraform-infrastructure-adoption/index.json`
- Steps 0-1의 inventory/import 매핑과 `apps/h-log/infra/terraform/` 전체

## 작업

Backend bucket/IAM bootstrap과 import/state 변경의 대상·권한·복구 계획을 제시하고 각각 명시 승인을 받는다. Bootstrap은 별도 state 경계로 처리한다. 준비된 private backend의 접근 제한, locking/versioning과 backup을 확인한 뒤 검토한 자원만 편입한다. 편입 과정에서 기존 자원 create/update/delete/replace가 필요한 plan은 실행하지 않는다.

## 인수 기준

- 각 remote object는 하나의 state/resource address에서만 관리된다.
- 기존 Compute/IP와 DB disk/data를 보존하고 import 후 일반 `terraform plan -detailed-exitcode`가 exit 0이다. Import 예정이 포함된 plan을 사후 no-change 증거로 사용하지 않는다.
- 이후 변경의 plan 검토, 저장 plan 승인/apply, 사후 확인, drift와 state 복구 절차를 배포 지침에 남긴다.

## 검증

- Backend/권한/backup 확인 → 승인된 import → no-change plan 순서의 redacted 증거를 기록한다.
- Exit 1은 오류, exit 2는 차이로 처리한다. 차이를 숨기지 말고 계획과 실제 구성을 다시 비교한다.
- `git diff --check`와 phase JSON 검증 후 완료 상태를 기록한다.

## 하지 말 것

- 자원 재생성, 공유 자원 편입, 자동 승인 apply를 하지 말 것. Reason: 이번 승인은 기존 자원의 변경 없는 편입에 한정한다.
- DNS/TLS 전환, Compose 배포, DB migration, timer/provider 활성화를 하지 말 것. Reason: 각각 별도 운영 승인 대상이다.
