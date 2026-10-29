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

## Step 0 확정 계약 인계 — pending

단일 계약의 고정 labels·알림 임계/그룹/24시간 reminder와 freshness를 적용한다. Keep Last State만으로 오류를 숨기지 않고 NoData/Error 별도 경보와 신선한 복구 증거를 mock에서 확인한다. [지표·권한·자원·예정 파일과 명령](../../.codex/docs/harness/OBSERVABILITY_PLAN.md)을 기준으로 하며 이번 인계 기록은 구현 완료가 아니다.

## Step 4 구현 인계

`lib/observability-publishing.ts`의 batch deadline, `scripts/observability-state.py`의 task별 요약, collector의 db/autopublish/backup/restore/expectations source와 Prometheus allowlist를 사용한다. 실제 백업/격리 복구를 검증했지만 schedule은 disabled다. 성공 시각만으로 정상 처리하지 말고 현재 result·source 수집 성공/freshness·기대 상태를 함께 판단한다. 복구 summary가 없을 때 임의 성공/0초 age를 만들지 않는다. 재활성화·최대 24시간 정비·기존 지연 보존 계약과 기록 실패 시 업무 실행 보존은 그대로 유지한다. 이번 Step에서 dashboard·mock 알림을 구현하며 실제 외부 알림은 보내지 않는다.


## 완료 기록 — 2026-10-29

2026-10-29 모니터링 Step 5 완료: 선택형 Grafana 대시보드 4개 영역과 43개 규칙, 기본 전체 음소거·비공개 수신처 예제·안전한 알림 payload를 추가했다. 실제 PromQL 3/3, Grafana mock smoke와 기본 stack 회귀 검증, 1440/390px 정상·미수집·오류·키보드 검수 및 형식/lint 검사를 통과했다. 데이터 소실 중 장애 상태 유지와 정상 증거 이후 복구, KST 자정·정비 경계를 확인했다. 모니터링 completed 6·pending 1·blocked 1이며 다음은 **operations-observability Step 6: isolated-failure-rehearsal**이다. 24시간 soak·자원 peak와 최대 PDF 부하는 Step 6에 남겼다. 관리자 14·2·1과 OCI·실제 provider·발행·timer·외부 알림 보류는 유지한다.

- `HLOG_OBSERVABILITY_RULES_TEST=1 npm run test:observability:alerts`: 3/3. 설정 drift·고정 label/지속/기본 mute, 실제 43개 식과 TLS/누락/stale/첫 deadline/KST 자정·정비 경계를 검증했다. 자정의 미실행 false resolve를 먼저 실패로 확인한 뒤 수정했다.
- `HLOG_OBSERVABILITY_ALERTS_SMOKE=1 npm run test:observability:alerts:smoke`: 실제 Grafana 12.4.13 provisioning/API와 내부 mock으로 pending/firing·중복 억제/reminder·NoData/Error·개별 series 소실 보존·신선한 resolved·안전 payload·재생성을 확인했다. 기본 24시간 mute도 API로 확인했다.
- `HLOG_OBSERVABILITY_SMOKE=1 npm run test:observability:stack`: 기본 stack의 profile·인증·격리·재생성 보존 회귀를 통과했다.
- 1440/390px 정상·미수집·오류 화면, 단위/시간대·키보드 조작을 확인했다. Generated JSON/YAML parser와 focused ESLint, registry/link 검사, `git diff --check`를 실행했다. 앱/DB/worker production code 변경이 없어 전체 앱 build/DB integration은 재실행하지 않았다.
- Smoke 시간은 10초 평가·20초 지속·30초 reminder로 가속했다. 운영 24시간 reminder 실측이나 24시간 soak를 완료했다고 보지 않는다. 실제 provider/운영 secret/외부 수신/일정 활성화는 없다.

다음은 [Step 6](step6.md)이다. source 첫 관측 판별의 7일 history 한계, 모든 exporter/업무 장애 결합, 자원 peak·series·최대 PDF·24시간 soak와 rollback을 검수한다. 수신처/독립 외부 감시·OCI는 blocked Step 7에서만 결정한다.

최종 freshness 규칙은 source별 수집 오류/누락 3분과 마지막 수집 시각 180초 초과 즉시 경고를 분리했다. 180초/181초 경계와 업무 panel의 값 생략을 검증했다. 모든 28개 dashboard query도 실제 datasource에서 성공했고 disabled/정비 없음은 유효한 0 매핑으로 확인했다.
