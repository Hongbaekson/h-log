# Step 1: private-metrics-stack

## 개선 사항과 선행 조건

Step 0 완료 후 Prometheus와 Grafana의 격리 로컬 실행 기반만 만든다. 호스트/DB exporter와 업무 지표는 후속 step에서 연결한다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 이전 step이 만든 실제 설정·collector·test·runbook도 수정 전에 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`
- `apps/h-log/phases/operations-observability/index.json`
- `apps/h-log/phases/operations-observability/step0.md`
- `apps/h-log/compose.yaml`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`

## 작업

1. Step 0에서 확정한 선택형 Compose 구성과 deploy/observability 디렉터리를 만든다. 앱의 기본 compose 실행에 모니터링이 자동 포함되지 않게 하고 별도 project/volume으로 local smoke를 진행한다.
2. 공식 이미지의 지원 버전·digest·CPU architecture를 확인하고 pin 근거를 기록한다. credential 없는 예시만 커밋하며 Grafana 관리자 secret은 저장소 밖 local secret으로 주입한다.
3. Prometheus self-scrape와 Grafana datasource를 provisioning한다. Grafana는 충돌 없는 localhost 포트에만 바인딩하고 익명 접근을 끈다. exporter/DB/Prometheus ingress를 공개하지 않는다.
4. 서비스별 자원 제한, retention, log rotation, volume 소유권과 read-only config를 적용한다. 재기동 시 datasource와 history가 유지되는지 확인한다.

## 인수 기준

구성 검증·기동·self-scrape·Grafana datasource·재기동 보존이 통과한다. 외부 비인가 접근과 public Nginx metrics 경로가 차단되고 기존 앱의 기본 Compose 구성이 유지된다.

## 검증

1. 선택형/기본 Compose 각각 docker compose ... config --quiet와 promtool check config를 실행한다. 정확한 인자는 완료 기록에 남긴다.
2. 격리 로컬 기동 후 readiness·self up·datasource 조회·재기동·localhost binding·익명 접근 차단을 확인한다.
3. 추가된 JSON/YAML과 git diff --check를 검증한다. 정리는 이번 격리 project 자원만 대상으로 한다.
4. 이 phase의 index와 현재 step에 실제 결과·command·남은 결정·다음 step을 기록한다. 상세 공통 gate는 OBSERVABILITY_PLAN을 따른다.

## 하지 말 것

- latest tag나 실제 password/webhook을 커밋하지 말 것. 재현성과 비밀 경계를 지켜야 한다.
- production Compose 재시작이나 기존 DB volume 정리를 하지 말 것. 이번 범위는 로컬 수집 기반이다.
- 민감 본문·credential·내부 URL/IP를 metric/label/로그/알림/커밋에 넣지 말 것. 운영 데이터도 공개 저장소의 privacy 경계를 따른다.
- Discord 스타일과 레이더 전체 영역을 변경하지 말 것. 이번 phase는 비공개 운영 모니터링 범위다.
- OCI·DNS/TLS·운영 timer·실제 provider·외부 알림 전송을 실행하지 말 것. 현재 사용자 보류와 로컬 검증 범위를 유지한다.
