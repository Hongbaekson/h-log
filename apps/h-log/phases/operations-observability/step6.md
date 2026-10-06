# Step 6: isolated-failure-rehearsal

## 개선 사항과 선행 조건

Steps 0–5 완료 후 동일 격리 스택에서 장애 감지부터 복구 통지까지 종합 검증한다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 이전 step이 만든 실제 설정·collector·test·runbook도 수정 전에 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `.codex/skills/tdd/SKILL.md` (실패 수정으로 code behavior가 바뀔 경우 적용)
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`
- `apps/h-log/phases/operations-observability/index.json`
- `apps/h-log/phases/operations-observability/step5.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/.codex/docs/local-blog-dry-run.md`
- `apps/h-log/package.json`

## 작업

1. 격리 자원 목록과 cleanup 범위를 먼저 확정하고 web 중단, DB 중단, exporter 중단, Prometheus query 오류, Grafana 재시작을 차례로 재현한다.
2. fake provider 실패, auth preflight 실패, 실행 누락/처음부터 성공 없음, stale summary, 만료 lease, budget 차단, 깨진 backup/restore와 전체 metrics 누락을 재현한다.
3. 디스크/TLS 경고는 제한된 fixture 또는 작은 전용 filesystem으로 검증한다. 실제 개발/운영 디스크를 채우거나 시스템 시간을 바꾸지 않는다.
4. 각 사례에 예상 신호·firing까지 허용 시간·mock 수신·중복 억제·복구 판정·누락 판정을 기록한다. 감시 스택 전체 중단은 동일 host가 스스로 통지할 수 없음을 확인하고 Step 7의 외부 감시 인수 기준으로 연결한다.
5. 24시간 이상 로컬 soak의 자원 peak/series 수/수집 지연·로그 증가와 알림 노이즈를 기록한다. 세션을 계속 대기할 필요는 없고 시작/종료 증거로 다음 세션에서 이어서 판정한다. 설정 retention과 실제 보관 검증 범위를 구분한다.
6. 운영 적용/비활성화/설정 rollback/관측 데이터 복구 runbook을 작성하고 Step 7에서 필요한 결정과 비공개 입력 목록을 정리한다.

## 인수 기준

모든 장애·복구·누락 사례와 자원 예산이 증거로 확인된다. 중단한 soak나 실패 case를 성공으로 간주하지 않는다. production readiness와 local-only 한계를 명시한다.

## 검증

1. 기존 step의 실제 validator와 장애 재현 명령을 한 runbook에 기록하고 결과를 확인한다.
2. 24시간 soak 결과와 peak/증가율을 Step 0 예산에 대조한다. 한계 초과 시 최소 수정 후 해당 검증만 반복한다.
3. git diff --check와 문서 링크 검사를 실행한다. 코드 수정이 필요하면 focused RED/GREEN 및 영향 범위 gate를 추가한다.
4. 이 phase의 index와 현재 step에 실제 결과·command·남은 결정·다음 step을 기록한다. 상세 공통 gate는 OBSERVABILITY_PLAN을 따른다.

## 하지 말 것

- 실제 OCI/외부 provider에 장애를 주입하지 말 것. 이번 범위는 로컬 readiness다.
- 명령을 실행했다는 이유만으로 알림 성공을 기록하지 말 것. rule 상태와 mock 수신/복구를 함께 확인해야 한다.
- 민감 본문·credential·내부 URL/IP를 metric/label/로그/알림/커밋에 넣지 말 것. 운영 데이터도 공개 저장소의 privacy 경계를 따른다.
- Discord 스타일과 레이더 전체 영역을 변경하지 말 것. 이번 phase는 비공개 운영 모니터링 범위다.
- OCI·DNS/TLS·운영 timer·실제 provider·외부 알림 전송을 실행하지 말 것. 현재 사용자 보류와 로컬 검증 범위를 유지한다.
