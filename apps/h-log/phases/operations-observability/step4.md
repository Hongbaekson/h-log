# Step 4: backup-and-restore-signals

## 개선 사항과 선행 조건

Steps 0–3 완료 후 백업 성공과 복구 검증 성공을 별도 지표로 연결한다. 운영 백업 schedule은 활성화하지 않는다.

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
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/operations-observability/step3.md`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/compose.yaml`
- `apps/h-log/scripts/blog-migrations.mjs`
- `apps/h-log/lib/blog-local-dry-run.integration.test.ts`
- `apps/h-log/package.json`

## 작업

1. 기존 backup/restore runbook의 실제 호출 경로를 확인하고 dump 완료·형식 검사 이후에만 backup success를 기록하는 최소 wrapper를 만든다. 아직 scheduler가 없다면 수동 호출 경로와 비활성 상태를 명시한다.
2. restore success는 격리 DB 복원, vector, migration version, content hash와 public smoke 검증을 모두 마친 뒤 기록한다. dump 생성만으로 restore 성공 시각을 갱신하지 않는다.
3. Step 3의 지속 결과/수집 방식을 재사용해 last attempt/result/success, enabled와 freshness를 내보낸다. 실패 때 이전 성공 시각은 보존하되 현재 실패를 숨기지 않는다. 기록은 atomic하게 갱신한다.
4. dump 파일·경로·credential은 metrics/알림에 포함하지 않는다. backup 주기·보관·복구 검증 주기와 미실행 경고를 runbook에 연결한다.

## 인수 기준

실제 격리 pgvector dump/restore의 성공이 별도로 수집된다. 깨진 dump, restore 실패, marker 없음·오래됨·기록 실패가 정상으로 표시되지 않는다. 운영 volume과 파일을 건드리지 않는다.

## 검증

1. 성공 기록 시점과 실패 시각 보존을 focused RED/GREEN으로 검증한다.
2. 임시 project의 synthetic DB를 dump/restore하고 고의 실패를 재현한다. 공개 콘텐츠 무결성과 dump 비노출을 확인한다.
3. 앱 코드 변경 시 npm run test/lint/typecheck/build 및 관련 DB integration gate, script만 변경 시 해당 script focused test·실제 dump/restore smoke를 실행한다. git diff --check를 실행한다.
4. 이 phase의 index와 현재 step에 실제 결과·command·남은 결정·다음 step을 기록한다. 상세 공통 gate는 OBSERVABILITY_PLAN을 따른다.

## 하지 말 것

- 운영 DB에 restore하거나 기존 backup을 삭제하지 말 것. 이번 step은 격리 검증이다.
- 파일 존재나 pg_dump exit 0만으로 복구 가능성을 표시하지 말 것. 백업과 복구 검증은 별개다.
- 민감 본문·credential·내부 URL/IP를 metric/label/로그/알림/커밋에 넣지 말 것. 운영 데이터도 공개 저장소의 privacy 경계를 따른다.
- Discord 스타일과 레이더 전체 영역을 변경하지 말 것. 이번 phase는 비공개 운영 모니터링 범위다.
- OCI·DNS/TLS·운영 timer·실제 provider·외부 알림 전송을 실행하지 말 것. 현재 사용자 보류와 로컬 검증 범위를 유지한다.
