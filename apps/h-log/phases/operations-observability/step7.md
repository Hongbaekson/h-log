# Step 7: approved-production-rollout

## 개선 사항과 선행 조건

Steps 0–6 완료 후 진행하는 운영 적용 단계다. 현재 사용자 OCI 보류로 blocked이며 앞선 배포 승인을 재사용하지 않는다.

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
- `apps/h-log/phases/operations-observability/step6.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/phases/auto-publish-ops-hardening/step4.md`
- `apps/h-log/phases/terraform-infrastructure-adoption/index.json`
- `apps/h-log/compose.yaml`

## 작업

1. 로컬 검증 artifact·측정 자원·이미지 digest·변경할 서비스/포트/권한·secret 입력·rollback을 먼저 review 가능한 배포안으로 준비한다. 사용자의 OCI 재개와 이 배포 범위를 확인한 뒤에만 실행한다.
2. 실제 서버 여유 CPU/RAM/디스크와 기존 앱 영향, backup/restore 근거, dependency 보안 후속 조치와 image/architecture 호환성을 확인한다. 예산 부족이나 미해결 release gate가 있으면 배포하지 않는다.
3. private 접근 방식, 실제 public HTTPS origin, 비공개 알림 수신처와 독립 외부 uptime/heartbeat 감시를 확정한다. 새 클라우드 자원·DNS/TLS·유료 서비스가 필요하면 기존 Terraform/승인 경계에서 다룬다.
4. 모니터링 서비스만 점진 적용하고 비인가 접근 차단, 실제 수집·지속 기록·로그 회전과 기존 웹/DB 상태를 확인한다. 승인된 시험 알림 1회와 복구 통지를 확인한다.
5. 서버 외부에서 공개 HTTP와 모니터링 heartbeat 누락을 검사한다. production web/DB를 고의 중단하지 않고 전용 synthetic target/heartbeat fixture로 경보를 검증한다.
6. 운영 24시간 이상 관측 후 자원·collector/alert 상태·외부 감시와 rollback 근거를 기록한다. 발행 timer가 꺼진 상태도 올바르게 표시돼야 한다. 이후 auto-publish-ops-hardening Step 4에서 별도 승인으로 timer를 켤 때 enabled/활성화 시각/deadline을 연결한다.

## 인수 기준

모니터링과 외부 감시의 실제 운영 증거, 비공개 접근, 알림·복구 수신, 24시간 관측과 rollback 준비가 확인돼야 completed다. 입력/권한/승인/관측 시간이 미완료면 blocked 또는 pending 사유를 구체적으로 기록한다.

## 검증

1. 검증된 artifact에 대해 운영 config/readiness/scrape/public boundary/기존 서비스 smoke를 실행하고 민감값 없는 결과만 기록한다.
2. 사용자가 승인한 수신처의 시험 알림과 외부 HTTP/heartbeat 경보·복구를 확인한다. 메신저 전송은 해당 승인 범위에서만 수행한다.
3. 완료 시 phase와 auto-publish activation 선행 조건의 상태를 동기화하고 git diff --check를 실행한다.
4. 이 phase의 index와 현재 step에 실제 결과·command·남은 결정·다음 step을 기록한다. 상세 공통 gate는 OBSERVABILITY_PLAN을 따른다.

## 하지 말 것

- 이 step을 이유로 발행 timer·실제 provider 호출·공개 canary를 활성화하지 말 것. 자동 발행 재개는 별도 phase가 소유한다.
- 운영 서버 전체/DB 중단으로 외부 감시를 시험하지 말 것. synthetic 장애로 검증할 수 있다.
- 완료되지 않은 local step 또는 실제 수신처/외부 감시 검증을 생략하지 말 것. 운영 완료 근거가 필요하다.
- 민감 본문·credential·내부 URL/IP를 metric/label/로그/알림/커밋에 넣지 말 것. 운영 데이터도 공개 저장소의 privacy 경계를 따른다.
- Discord 스타일과 레이더 전체 영역을 변경하지 말 것. 이번 phase는 비공개 운영 모니터링 범위다.
