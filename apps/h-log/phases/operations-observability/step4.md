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

## Step 0 확정 계약 인계 — pending

공통 atomic summary와 별도 backup/restore 성공을 재사용한다. 첫 백업 26시간·첫 복구 검증 24시간/이후 30일, disabled/never/stale와 PDF 복구 epoch를 포함한다. [지표·권한·자원·예정 파일과 명령](../../.codex/docs/harness/OBSERVABILITY_PLAN.md)을 기준으로 하며 이번 인계 기록은 구현 완료가 아니다.

## Step 3 구현 인계

`compose.observability-publishing.yaml`, `lib/observability-publishing.ts`, `lib/observability-collector.ts`, `scripts/observability-state.py`, Linux state test와 `deploy/observability/README.md`를 먼저 확인한다. File source/atomic helper를 재사용하되 backup/restore의 성공 근거·일정은 이 Step에서 추가한다. 현재 helper는 autopublish 전용이며 backup/restore를 구현했다고 해석하지 않는다.

## 완료 — 2026-10-29

- `scripts/observability-backup.mjs`에 수동 backup/restore 명령을 구현했다. 백업은 외부 새 파일·binary stream·fsync·PGDMP/목록 검사 이후 성공이다. 복구는 명시적 label·기본 PGDATA tmpfs·loopback DB port가 일치하는 컨테이너의 새 DB만 허용한다. 기존 DB/volume에 복원하지 않는다.
- 정확한 migration 목록·vector 연산·전체 본문/PDF hash·PDF 정책을 검사하고 새 Next 서버에서 공개 글/Markdown 200·비공개 글 404, 새 PDF epoch의 GET/HEAD·조건부/Range 404와 감사 reset을 확인했다. 생성 DB/웹 프로세스 정리 후에만 복구 성공을 기록한다. 원본 PDF 공개 포인터 보존도 검사했다.
- Host helper/atomic evidence·collector에 backup/restore task를 추가했다. 현재 실패와 이전 성공 시각을 함께 유지하고 source missing/invalid/error·freshness와 disabled를 구분한다. 기대 상태 세 항목은 필수다. 첫 실행/재활성화/정비 후 deadline과 기존 지연 보존을 검증했다. 기록 실패가 정상 백업을 재시도하거나 실패로 바꾸지 않는다.
- TDD RED: task 인자 미지원·별도 evidence 파일 누락·deadline export/백업 모듈 부재를 확인했다. GREEN: Linux state 9개, Linux 파일/cycle 8개, publishing focused 5/5. 실제 파일 스트림 종료 시 FileHandle 참조 문제와 2 MiB 비압축 합성 데이터의 목록 검사 조기 종료(EPIPE/Windows EOF)를 재현·수정했다. 목록 명령의 exit 0일 때만 조기 입력 종료를 허용하며 실제 restore 오류는 그대로 실패다.
- 실제 `HLOG_OBSERVABILITY_BACKUP_SMOKE=1 npm run test:observability:backup` 1/1: 정상 복원, 덮어쓰기 거부, 깨진 dump, 변조 hash, 잘못된 복구 대상과 기록 실패를 재현했다. 실패 뒤 최근 성공 시각도 보존했다. 최신 build 재검증은 약 14초였다.
- `HLOG_OBSERVABILITY_PROBES_SMOKE=1 HLOG_OBSERVABILITY_PUBLISHING_SMOKE=1 HLOG_OBSERVABILITY_FULL_INTEGRATION=1 npm run test:observability:probes` 1/1, 약 244초: 전체 DB integration과 실제 backup→helper→collector→Prometheus, 재생성 후 성공 시각 보존, restore 미실행/disabled·DB/HTTP/수집기 장애·권한/비공개 경계를 확인했다.
- 기본 gate: `npm run test` 270 pass/26 DB 환경 skip, `npm run lint`, `npm run typecheck`, `npm run build` 통과. 기존 thumbnail 동적 파일 tracing 경고 2건은 그대로다. 문서/JSON/link/registry와 `git diff --check` 확인. UI 변경은 없다.
- Synthetic 임시 dump/credential·테스트 project/volume/새 DB는 정리했다. 보관 자동화·운영 DB/OCI/외부 provider/알림·timer 활성화는 하지 않았다. 강제 종료 잔여 자원·최대 용량/24시간 soak는 Step 6/7 검수 항목이다.

현재 5 completed / 2 pending / 1 blocked. 다음은 [Step 5: dashboards-and-alert-routing](step5.md)이며 관리자 14·2·1과 OCI 보류를 유지한다. 운영 절차는 [실행 runbook](../../deploy/observability/README.md#step-4-수동-백업복구-검증)을 따른다.
