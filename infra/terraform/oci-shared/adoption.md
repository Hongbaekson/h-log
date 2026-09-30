# 기존 OCI 자원 편입과 state 복구

[Step 2](../../../apps/h-log/phases/terraform-infrastructure-adoption/step2.md)의 운영 실행 절차다. [Bootstrap](../oci-backend/README.md) 생성 승인과 아래 공유 자원 import 승인은 별개다. 최초 편입 중 기존 cloud resource의 변경은 허용하지 않는다.

## 편입 전 확인

1. 고정 commit의 shared root와 비공개 `shared.tfvars.json`/`import-map.json`을 최신 GET 결과에 대조한다. [README의 8개 address](README.md#관리-범위와-import-매핑)와 실제 ID가 일대일이고 다른 state에 등록되지 않았는지 다시 확인한다. Boot volume, primary VNIC/private IP는 독립 import하지 않는다.
2. 현재 DB backup의 시각·checksum·보존 위치와 격리 restore 결과를 확인한다. [Backup runbook](../../../apps/h-log/.codex/docs/backup-restore-runbook.md)의 vector/migration/current version/content hash 검증 근거가 필요하다. 과거 기록만으로 현재 복구 가능성을 단정하지 않는다. 새 운영 dump/격리 restore가 필요하면 대상·시점·격리 volume을 정해 별도 승인을 받는다.
3. 승인된 bucket의 `NoPublicAccess`/versioning `Enabled`, 운영자 접근, shared key와 bootstrap local state 분리를 확인한다. 전용 주체를 사용할 때에는 bucket에 한정한 5개 object 권한을 확인한다. 기존 관리자 계정 사용은 전용 주체의 최소 권한 검증으로 기록하지 않는다.
4. 외부 `shared.tfbackend`는 `shared.tfbackend.example`의 좌표와 key만 담는다. Credential은 OCI profile로 공급한다. 기본 workspace만 사용한다. 해당 state key와 `.lock` key가 이미 있다면 자동 덮어쓰기·해제하지 않고 소유자를 확인한다.
5. 위 근거와 8개 address/ID의 private 매핑, 중단·복구 절차를 검토한 뒤 **remote backend 연결과 8개 import/state 쓰기**를 명시 승인받는다. 준비 부족이나 새 운영 backup 필요를 숨기지 않는다.

## 승인된 실행

저장소 루트에서 아래 명령을 사용한다. `<...>`은 실제 private 절대 경로이며 출력/state/plan은 공개 log로 보내지 않는다.

```sh
terraform -chdir=infra/terraform/oci-shared init -input=false -lockfile=readonly -backend-config=<private-shared.tfbackend>
terraform -chdir=infra/terraform/oci-shared workspace show
```

기존 초기화 정보와 충돌하면 `-reconfigure`나 `-migrate-state`를 자동 실행하지 않는다. 연결 대상과 이전 state를 먼저 확인한다. Shared state가 비어 있어야 하며 예상하지 못한 자원이 있으면 중단한다.

Import는 한 번에 하나씩 실행한다. 권장 순서는 VCN → Internet Gateway → default route → default security → default DHCP → subnet → instance → reserved public IP다. Private 매핑의 ID만 사용한다.

```sh
terraform -chdir=infra/terraform/oci-shared import -input=false -lock-timeout=60s -var-file=<private-shared.tfvars.json> <approved-address> <approved-id>
```

CLI import는 cloud resource를 수정하는 apply 없이 state에 기존 자원을 등록한다. 각 성공 뒤 state의 ID/address를 확인하고 private snapshot을 보존한다. 중간에 실패하면 이미 성공한 import를 삭제하지 않는다. State를 조회해 ID가 일치하는 항목만 건너뛰고, 남은 승인 매핑에서 재개한다. ID 불일치는 별도 state 수정 검토 대상이다.

8개 편입을 모두 마친 뒤 **일반 plan**을 실행한다.

```sh
terraform -chdir=infra/terraform/oci-shared plan -input=false -lock-timeout=60s -detailed-exitcode -var-file=<private-shared.tfvars.json> -out=<private-post-import.tfplan>
```

- Exit 0: 변경 없음. Managed address 8개/ID, boot volume 및 IP 연결, 기존 서버 상태와 함께 redacted receipt에 기록한다.
- Exit 1: 오류. 원인과 마지막 성공 import를 기록하고 중단한다.
- Exit 2: 차이. 기존 설정과 HCL을 대조해 코드/입력을 수정하고 재검증한다. Create/update/delete/replace를 적용하지 않는다. `-target`, `-refresh=false`, `ignore_changes`, refresh-only plan으로 차이를 숨기지 않는다.

Data source의 state 기록은 managed resource 편입 개수에 세지 않는다. 정상 plan의 잠금 생성·해제와 object version 생성을 확인하며, 잠금 충돌 시 소유자를 확인한다. 잠금 무시나 무조건적인 force-unlock은 금지한다.

## 이후 변경과 drift

변경은 고정 commit·private 입력으로 saved plan을 만들고 상세 action, 비용, 네트워크 공개 범위, Compute/DB disk 영향을 검토한다. Private plan의 checksum과 대상을 승인받은 뒤 같은 파일을 apply한다. 적용 후 일반 plan exit 0 및 해당 자원/서비스 상태를 확인한다. Drift 발견이나 Git push는 자동 수정·배포 승인이 아니다.

## State 복구

1. 모든 writer를 중단하고 현재 lock 소유자/진행 중 작업을 확인한다. 마지막 정상 state와 현재 state를 private 위치에 각각 보존한다. `terraform state pull` 출력도 공개하지 않는다.
2. Bucket version 목록에서 복구 후보를 선택해 private 파일로 내려받는다. Lineage, serial, 8개 address/실제 ID와 최신 실제 자원을 대조한다. Bootstrap local state와 shared remote state를 혼동하지 않는다.
3. 복구 대상 version, 현재 상태와 차이, overwrite 영향을 제시하고 **state 복구 승인**을 별도로 받는다. 일반적으로 `terraform state push <verified-private-state>`의 lineage/serial 보호를 유지한다. 이전 serial 복구가 거절되면 `-force` 또는 object 직접 덮어쓰기를 자동 실행하지 않는다.
4. 승인된 복구 뒤 일반 plan과 실제 자원 조회로 검증한다. State 복구는 Compute 재생성이나 DB restore를 대신하지 않는다. State/lock 삭제, backend 재생성, 자동 승인 apply는 복구 수단으로 사용하지 않는다.

운영 receipt에는 commit, UTC 시각, 실행 단계/exit code, import address 개수, no-change 결과, backup/restore 확인 여부만 남긴다. 실제 식별자, state/plan 원문, credential과 내부 주소는 private 기록으로 보존한다.
