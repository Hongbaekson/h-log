# Step 1: codify-existing-oci-infrastructure

## 읽을 파일

- `apps/h-log/AGENTS.md`, `.codex/skills/harness/SKILL.md`
- `apps/h-log/.codex/docs/harness/`의 `PRD.md`, `ADR.md`, `ARCHITECTURE.md`, `WORKFLOW.md`, `AGENT_LOOP.md`, `IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/phases/terraform-infrastructure-adoption/index.json`, `step0.md`와 검증된 inventory
- `.gitignore`와 `.github/workflows/`의 기존 검증 workflow

## 작업

Step 0에서 확인한 자원만 `apps/h-log/infra/terraform/`의 작은 root module로 코드화한다. 공유 자원은 참조만 한다. 지원 CLI/provider constraints와 `.terraform.lock.hcl`, placeholder 입력 예시, state/plan/실제 tfvars/backend 설정의 Git 제외 규칙을 추가한다. 실제 import ID 매핑은 비공개로 보관한다. 기존 CI에는 credential 없는 fmt/validate만 연결한다.

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
