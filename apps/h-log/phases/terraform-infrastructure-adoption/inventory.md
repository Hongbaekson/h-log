# OCI inventory 사전 확인

2026-09-28 기준 Step 0은 blocked다. 로컬 구성과 공식 문서만 확인했으며 실제 자원 소유권, DB disk, import 매핑은 미확인이다. 자동 승인 검토가 명시적인 서버 접근 승인이 없다는 이유로 ssh oci 실행을 거절했다.

## 로컬에서 확인한 근거

| 근거 | 확인한 내용 | live 확인이 필요한 내용 |
| --- | --- | --- |
| compose.yaml | hlog-postgres가 postgres_data를 /var/lib/postgresql/data에 연결한다. | 운영 override, host mount와 boot/block volume 대응 |
| compose.yaml | hlog-auto-publish가 hermes_data를 /opt/data에 연결한다. | OAuth volume의 실제 disk와 보존 경계 |
| 배포 지침 | 접속 alias는 ssh oci, Compose 기준 경로는 /opt/stacks/h-log다. | 실제 접속, 대상 instance와 compartment |
| 로컬 도구 | SSH 설정 파일은 있다. PATH에 OCI/Terraform CLI가 없고 기본 ~/.oci/config도 없다. | 서버 도구와 읽기 전용 OCI 인증 경로 |
| Git 추적 파일 | Terraform 구성과 state/tfvars 파일이 없다. | 저장소 밖 또는 OCI Resource Manager 등 기존 state 소유자 |

Compose named volume은 OCI block volume 존재의 증거가 아니다. 운영 mount source에서 filesystem/device를 따라가 OCI attachment와 대조해야 DB disk를 판정할 수 있다. 저장소에 state가 없다는 사실도 다른 state 소유자가 없다는 증거가 아니다.

## 승인 후 조회할 범위

1. 기존 ssh oci 대상의 H-Log 디렉터리와 조회 도구 유무를 확인한다.
2. H-Log PostgreSQL/Hermes volume의 mount와 해당 filesystem/device를 읽는다. DB query, dump, OAuth 파일 내용, container 환경값은 조회하지 않는다.
3. 대상 instance에서 범위를 고정하고 연결된 boot/block volume, attachment, VNIC/IP, subnet/VCN, security list/NSG 및 연결된 route/gateway를 조회한다. 공유 여부가 불명확하면 관리 대상으로 확정하지 않는다.
4. 해당 자원의 기존 state 관리자와 backend 위치를 확인한다. 전체 tenancy export나 state 내용 일괄 수집은 하지 않는다.

실제 식별자, IP, host mount, backend 위치와 import ID 매핑은 저장소 밖 비공개 운영 기록에 보관한다. 공개 결과에는 자원 유형, 전용/공유 판정, 관리/import 또는 참조 결정과 확인 일시만 남긴다.

## 공식 지원 확인

아래는 provider의 import 지원이며 실제 자원의 존재나 편입 결정이 아니다.

- [Compute instance](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_instance.html#import), [boot volume](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_boot_volume.html#import), [block volume attachment](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_volume_attachment.html#import)는 각각 ID import를 지원한다.
- Volume 자체, primary/secondary VNIC, IP 유형, network/security 자원은 실제 유형과 공유 여부를 확인한 뒤 해당 provider 문서를 대조한다.
- CLI/provider 조합은 미확정이다. 실제 자원과 실행 환경에 맞는 지원 버전 후보를 확인한 뒤 Step 1에서 버전 고정과 backend-disabled init/validate를 수행한다.

## State와 복구 경계

ADR-016의 기본안은 전용 private bucket의 native [oci backend](https://developer.hashicorp.com/terraform/language/backend/oci)다. 공식 문서는 state locking, bucket versioning과 대상 bucket에 한정한 OBJECT_INSPECT, OBJECT_CREATE, OBJECT_DELETE, OBJECT_READ 권한을 안내한다. 실제 IAM 주체와 bucket은 아직 정하지 않았다.

Backend bucket/IAM bootstrap은 앱 자원 state와 별도로 관리한다. State version 복구 전에는 writer를 중단하고 lock 소유자, 복구할 version, 실제 자원과의 대응을 확인해야 한다. State 복구는 DB 복구를 대신하지 않는다. DB 보존은 실제 mount/attachment와 기존 logical backup/restore 기록으로 별도 확인한다.

## 재개 조건

위 범위의 OCI/SSH 읽기 전용 조사 승인과 사용 가능한 인증 경로가 필요하다. 각 자원의 소유권과 관리/import 또는 참조 결정, DB disk 보존 근거, state 복구 경계, CLI/provider 후보를 확인해야 Step 0을 완료한다. 실제 inventory가 끝나기 전에는 Step 1을 시작하지 않는다.

Backend 생성, import/state 변경, apply, Compose 재기동, migration, DNS/TLS와 timer 활성화는 조사 범위에 포함하지 않는다. 이번 산출물은 문서이므로 phase JSON 파싱, 로컬 근거/공식 문서 대조, 민감정보 검사와 git diff --check로 검증한다.
