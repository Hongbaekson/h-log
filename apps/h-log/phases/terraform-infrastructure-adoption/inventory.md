# OCI inventory 조사 결과

2026-09-28 사용자가 OCI/SSH 읽기 전용 조사를 승인했다. 기존 ssh oci 접속과 host/instance metadata 조사는 성공했다. 사용자는 현재 수동 관리 중이며 Terraform/OCI Resource Manager state가 없다고 확인했다. Step 0은 OCI control-plane 조회 인증 경로와 연결 자원 매핑이 확인되지 않아 blocked 상태다. 원본 식별자는 저장소 밖 로컬 비공개 조사 기록에 보관했다.

## 확인한 자원과 관리 경계

| 대상 | 직접 확인한 근거 | 관리 결정과 남은 확인 |
| --- | --- | --- |
| Compute | IMDS에서 instance/compartment 식별 정보와 VM.Standard.A1.Flex를 확인했다. H-Log 외 Compose 프로젝트가 2개 더 있다. | 공유 자원. ADR-016에 따라 H-Log state로 import하지 않고 참조한다. 사용자 확인: 수동 관리, 기존 state 없음 |
| PostgreSQL 데이터 | 운영 hlog-postgres의 mount와 hlog_postgres_data volume을 대조했다. local driver의 mount가 루트 ext4 filesystem에 있다. | Compose가 소유하는 데이터. 별도 OCI volume으로 코드화하지 않는다. 실제 boot volume OCID/attachment는 API 확인 필요 |
| Hermes 데이터 | hlog_hermes_data도 local driver이며 같은 루트 filesystem을 사용한다. OAuth 파일 내용은 읽지 않았다. | 기존 volume을 보존한다. Secret/OAuth를 Terraform 입력으로 옮기지 않는다. |
| Host disk | lsblk에서 disk 1개, 약 46.58 GiB를 확인했다. PostgreSQL/Hermes volume 모두 같은 루트 filesystem에 있다. | 공유 host의 root disk. H-Log 전용 import 대상에서 제외한다. OS에 보이지 않는 OCI attachment 유무는 미확인 |
| VNIC/IP | IMDS에서 VNIC 1개의 식별 정보를 확인했다. | 공유 Compute의 연결 정보로 참조한다. primary 여부, public IP 유형과 subnet/NSG는 API 확인 필요 |
| Network/security | VCN, subnet, security list/NSG, route/gateway의 control-plane 상세는 조회하지 못했다. | 전용/공유 판정 대기. H-Log 전용이라고 가정하지 않는다. |
| 기존 Terraform state | 2026-09-28 사용자가 수동 관리 중이며 Terraform/OCI Resource Manager state가 없다고 확인했다. 로컬 Git 추적 파일과 서버 H-Log 디렉터리에도 .tf/.tfstate 파일이 없었다. | 기존 state 이전은 불필요하다. 새 backend/bootstrap과 import는 별도 승인 단계에서 진행한다. |

Compose named volume과 OCI block volume은 같은 자원이 아니다. 현재 DB는 공유 host의 root filesystem에 있으므로 Compute/root disk의 교체나 삭제가 DB/OAuth 보존에 영향을 준다. H-Log 단독 state로 공유 자원의 lifecycle을 가져오지 않는다.

## 조회 경로와 남은 입력

- 기존 SSH alias와 key 등록을 찾아 접속을 확인했다. 로컬의 PATH 밖 OCI 설치 폴더에는 Python OCI SDK 2.177.0과 CLI package 파일이 있다. 해당 설치의 Scripts 폴더에 OCI 실행 파일은 없으며, 앞선 PATH/기본 Python 확인만으로 SDK 부재를 판단한 기록을 정정한다.
- Windows 사용자, WSL 사용자/root와 서버 사용자/root의 기본 및 레거시 OCI 설정 파일을 찾지 못했다. 확인한 OCI/TF_VAR 환경변수에도 인증 설정이 없었고, 설치된 SDK의 기본 설정 로드는 ConfigFileNotFound로 실패했다. 사용자 문서 폴더와 등록된 연결 설정에서도 OCI API 설정 경로를 찾지 못했다. SSH key 등록과 OCI API 인증은 구분하며, 다른 사용자 지정 위치에 설정이 없다고 단정하지 않는다.
- 사용자에게 기존 등록이 SSH key, OCI API key/CLI profile, 콘솔 로그인 중 어느 경로인지 확인 중이다. Instance Principal의 IAM 권한은 미확인이다. 키나 토큰 값과 로컬 인증 파일 경로는 공개 문서에 기록하지 않는다.
- 사용자의 수동 관리·기존 state 없음 확인으로 state 소유권 입력 대기는 해소됐다.
- 인증 경로가 확인되면 이미 확인한 instance에서 범위를 좁혀 boot/block attachment, VNIC/IP, 연결된 subnet/VCN/security/route/gateway만 읽는다. 실제 ID/import 매핑과 backend 위치는 비공개 기록에 둔다.

## Provider와 버전 후보

2026-09-28 공식 stable release metadata에서 [Terraform 1.16.4](https://github.com/hashicorp/terraform/releases/tag/v1.16.4)와 [oracle/oci 9.3.0](https://github.com/oracle/terraform-provider-oci/releases/tag/v9.3.0)을 확인했다. 각각 2026-09-23과 2026-09-24 공개 버전이다. Step 1 검증 후보이며 설치, provider 초기화나 이 환경의 호환성 검증을 완료했다는 뜻은 아니다.

- 공유 자원 조회에는 [instance data source](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_instance.html), [boot volume data source](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_boot_volume.html), [VNIC data source](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/d/core_vnic.html)가 있다.
- [Compute instance](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_instance.html#import), [boot volume](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_boot_volume.html#import), [block volume attachment](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_volume_attachment.html#import)의 ID import 지원은 확인했다. 공유 자원 import 승인이나 실제 H-Log 전용 자원 존재의 근거로 사용하지 않는다.
- Network/security 자원은 실제 유형과 소유권을 확인한 뒤 해당 provider resource/import 계약을 대조한다.

## State와 복구 경계

ADR-016의 기본안은 전용 private bucket의 native [oci backend](https://developer.hashicorp.com/terraform/language/backend/oci)다. State locking과 bucket versioning을 사용하고, state/lock object의 OBJECT_INSPECT, OBJECT_CREATE, OBJECT_DELETE, OBJECT_READ 권한을 대상 bucket에 한정한다. 기존 backend는 없다. 새 bucket과 IAM 주체는 아직 정하지 않았다.

Backend bucket/IAM bootstrap은 앱 자원 state와 별도로 관리한다. 복구 전에는 writer 중단과 lock 소유자 확인, 복구할 state version 및 실제 자원의 대응 확인이 필요하다. 잠금 무시나 확인 없는 force-unlock은 하지 않는다.

State 복구는 DB 복구를 대신하지 않는다. [기존 운영 기록](../auto-publish-ops-hardening/step4.md)은 2026-07-24 logical dump와 격리 restore 성공을 기록하지만 이번 조사에서 백업 파일의 현재 위치·보존 여부나 복구 가능성을 재검증하지 않았다. 이후 편입 전에는 [backup/restore runbook](../../.codex/docs/backup-restore-runbook.md)에 따라 기존 백업 위치와 복구 근거를 확인해야 한다.

## 범위와 완료 조건

원격 작업은 instance metadata, H-Log container/volume mount, filesystem/device, 공유 여부 집계와 조회 도구 유무 확인으로 한정했다. DB query/dump, OAuth 내용 조회, 서버 파일 쓰기, 패키지 설치, backend 생성, import/state 변경, apply, Compose 재기동, migration, DNS/TLS와 timer 활성화는 수행하지 않았다.

Step 0 완료에는 연결 자원 전체의 전용/공유 및 기존 state 소유권, 관리/import 또는 참조 결정, DB disk의 OCI attachment 대응과 state 복구 경계가 필요하다. API 인증 경로와 연결 자원 상세 확인이 남아 Step 1은 pending으로 유지한다. 확인된 H-Log 전용 cloud resource가 없으면 빈 Terraform module을 만들지 않고 관리 범위를 먼저 정한다.

검증: 저장소 밖 host inventory와 공개 요약 대조, provider 공식 문서 대조, phase JSON 파싱, 문서 링크 확인, 민감정보 검사와 git diff --check. Production code 변경이 없어 TDD와 앱 build는 적용하지 않는다.
