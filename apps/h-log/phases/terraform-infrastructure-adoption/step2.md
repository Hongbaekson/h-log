# Step 2: adopt-existing-resources-with-no-change-plan

## 읽을 파일

- `apps/h-log/AGENTS.md`, `.codex/skills/harness/SKILL.md`
- `apps/h-log/.codex/docs/harness/`의 `PRD.md`, `ADR.md`, `ARCHITECTURE.md`, `WORKFLOW.md`, `AGENT_LOOP.md`, `IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`, `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/phases/terraform-infrastructure-adoption/index.json`
- Steps 0-1의 inventory/비공개 import 매핑과 `infra/terraform/oci-shared/` 전체
- `infra/terraform/oci-backend/README.md`와 bootstrap 구성, `infra/terraform/oci-shared/adoption.md`

## 작업

Backend bucket/IAM bootstrap과 import/state 변경의 대상·권한·복구 계획을 제시하고 각각 명시 승인을 받는다. Step 1의 별도 shared root 코드화는 실제 편입 승인이 아니다. Bootstrap은 별도 state 경계로 처리한다. 준비된 private backend의 접근 제한, locking/versioning과 최신 DB backup/restore 근거를 확인한 뒤 Step 1의 검토된 공유 자원 8개만 편입한다. 부팅 디스크와 primary VNIC/private IP를 독립 resource로 중복 import하지 않는다. 편입 과정에서 기존 자원 create/update/delete/replace가 필요한 plan은 실행하지 않는다.

## 인수 기준

- 각 remote object는 하나의 state/resource address에서만 관리된다.
- 기존 Compute/IP와 DB disk/data를 보존하고 import 후 일반 `terraform plan -detailed-exitcode`가 exit 0이다. Import 예정이 포함된 plan을 사후 no-change 증거로 사용하지 않는다.
- 이후 변경의 plan 검토, 저장 plan 승인/apply, 사후 확인, drift와 state 복구 절차를 배포 지침에 남긴다.

## 검증

- Backend/권한/backup 확인 → 승인된 import → no-change plan 순서의 redacted 증거를 기록한다.
- Exit 1은 오류, exit 2는 차이로 처리한다. 차이를 숨기지 말고 계획과 실제 구성을 다시 비교한다.
- `git diff --check`와 phase JSON 검증 후 완료 상태를 기록한다.

## 하지 말 것

- 자원 재생성, 매핑 밖 공유 자원 편입, 자동 승인 apply를 하지 말 것. Reason: 편입 승인은 검토한 기존 자원의 변경 없는 편입에 한정한다.
- DNS/TLS 전환, Compose 배포, DB migration, timer/provider 활성화를 하지 말 것. Reason: 각각 별도 운영 승인 대상이다.

## 준비 결과 (2026-09-30, approval-required)

- 대상 compartment의 Object Storage namespace 조회가 성공했고 bucket 목록은 0개(추가 page 없음)였다. 현재 API 운영자는 Administrators 그룹 1개에 속한다. 중복 IAM 권한을 새로 만들지 않으며, 이는 최소 권한 전용 주체를 검증했다는 뜻이 아니다.
- `infra/terraform/oci-backend/`에 private/versioned Standard bucket 1개만 정의했다. Bootstrap local state는 저장소·임시 디렉터리 밖의 private 영구 경로를 사용하고 shared remote state와 분리한다. 두 root의 고정 버전/lockfile과 credential 없는 CI 검증을 맞췄다.
- Private 입력으로 local backend를 초기화하고 saved plan을 검토했다. Exit 2이며 `oci_objectstorage_bucket.state` **1 create, 0 update, 0 delete**만 포함한다. SHA-256은 `180a658c351068a5ed893a5e9943be6148220e0f089719cc284a6cfb5553fcd2`다. Raw plan/JSON/backend 설정은 저장소 밖에만 보존했고 managed bootstrap state는 아직 없다.
- Shared backend placeholder와 편입·부분 실패 재개·no-change 판정·drift·state version 복구 절차를 준비했다. State overwrite에 필요한 `OBJECT_OVERWRITE`를 포함해 전용 주체의 최소 object 권한 5개를 명시했다.
- 알려진 서버 backup 후보 디렉터리 3곳의 제한된 파일 metadata 조회에서는 dump를 찾지 못했다. 서버 전체에 백업이 없다는 의미가 아니며, 최신 DB backup/격리 restore 근거는 아직 미확인이다. 새 운영 dump/restore를 실행하려면 runbook의 별도 승인이 필요하다.
- 검증: 두 root의 fmt/backend-disabled init/validate, private bootstrap saved plan action 확인, phase JSON/YAML/문서 링크, Git 제외·민감정보와 `git diff --check`.
- Cloud apply, remote backend 연결, import/state 편입과 shared no-change plan은 미실행이다. Step 2는 pending을 유지한다. 다음은 위 bucket plan 적용 승인과 backup/restore 근거 확보, 그 뒤 8개 자원 편입 승인이다.
