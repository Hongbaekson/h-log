# Step 5: dashboards-and-alert-routing

## 개선 사항과 선행 조건

Steps 0–4 완료 후 수집 지표를 운영 화면과 알림에 연결한다. 외부 Discord 발송 대신 local mock receiver로 검증한다.

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
- `apps/h-log/phases/operations-observability/step4.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/deploy/systemd/hlog-auto-publish.timer`

## 작업

1. 앞 step의 실제 metrics/config를 읽고 Grafana datasource/dashboard/alert/contact policy를 file provisioning으로 구성한다. 화면은 서비스·서버/DB·발행/비용·백업 4개 영역으로 제한한다.
2. 모든 panel에 단위·집계 기간·시간대와 freshness를 표시한다. included/unknown 비용, disabled schedule, never succeeded, No Data/Error를 구분한다.
3. OBSERVABILITY_PLAN의 확정 임계값·지속 시간을 rule로 구현한다. 새 실패/진행 중 실패와 누적 과거 이력을 구분한다. collector 누락은 정상이나 복구로 간주하지 않는다.
4. 09:00 KST 발행 deadline과 UTC budget reset, 최초 활성화와 planned maintenance를 반영한다. 알림 그룹·심각도별 재알림 간격·복구 통지와 수집기 장애 경로를 명시한다.
5. 알림 template에는 안전한 서비스 별칭과 대응 runbook 링크를 넣는다. 실 webhook은 secret 주입 placeholder만 남기고 mock receiver로 routing을 시험한다.

## 인수 기준

깨끗한 Grafana 재기동 후 동일한 화면과 rule이 재현된다. 정상/firing/지속/중복 억제/resolved/No Data/Error/maintenance와 시간대 경계가 구분돼 mock receiver에 도착한다.

## 검증

1. JSON/YAML parse, Prometheus config 검사와 사용한 PromQL의 fixture 검증을 실행한다. recording rule이 있으면 promtool check rules/test rules를 사용한다.
2. 일회용 Grafana의 provisioning 결과/API와 mock 알림 수신으로 rule 평가를 확인한다. Grafana-managed rule은 promtool 통과만으로 검증 완료로 간주하지 않는다.
3. 1440/390px에서 정상·미수집·오류 dashboard, 단위·시간대·키보드 조작을 확인하고 git diff --check를 실행한다.
4. 이 phase의 index와 현재 step에 실제 결과·command·남은 결정·다음 step을 기록한다. 상세 공통 gate는 OBSERVABILITY_PLAN을 따른다.

## 하지 말 것

- 실제 수신처에 테스트 메시지를 보내지 말 것. 외부 알림은 승인된 운영 단계에서 수행한다.
- threshold 초과 즉시 반복 알림이나 missing series의 자동 정상 처리를 두지 말 것. 운영자가 믿을 수 있는 장애/복구 구분이 필요하다.
- 민감 본문·credential·내부 URL/IP를 metric/label/로그/알림/커밋에 넣지 말 것. 운영 데이터도 공개 저장소의 privacy 경계를 따른다.
- Discord 스타일과 레이더 전체 영역을 변경하지 말 것. 이번 phase는 비공개 운영 모니터링 범위다.
- OCI·DNS/TLS·운영 timer·실제 provider·외부 알림 전송을 실행하지 말 것. 현재 사용자 보류와 로컬 검증 범위를 유지한다.
