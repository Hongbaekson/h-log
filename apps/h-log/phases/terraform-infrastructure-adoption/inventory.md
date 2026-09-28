# OCI inventory 조사 결과

2026-09-28 승인된 SSH/IMDS 조사와 사용자가 설정한 OCI API 인증으로 Step 0을 완료했다. 기존 H-Log instance의 GET 응답은 HTTP 200이며 RUNNING 상태였다. 연결 자원의 조회와 attachment/IP 매핑 검증도 성공했다. 사용자는 수동 관리 중이며 Terraform/OCI Resource Manager state가 없다고 확인했다. 원본 식별자와 상세 규칙은 저장소 밖 로컬 비공개 조사 기록에 보관했다.

## 확인한 자원과 관리 경계

| 대상 | 직접 확인한 근거 | 관리/import 또는 참조 결정 |
| --- | --- | --- |
| Compute | IMDS와 API의 instance가 일치하며 VM.Standard.A1.Flex다. H-Log 외 Compose 프로젝트가 2개 더 있다. | 공유 자원. ADR-016에 따라 소유권 합의 전에는 참조한다. H-Log state import 대상이 아니다. |
| PostgreSQL/Hermes 데이터 | hlog_postgres_data와 hlog_hermes_data는 local driver이며 같은 루트 ext4 filesystem에 있다. | Compose 소유 데이터로 보존한다. 별도 OCI volume으로 코드화하거나 Secret/OAuth를 Terraform 입력으로 옮기지 않는다. |
| Boot volume/attachment | 대상 instance에 ATTACHED인 boot volume 1개, API 크기 47 GiB를 확인했다. Host의 유일한 disk는 약 46.58 GiB이며 DB/Hermes mount가 그 루트 filesystem에 있다. | 공유 boot volume과 attachment를 참조한다. Compute/boot volume 교체·삭제는 DB/OAuth에 영향을 주므로 H-Log 단독 lifecycle로 편입하지 않는다. |
| Block volume/attachment | 해당 instance로 필터한 volume attachment 조회 결과가 0개다. | 관리/import 대상 없음. 다른 instance의 volume이나 미연결 volume까지 없다는 뜻은 아니다. |
| VNIC/private IP | ATTACHED primary VNIC 1개, private IPv4 1개, IPv6 0개다. Instance와 VNIC attachment를 대조했다. | 공유 Compute의 연결 정보로 참조한다. |
| Public IP | Primary private IP에 연결된 RESERVED public IP 1개를 확인하고 assigned entity를 대조했다. | 공유 서버 접근에 쓰이는 자원이므로 참조한다. 별도 H-Log import 대상이 아니다. |
| VCN/subnet | 위 VNIC에서 연결된 subnet 1개와 VCN 1개를 확인했다. | 공유 Compute를 지원하는 network로 참조한다. 다른 소비자 전체를 조사하거나 H-Log 전용 소유권을 가정하지 않는다. |
| Security list/NSG | 연결 subnet의 security list 1개에 ingress 7개, egress 1개 규칙이 있다. VNIC에 연결된 NSG는 0개다. 상세 규칙은 비공개 기록에 있다. | 공유 security list를 참조하고 기존 규칙을 보존한다. NSG import 대상은 없다. |
| Route table/Internet Gateway | 연결 route table 1개에 기본 IPv4 인터넷 경로 1개가 있고 enabled Internet Gateway 1개로 연결된다. | 공유 경로와 gateway를 참조한다. 이번 연결 경로에 없는 gateway는 조사 범위 밖이다. |
| DHCP options | 연결 subnet의 DHCP options 1개를 API로 확인했다. | 공유 network 설정으로 참조한다. |
| 기존 Terraform state | 사용자 확인: 수동 관리, Terraform/OCI Resource Manager state 없음. 로컬 Git 추적 파일과 서버 H-Log 디렉터리에도 .tf/.tfstate 파일이 없었다. | 기존 state 이전은 불필요하다. 새 backend/bootstrap과 import는 별도 승인 단계다. |

Compose named volume과 OCI block volume은 같은 자원이 아니다. 이번에 확인한 기존 cloud resource 중 H-Log가 단독으로 lifecycle을 소유하는 자원은 없다. 공유 참조 결정은 다른 서비스의 자원 사용 여부를 전수 조사했다는 의미가 아니라, 확인된 공유 Compute의 의존성과 ADR-016에 따른 관리 경계다.

## 인증과 조회 경로

- 기존 SSH alias/key로 host를 조회했고, 사용자가 추가한 기본 OCI profile과 지정한 private key를 로컬 Python OCI SDK 2.177.0으로 읽었다. Config 검증과 실제 instance GET 모두 성공했다.
- Config와 실제 key 파일의 Windows ACL은 현재 사용자, SYSTEM, Administrators의 접근으로 확인했다. 키 값, fingerprint, OCID, 서버 IP와 로컬 인증 파일 경로는 공개 문서에 남기지 않는다.
- 앞선 기본 설정 부재와 ConfigFileNotFound blocker는 해소됐다. 로컬 OCI CLI 실행 파일 복구나 서버 SDK 설치 없이 기존 SDK를 사용했다.
- Instance ID로 attachment를 필터하고 VNIC → private/public IP → subnet → VCN/security/route/gateway/DHCP로 연결된 자원만 조회했다. Tenancy 전체 export와 자원 변경은 하지 않았다.

## Provider와 버전 후보

2026-09-28 공식 stable release metadata에서 [Terraform 1.16.4](https://github.com/hashicorp/terraform/releases/tag/v1.16.4)와 [oracle/oci 9.3.0](https://github.com/oracle/terraform-provider-oci/releases/tag/v9.3.0)을 확인했다. 각각 2026-09-23과 2026-09-24 공개 버전이다. Step 1 검증 후보이며 설치, provider 초기화나 이 환경의 호환성 검증을 완료했다는 뜻은 아니다.

- 공유 Compute/storage/network 참조에는 [instance](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_instance.html), [boot volume](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_boot_volume.html), [VNIC](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_vnic.html), [public IP](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_public_ip.html), [subnet](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_subnet.html), [VCN](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_vcn.html) data source가 있다.
- [Security lists](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_security_lists.html), [route tables](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_route_tables.html), [Internet Gateways](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_internet_gateways.html), [DHCP options](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_dhcp_options.html)의 참조 계약도 확인했다. 목록 data source를 사용할 때는 compartment/VCN 범위를 지정하고 실제 연결된 ID에 맞춘다.
- [Compute instance](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_instance.html#import), [boot volume](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_boot_volume.html#import), [block volume attachment](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_volume_attachment.html#import)의 ID import 지원은 확인했다. 이번 H-Log 단독 관리 범위에는 import 대상이 없으며, 이 지원 확인이 공유 자원 import 승인을 뜻하지 않는다.

## State와 복구 경계

ADR-016의 기본안은 전용 private bucket의 native [oci backend](https://developer.hashicorp.com/terraform/language/backend/oci)다. State locking과 bucket versioning을 사용하고, state/lock object의 OBJECT_INSPECT, OBJECT_CREATE, OBJECT_DELETE, OBJECT_READ 권한을 대상 bucket에 한정한다. 기존 backend는 없다. 새 bucket과 IAM 주체는 관리 범위 결정 후 별도 승인으로 정한다.

Backend bucket/IAM bootstrap은 앱 자원 state와 별도로 관리한다. 복구 전에는 writer 중단과 lock 소유자 확인, 복구할 state version 및 실제 자원의 대응 확인이 필요하다. 잠금 무시나 확인 없는 force-unlock은 하지 않는다.

State 복구는 DB 복구를 대신하지 않는다. 현재 연결된 boot volume의 backup 조회 결과와 backup policy assignment는 각각 0개였다. 다른 backup 방식까지 없다고 판단하지 않는다. [기존 운영 기록](../auto-publish-ops-hardening/step4.md)은 2026-07-24 logical dump와 격리 restore 성공을 기록하지만 이번 조사에서 해당 백업의 현재 위치·보존 여부나 복구 가능성을 재검증하지 않았다. 이후 공유 Compute/storage 편입 전에는 [backup/restore runbook](../../.codex/docs/backup-restore-runbook.md)에 따라 현재 백업과 복구 근거를 확인해야 한다.

## 완료 결과와 다음 결정

Step 0은 연결 자원별 참조 결정, DB 저장 disk 대응, 기존 state 부재, provider 후보와 state 복구 경계를 확인해 completed다. Step 1은 관리 범위 결정 대기다. 확인된 자원이 모두 공유 참조 대상이므로, 공유 인프라를 별도 root/state에서 관리할지 또는 H-Log 전용 관리 자원이 생길 때까지 코드화를 유예할지 정해야 한다. 빈 Terraform module이나 참조만 담은 state를 먼저 만들지 않는다.

DB query/dump, OAuth 내용 조회, 서버 파일 쓰기, 패키지 설치, backend 생성, import/state 변경, apply, Compose 재기동, migration, DNS/TLS와 timer 활성화는 수행하지 않았다.

검증: SDK config와 실제 instance GET, 연결 자원 API 조회 및 attachment/IP 대응, provider 공식 문서 대조, phase JSON/step 경로/문서 링크 검사, 비공개 식별자 대조, 민감정보 검사와 git diff --check. Production code 변경이 없어 TDD와 앱 build는 적용하지 않는다.
