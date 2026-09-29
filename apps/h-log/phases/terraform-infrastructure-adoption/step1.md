# Step 1: codify-existing-oci-infrastructure

## 읽을 파일

- `apps/h-log/AGENTS.md`, `.codex/skills/harness/SKILL.md`
- `apps/h-log/.codex/docs/harness/`의 `PRD.md`, `ADR.md`, `ARCHITECTURE.md`, `WORKFLOW.md`, `AGENT_LOOP.md`, `IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/phases/terraform-infrastructure-adoption/index.json`, `step0.md`와 검증된 inventory
- `.gitignore`와 `.github/workflows/`의 기존 검증 workflow

## 작업

2026-09-29 사용자 진행 지시에 따라 공유 인프라의 코드화 범위를 별도 `infra/terraform/oci-shared/` root로 정했다. Step 0에서 확인한 Compute, reserved public IP, VCN/subnet/gateway와 기본 route/security/DHCP만 코드화한다. 부팅 디스크와 primary VNIC/private IP는 Compute와 중복 관리하지 않고 참조한다. 지원 CLI/provider constraints와 `.terraform.lock.hcl`, placeholder 입력 예시, state/plan/실제 tfvars/backend 설정의 Git 제외 규칙을 추가한다. 실제 import ID 매핑은 비공개로 보관한다. 기존 CI에는 credential 없는 fmt/validate만 연결한다. Backend bootstrap과 실제 state 편입은 Step 2에 남긴다.

## 인수 기준

해당 root에서 아래 검증을 통과한다. Init은 provider 설치만 하며 OCI credential, backend 연결, live plan은 사용하지 않는다.

```bash
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
git diff --check
```

## 검증

- 구성과 inventory의 소유권/의존성/import 매핑을 대조한다.
- Git 제외 규칙과 비공개 값 유출 여부를 확인한다.
- 로컬 검증은 live plan이나 production 적용 완료가 아님을 phase에 기록한다.

## 하지 말 것

- 재사용처 없는 module 계층이나 provisioner를 만들지 말 것. Reason: 확인된 단일 OCI 구성이 범위다.
- Import/state 연결/apply를 실행하지 말 것. Reason: 별도 승인된 Step 2에서 다룬다.

## 실행 결과 (2026-09-29)

- 공유 root에 managed resource 8개와 boot volume/primary private IP 참조 2개를 작성했다. 알려진 11개 자원의 GET으로 기존 설정과 default resource 여부를 확인하고, 실제 tfvars와 중복 없는 import ID 매핑은 저장소 밖에 보관했다.
- Terraform 1.16.4와 OCI provider 9.3.0을 고정하고 공식 서명/Windows·Linux amd64 체크섬을 lockfile에 기록했다. Managed resource는 `prevent_destroy`, Compute는 기존 boot volume ID 대조로 DB disk를 보호한다. Import로 읽지 못하는 삭제 전용 옵션은 초기 차이를 만들지 않도록 제외했다.
- 기존 H-Log CI에 credential 없는 fmt/init/validate job과 해당 root path trigger를 추가했다.
- 검증: fmt, backend-disabled init, validate(비공개 입력 포함), provider schema/inventory 대응, JSON/YAML/문서 링크, Git 제외·민감정보 검사, `git diff --check`.
- 구성·문서 변경만 있어 TDD와 앱 test/build는 제외했다. Backend 연결, import/state 변경, live plan, apply와 production runtime 변경은 수행하지 않았다. 다음은 Step 2의 backend/편입 승인과 import 후 no-change plan이다.
