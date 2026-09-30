# OCI 공유 인프라 구성

H-Log와 같은 Compute를 사용하는 앱들의 공통 cloud lifecycle을 위한 독립 root다. H-Log 앱 state와 backend bucket/IAM bootstrap state에 합치지 않는다. 2026-09-29 사용자 진행 지시에 따라 기존 [inventory](../../../apps/h-log/phases/terraform-infrastructure-adoption/inventory.md)의 공유 자원을 코드화했다.

현재 완료 범위는 구성, provider lockfile, 비공개 입력/import 매핑 준비와 credential 없는 검증이다. Step 2의 [별도 backend bootstrap](../oci-backend/README.md) 구성과 bucket 1개 생성 예정 saved plan도 준비했다. Shared remote backend 연결, import, shared live plan과 cloud apply는 아직 실행하지 않았다. 이 디렉터리는 새 서버 생성용 템플릿이 아니다.

## 관리 범위와 import 매핑

각 address의 실제 ID는 저장소 밖 비공개 `import-map.json`에 보관한다. 한 remote object를 다른 state/address에 중복 등록하지 않는다.

| Terraform address | 기존 자원 | 편입 전 확인 |
| --- | --- | --- |
| `oci_core_vcn.shared` | 연결 VCN | CIDR/DNS와 다른 앱 의존성 보존 |
| `oci_core_internet_gateway.shared` | 연결 Internet Gateway | 기존 enabled 상태 보존 |
| `oci_core_default_route_table.shared` | VCN 기본 route table | 기본 자원 ID 및 gateway 경로 보존 |
| `oci_core_default_security_list.shared` | VCN 기본 security list | 다른 앱을 포함한 ingress 7개·egress 1개 보존 |
| `oci_core_default_dhcp_options.shared` | VCN 기본 DHCP options | DNS resolver/search domain 보존 |
| `oci_core_subnet.shared` | 연결 regional subnet | route/security/DHCP 연결 보존 |
| `oci_core_instance.shared` | 공유 A1 Flex Compute | 원래 image source, shape, metadata, agent와 부팅 디스크 보존 |
| `oci_core_public_ip.shared` | RESERVED public IP | 기존 primary private IP assignment 보존 |

부팅 디스크는 Compute launch가 소유하므로 `data.oci_core_boot_volume.shared`로 확인하며 별도 clone/attachment resource를 만들지 않는다. 기존 primary VNIC/private IP도 Compute와 중복 관리하지 않고, reserved IP 연결에는 `data.oci_core_private_ip.primary`를 사용한다. Block attachment와 NSG는 조사 결과 0개다. IAM, compartment, DNS, DB, Compose, OAuth와 timer는 이 root의 관리 대상이 아니다.

기본 route/security/DHCP는 일반 resource 생성으로 대체하지 않는다. Provider의 `oci_core_default_*`는 기존 default object를 관리하므로, Step 2에서 명시적인 import와 변경 없는 plan을 확인해야 한다. 모든 managed resource에 `prevent_destroy`를 두고 Compute의 boot volume ID를 검증한다. Import로 읽을 수 없는 삭제 전용 `preserve_boot_volume` 옵션은 초기 편입에 추가하지 않는다. 삭제 금지는 resource block 제거 또는 update를 막는 장치가 아니므로 plan 검토와 사전 backup을 대신하지 않는다.

## 로컬 검증과 CI

Terraform 1.16.4와 `oracle/oci` 9.3.0을 고정한다. 저장소 루트에서:

```sh
terraform -chdir=infra/terraform/oci-shared fmt -check -recursive
terraform -chdir=infra/terraform/oci-shared init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/terraform/oci-shared validate -no-color
```

[공식 validate 계약](https://developer.hashicorp.com/terraform/cli/commands/validate)에 따라 backend 없이 provider만 설치한다. CI는 이 세 명령만 실행하고 OCI credential, 실제 tfvars, backend 설정을 받지 않는다. Provider lockfile은 Windows/Linux amd64에서 확인한다. 앱 코드 변경이 없으므로 앱 test/build 대신 Terraform 검증을 사용한다.

`terraform.tfvars.example`은 필드 안내용 placeholder다. 빈 보안 규칙이나 예시 태그로 실제 plan/apply하지 않는다. 비공개 입력에는 기존 태그·SSH public key metadata·agent plugin·네트워크 규칙을 모두 유지한다. Private key, DB password, OAuth token은 Terraform 변수로 옮기지 않는다.

`*.tfvars.json`, `*.tfbackend`, `*.tfstate*`, `*.tfplan*`과 `.terraform/`는 Git에서 제외한다. 저장 plan은 반드시 `.tfplan` 확장자를 사용하며 raw JSON/export/import 매핑은 저장소 밖에 둔다. `sensitive` 입력도 state에는 저장될 수 있으므로 state와 backup을 비공개로 관리한다.

## 다음 단계

[Step 2](../../../apps/h-log/phases/terraform-infrastructure-adoption/step2.md)는 [편입·복구 runbook](adoption.md)을 따른다. 최신 DB backup/restore 근거, 공유 자원 영향 범위, 실제 import ID를 다시 확인하고 전용 private bucket 생성과 shared state import를 각각 승인받는다. 현재 운영자는 기존 관리자 권한을 보유하므로 중복 IAM 정책은 추가하지 않는다. Backend 좌표는 `shared.tfbackend.example`을 참고해 저장소 밖 `shared.tfbackend`로 전달한다. Bootstrap은 별도의 private local state를 사용하고 shared root는 OCI remote state를 사용한다.

승인된 import 뒤 일반 `terraform plan -detailed-exitcode`의 exit 0을 확인해야 편입 완료다. Exit 1은 오류, exit 2는 차이이며 create/update/delete/replace가 있으면 중단한다. `ignore_changes`, `-lock=false` 또는 자동 승인 apply로 차이를 숨기지 않는다. 서버 배포, DNS/TLS, migration과 자동 발행 활성화는 별도 운영 단계다.
