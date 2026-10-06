# Step 0: monitoring-contract-and-budget

## 개선 사항과 선행 조건

운영 모니터링의 지표·권한·자원·성공 기준을 확정한다. 선행 조건은 계획 등록이며 OCI 접속 없이 시작한다. 문서만 변경한다.

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
- `apps/h-log/compose.yaml`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/deploy/systemd/hlog-auto-publish.service`
- `apps/h-log/deploy/systemd/hlog-auto-publish.timer`
- `apps/h-log/lib/blog-auto-publish-cycle.ts`
- `apps/h-log/lib/blog-auto-publish-runner.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-usage-ledger.ts`
- `apps/h-log/migrations/001_blog_core.sql`
- `apps/h-log/migrations/002_publish_job_leases.sql`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`

## 작업

1. OBSERVABILITY_PLAN의 지표 초안을 실제 migration/query/caller와 대조한다. 각 metric의 이름·단위·type·허용 label·원본·query timeout·수집 시각·누락 표현을 확정한다.
2. Cycle completed/worker idle/중복 skip과 required 공개 검증 성공을 구분한다. DB persistence 전 실패, ExecStartPre auth 실패, process kill·재부팅·미실행을 포착할 최소 지속 결과 방식을 하나 선택한다. 현재 DB로 입증 가능한 상태는 재사용한다.
3. Prometheus/Grafana/exporter의 네트워크·최소 권한·비공개 접근, collector의 DB read-only 권한, Linux host mount 범위를 정한다. 로컬 Docker Desktop VM과 OCI host 측정 범위를 구분한다.
4. 초기 scrape/retention/메모리·디스크 예산과 경고값을 검증 가능한 값으로 확정한다. TSDB size 제한 밖 WAL/head·Grafana DB·로그의 여유 공간도 포함한다.
5. 09:00 KST scheduler의 활성화 기준일·최초 실행 deadline·정비 중 억제와 UTC 비용 일/월 경계를 정한다. 외부 uptime/heartbeat 수신처는 운영 단계의 미결 입력으로 명시한다.
6. 단일 계획 문서와 필요한 ADR 설명을 갱신하고 후속 step의 예정 파일·검증 명령을 확정한다. 새 서비스나 패키지를 설치하지 않는다.

## 인수 기준

지표마다 실제 데이터 근거 또는 필요한 최소 추가 기록이 지정돼 있다. source 없음·never succeeded·stale·disabled의 의미가 분리되고, 권한/예산/선행 조건과 후속 구현 파일이 명확하다.

## 검증

1. JSON parser와 상대 링크·읽을 파일 존재 검사를 실행한다.
2. 실제 code/schema와 정의를 수동 대조하고 git diff --check를 실행한다. 설정/코드/OCI 변경이 없음을 확인한다.
3. 이 phase의 index와 현재 step에 실제 결과·command·남은 결정·다음 step을 기록한다. 상세 공통 gate는 OBSERVABILITY_PLAN을 따른다.

## 하지 말 것

- 실행되지 않은 수집/백업/scheduler를 현재 구현으로 기록하지 말 것. 잘못된 정상 신호를 설계할 수 있다.
- 운영 자원 조회나 cloud apply를 실행하지 말 것. OCI 보류 중인 문서 설계 step이다.
- 민감 본문·credential·내부 URL/IP를 metric/label/로그/알림/커밋에 넣지 말 것. 운영 데이터도 공개 저장소의 privacy 경계를 따른다.
- Discord 스타일과 레이더 전체 영역을 변경하지 말 것. 이번 phase는 비공개 운영 모니터링 범위다.
- OCI·DNS/TLS·운영 timer·실제 provider·외부 알림 전송을 실행하지 말 것. 현재 사용자 보류와 로컬 검증 범위를 유지한다.
