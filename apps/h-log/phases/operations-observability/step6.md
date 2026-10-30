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

## Step 0 확정 계약 인계 — pending

모니터링 메모리 1 GiB/디스크 3 GiB와 별도 PDF 백업 3 GiB를 구분한다. 최대 합성 PDF 부하·실제 host hook/재부팅·24시간 soak와 series/수집 지연을 측정하고 예산 초과를 성공으로 표시하지 않는다. [지표·권한·자원·예정 파일과 명령](../../.codex/docs/harness/OBSERVABILITY_PLAN.md)을 기준으로 하며 이번 인계 기록은 구현 완료가 아니다.


## Step 5 구현 인계

선택형 alerts overlay·43개 Grafana-managed rule과 4영역 dashboard, 기본 전체 mute·safe webhook을 사용한다. `scripts/observability-alerts.test.mjs`는 실제 PromQL 경계를, `scripts/observability-alerts.smoke.mjs`는 내부 synthetic metric/mock에서 알림 상태와 수신을 검증한다. 시간 가속 테스트이므로 24시간 reminder/soak를 대신하지 않는다. 이번 Step에서 실제 collector/exporter·fake provider·최대 PDF 부하를 결합해 자원/누락/복구를 검수한다. Grafana raw 오류 로그는 비보관이며 private API와 source-health를 읽는다. 첫 summary 소실 판별은 7일 history에 의존하므로 Prometheus 이력 상실/복원과 장기 누락의 운영 한계도 기록한다. 테스트 preview 자원을 남겼다면 private descriptor의 project·경로를 확인하고 해당 자원만 정리한다.


## 2026-10-30 실행 기록 — 진행 중

2026-10-30 모니터링 Step 6 진행: 실제 probe/collector 스택의 장애·복구 알림 10건과 Grafana 재생성, 위험 지표 fixture 7건을 검증했다. 정상 중지한 Prometheus/Grafana archive를 새 volume에 복원해 과거 sample과 43개 rule을 확인했고, 최대 20 × 5 MiB PDF의 업로드·다운로드·dump/restore를 모니터링과 함께 검증했다. 24시간 연속 관측은 2026-10-30T01:42:17.001Z에 시작했으며 아직 완료가 아니다. 기본 관측 종료 예정은 2026-10-31 10:43 KST다. 단위 270 pass/26 DB skip, Linux state·실제 backup/restore·PromQL 4/4·soak 판정 4/4·추적 코드 lint/typecheck·Docker build 통과. 모니터링 completed 6·pending 1·blocked 1을 유지하며 다음은 **Step 6 관측 결과 검수**다. OCI·실제 provider·발행·timer·외부 전송은 실행하지 않았다.

- RED: 관측 판정 모듈 부재와 위험 지표 fixture 정상값을 먼저 실패로 확인했다. GREEN: 판정 4/4·실제 PromQL 4/4, 합성 Grafana matrix 1/1, 실제 probe 통합 1/1. Linux state 1/1(9개 내부 사례), 실제 backup/restore 1/1을 재검증했다.
- 비용 근거가 없는 합성 source_fetch 기록 때문에 정상 전환이 차단되는 것을 확인했다. unknown 경보를 약화하지 않고 해당 1건의 알려진 0원 추정 근거를 명시한 뒤 실제 해소를 확인했다. 운영 데이터나 비용 정책은 변경하지 않았다.
- 새 volume 복구: 고정 과거 timestamp query 일치, dashboard와 43개 rule 보존. 같은 volume의 단순 재시작과 구분한다.
- PDF: 원본 104857600 bytes, DB 증가 119324672 bytes, dump 122154897 bytes, 업로드 RSS 증가 최대 42356 KiB. 동시 모니터링 메모리 표본 최대 202.81 MiB·CPU 0.021 core, host 최소 가용 12.28 GiB. 상세 artifact는 Git 제외 private/observe-step6에 둔다.
- 전체 단위 테스트는 sandbox localhost/임시 파일 제약으로 2건 실패한 뒤 허용된 로컬 실행에서 270 pass/26 DB skip을 확인했다. 전체 lint는 이전 단계 Git 제외 private 파일 10건이 실패하므로 private/** 제외 검사와 변경 scripts 직접 lint를 사용했다. typecheck·현재 이미지 build 통과, production dependency audit 0. Build의 기존 tracing 경고와 개발 의존성 경고는 이번 수정 범위 밖이다.
- 24시간 관측: 2026-10-30T01:42:17.001Z 시작. 완료 예정 2026-10-31 10:43 KST. 짧은 초기 표본을 24시간 성공이나 7일 retention 검증으로 표시하지 않았다. 상태 명령은 마지막 sample이 90초 넘게 멈춘 미완료 실행을 실패로 보고한다.

### 다음 세션 판정

1. [runbook](../../deploy/observability/rehearsal.md)에 따라 관측 상태와 실제 종료 시각을 확인한다. 24시간 이상·공백 없음·예산 이내·알림 노이즈 없음·컨테이너 연속성이 모두 필요하다.
2. 실패·중단이면 원인을 확인하고 새 격리 관측으로 다시 시작한다. 기존 파일에 이어 붙이거나 시간을 소급하지 않는다.
3. 성공 근거를 검수한 뒤에만 Step 6을 completed로 변경하고 admin-operations-control Step 2로 진행한다. Step 7은 OCI 보류로 blocked다.
4. 검수 자료를 보관한 뒤 descriptor의 정확한 project/ID와 임시 경로를 대조해 테스트 자원만 정리한다.
