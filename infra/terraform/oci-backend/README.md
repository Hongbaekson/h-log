# OCI state backend bootstrap

공유 자원 편입을 위한 전용 Object Storage bucket 하나를 만드는 독립 root다. 기존 [shared root](../oci-shared/README.md)와 state를 합치지 않는다. 구성 준비와 검증은 bucket 생성 승인을 뜻하지 않는다.

## 승인 대상

- `oci_objectstorage_bucket.state` 1개: 기존 compartment/region에 Standard storage, `NoPublicAccess`, versioning `Enabled`, `prevent_destroy`로 생성한다.
- 실제 bucket 이름·namespace·compartment는 저장소 밖 입력에 둔다. State와 이전 version의 저장 비용이 발생할 수 있다.
- 2026-09-30 조회에서 대상 compartment의 bucket은 0개이고 현재 운영자는 기존 Administrators 그룹의 구성원이다. 이 계정에 같은 권한을 다시 주는 IAM policy나 새 credential은 만들지 않는다. `NoPublicAccess`는 익명 접근을 막으며 기존 tenancy 관리자 권한을 축소하지 않는다.
- Bootstrap은 기존 관리자 인증으로 수동 실행한다. CI에는 credential을 주지 않는다. 전용 실행 주체로 전환할 경우 기존의 광범위한 권한과 아래 bucket 한정 권한을 별도로 검토·승인한다.

Bucket에 한정할 backend 권한은 `OBJECT_INSPECT`, `OBJECT_READ`, `OBJECT_CREATE`, `OBJECT_OVERWRITE`, `OBJECT_DELETE`다. [OCI 권한 계약](https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/objectstoragepolicyreference.htm)에 따라 기존 state object를 다시 쓰려면 `OBJECT_OVERWRITE`도 필요하다. Object의 이전 version 영구 삭제 권한과 bucket/IAM 변경 권한은 이 목록에 포함하지 않는다.

## 로컬 검증

```sh
terraform -chdir=infra/terraform/oci-backend fmt -check -recursive
terraform -chdir=infra/terraform/oci-backend init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/terraform/oci-backend validate -no-color
```

CLI/provider pin과 Windows/Linux lockfile은 shared root와 같다. CI는 두 root에서 위 세 검증만 수행한다.

## Bootstrap 실행과 복구

1. `terraform.tfvars.example`과 `local.tfbackend.example`을 참고해 실제 입력을 저장소 밖에 만든다. Local state는 임시 폴더가 아닌 접근이 제한된 영구 디렉터리에 둔다. 별도 장치나 승인된 private 저장소에 state backup도 보존한다.
2. 해당 local backend로 `init -input=false -lockfile=readonly -backend-config=<private-local.tfbackend>` 후 `plan -input=false -lock-timeout=60s -detailed-exitcode -var-file=<private.tfvars.json> -out=<private-bootstrap.tfplan>`을 만든다. Plan 원문과 JSON은 private 디렉터리에만 보관한다. Plan 생성은 cloud resource를 변경하지 않는다.
3. Plan이 위 bucket **1 create, 0 update, 0 delete**만 포함하는지 확인한다. Bucket 이름 충돌이나 기존 state가 발견되면 중단하고 기존 소유자를 확인한다. 저장 plan의 SHA-256, 코드 commit, 대상과 비용 경계를 제시한 뒤 명시 승인을 받는다.
4. 승인된 동일 saved plan만 `terraform apply <private-bootstrap.tfplan>`로 적용한다. 적용 전에 checksum과 commit을 다시 대조한다. 새 plan을 만들었다면 다시 검토한다.
5. Bucket의 public access/versioning을 재조회하고 bootstrap 일반 plan exit 0을 확인한다. Local state와 backup을 private 복구 위치에 보존한다. Bucket 자체를 자신이 저장하는 shared state에 import하지 않는다.
6. [편입 runbook](../oci-shared/adoption.md)의 사전 확인과 별도 import 승인을 거친다.

Bootstrap state가 손실되면 writer를 멈추고 보존한 state/backup의 lineage, serial, bucket 대응을 확인한다. 복구본이 없을 때에는 재생성 plan을 적용하지 말고 기존 bucket의 provider import ID와 별도 state 복구 승인을 먼저 확인한다. Bucket 삭제는 복구 절차가 아니다.

Native backend의 locking은 [Terraform OCI backend](https://developer.hashicorp.com/terraform/language/backend/oci)가 제공한다. Shared state에는 외부 `shared.tfbackend`를 사용하고, lock을 끄거나 retention rule로 lock object 삭제를 막지 않는다. Lifecycle expiration, public/PAR access, 새 IAM, DNS/TLS, Compute 변경은 이 root에 포함하지 않는다.
