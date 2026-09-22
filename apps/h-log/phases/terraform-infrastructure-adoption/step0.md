# Step 0: inventory-oci-resources-and-state-boundary

## 읽을 파일

- `apps/h-log/AGENTS.md`, `.codex/skills/harness/SKILL.md`
- `apps/h-log/.codex/docs/harness/`의 `PRD.md`, `ADR.md`, `ARCHITECTURE.md`, `WORKFLOW.md`, `AGENT_LOOP.md`, `IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/compose.yaml`, `apps/h-log/phases/index.json`

## 작업

기존 `public-surface-refactor-pruning / Step 1` 뒤에 진행한다. OCI 조회 범위를 승인받아 H-Log 전용/공유 자원과 기존 state 소유자를 구분하고, provider resource/import 지원과 의존성을 확인한다. Compute뿐 아니라 boot/block volume, DB 데이터 위치, VNIC/IP와 network/security 경계를 확인한다. 원본 식별자는 저장소 밖에 보관하고 공개 문서에는 자원 유형·소유 범위만 기록한다.

Native `oci` backend의 private bucket, IAM 최소 권한, locking/versioning, 복구와 별도 bootstrap state 경계를 정한다. 아직 Terraform 코드나 backend를 만들지 않는다.

## 인수 기준

- 대상 자원마다 관리/import 또는 공유 참조 결정과 근거가 있다.
- DB disk 보존과 state 복구 경로, 지원 CLI/provider 버전 후보가 확인됐다.
- 실제 조회 권한/자료가 없으면 추측으로 완료 처리하지 않고 필요한 입력을 기록한다.

## 검증

- Inventory와 provider 공식 문서를 대조하고 phase JSON을 파싱한다.
- `git diff --check`와 diff의 민감정보 검사를 통과한다.

## 하지 말 것

- 전체 tenancy를 무차별 export하지 말 것. Reason: H-Log 밖 자원과 민감정보는 범위 밖이다.
- Backend 생성, import/apply 또는 OCI 설정 변경을 하지 말 것. Reason: 이 step은 읽기 전용 조사다.
