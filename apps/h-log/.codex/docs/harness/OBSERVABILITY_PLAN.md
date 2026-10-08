# H-Log 운영 모니터링 계획

등록일: 2026-10-06. **계획 등록 상태이며 수집기·대시보드·알림은 아직 구현하지 않았다.** 실행 상태의 기준은 [phase registry](../../../phases/operations-observability/index.json)다.

## 목적과 현재 근거

사이트 접속 장애와 자동 발행 중단을 함께 감지한다. 정상 HTTP 응답만으로 DB·발행·백업까지 정상이라고 판단하지 않는다.

- `compose.yaml`에는 web의 `/` 응답과 PostgreSQL `pg_isready` healthcheck가 있다. Prometheus/Grafana 서비스는 없다.
- `publish_jobs`에는 상태·retry·완료 시각·lease가, `usage_events`에는 사용량·추정 비용이 저장된다. 원장을 재사용하고 별도 집계를 발행의 source of truth로 만들지 않는다.
- generation 실패 결과 일부는 one-shot stdout에만 남는다. `runAutoPublishCycle`의 `completed`는 worker가 idle로 종료한 결과여서 그 값만으로 공개 검증 성공을 단정하지 않는다.
- 백업·복구 runbook은 있지만 백업 스케줄과 지속적인 성공 신호가 구현됐다고 가정하지 않는다. 운영 서버의 현재 상태는 이번 계획 등록에서 조회하지 않았다.

## 실행 순서

| Step | 이름 | 완료 결과 |
| --- | --- | --- |
| [0](../../../phases/operations-observability/step0.md) | monitoring-contract-and-budget | 지표·권한·자원 예산·보관 기간·알림 조건 확정 |
| [1](../../../phases/operations-observability/step1.md) | private-metrics-stack | 격리 로컬 Prometheus/Grafana와 재현 가능한 구성 |
| [2](../../../phases/operations-observability/step2.md) | host-database-http-probes | Linux host·PostgreSQL·HTTP/TLS 상태 수집 |
| [3](../../../phases/operations-observability/step3.md) | durable-publishing-signals | 작업 누락·실패·정체·비용을 재시작 후에도 관측 |
| [4](../../../phases/operations-observability/step4.md) | backup-and-restore-signals | 백업과 복구 검증의 성공 시각을 구분해 수집 |
| [5](../../../phases/operations-observability/step5.md) | dashboards-and-alert-routing | 대시보드·알림·복구 통지·대응 절차를 코드로 재현 |
| [6](../../../phases/operations-observability/step6.md) | isolated-failure-rehearsal | 장애·누락·수집 중단·복구를 로컬에서 종합 검증 |
| [7](../../../phases/operations-observability/step7.md) | approved-production-rollout | 승인된 운영 설치와 서버 외부 감시 검증 |

Steps 0–6은 OCI 보류 중에도 로컬에서 순서대로 진행할 수 있다. Step 7은 기존 OCI 보류로 `blocked`다. 사용자 지시로 모니터링 작업을 선택하면 Step 0부터 한 번에 한 step을 실행한다. 이번 등록은 공개 경험 개선 순서를 바꾸지 않는다. 2026-10-08 navigation Step 0 완료에 따라 일반적인 다음 작업은 `blog-reading-navigation / Step 1: code-copy-and-language`다.

`auto-publish-ops-hardening / Step 4`의 반복 timer 활성화 전에 이 phase의 운영 검증을 완료한다. **모니터링 완료에 실제 반복 발행을 요구하지 않는다.** Step 7에서는 scheduler 비활성 상태와 로컬 누락 재현 결과를 검증하고, 이후 별도 승인된 timer 활성화 때 감시 기준 시각을 설정한다. 이 순서로 순환 의존을 피한다.

## 구성 결정과 범위

초기 구성은 Prometheus + Grafana/Grafana Alerting + Node Exporter + PostgreSQL Exporter + Blackbox Exporter다. 기존 Compose에 명시적으로 선택하는 모니터링 구성을 추가하고 기본 앱 기동은 유지한다. 후보 파일은 `compose.observability.yaml`과 `deploy/observability/`이며 실제 구현 시 확정한다.

- Prometheus가 수집·보관하고 Grafana가 시각화와 운영 알림을 소유한다. 별도 Alertmanager, Loki, Tempo, OpenTelemetry Collector, Pushgateway, cAdvisor는 초기 필수 구성에 넣지 않는다. 로그 검색·분산 추적·컨테이너별 자원 분석은 실제 진단 공백이 확인되면 별도 step으로 확장한다.
- 웹/DB와 분리된 모니터링 volume 및 최소 network 연결을 사용한다. Grafana는 localhost 바인딩 + SSH 터널을 기본안으로 두고 익명 접근을 끈다. Prometheus/exporter/metrics/probe endpoint는 공개 ingress에서 차단한다. 별도 공개 서브도메인은 필요하지 않다.
- 모니터링 DB 계정은 필요한 통계·집계만 조회하고 superuser나 쓰기 권한을 받지 않는다. Docker socket과 무제한 host mount를 추가하지 않는다. Node Exporter의 host 읽기 권한은 Linux 기준 최소 read-only 범위를 검증한다.
- Blackbox 대상은 운영자가 지정한 고정 allowlist다. 임의 URL 입력을 받는 public probe API는 만들지 않는다. 외부 HTTP 검사는 DB를 사용하는 `/blog`와 대표 정적 경로를 구분한다.
- 알림은 운영 전용 비공개 수신처를 사용한다. Discord를 우선 후보로 두되 수신 채널·webhook은 운영 적용 시 확정한다. 로컬에서는 mock receiver만 사용한다. 기존 발행 Discord job과 운영 알림은 결합하지 않는다.
- 같은 서버의 모니터링은 host 전체 장애 때 함께 멈춘다. Step 7에서 독립된 외부 HTTP 감시와 모니터링 heartbeat 감시를 연결한다. 서비스/비용/수신처는 그때 선택하고, 계정 생성이나 유료 계약을 미리 진행하지 않는다.

## 지표 계약 초안

아래 이름은 Step 0에서 확정할 계약 후보이며 현재 존재하는 metric이 아니다. Gauge·counter 의미, 단위, 원본 query, 마지막 수집 시각과 제한 시간을 함께 정의한다.

| 영역 | 최소 신호 | 원본과 주의점 |
| --- | --- | --- |
| 수집 자체 | `up`, 마지막 성공 scrape, collector 오류/데이터 시각 | 정상값·미수집·오류·오래된 값을 구분 |
| 서버 | CPU, 가용 메모리, filesystem 여유 용량/inode | Linux host 기준; Docker Desktop VM 수치를 OCI 측정으로 기록하지 않음 |
| PostgreSQL | 가용성, 연결 수/허용치, lock 대기 | 통계 권한 최소화; SQL 원문·사용자 식별자 수집 제외 |
| HTTP/TLS | `probe_success`, `probe_duration_seconds`, 인증서 만료 | synthetic latency이며 실제 방문자 p95·5xx 비율로 표시하지 않음 |
| 작업 | `hlog_publish_jobs{state,job_type}`, `hlog_publish_oldest_pending_age_seconds`, lease 만료 건수 | bounded aggregate query; 작업·글 ID와 오류 본문을 label에 넣지 않음 |
| 발행 주기 | `hlog_autopublish_last_attempt_timestamp_seconds`, `hlog_autopublish_last_success_timestamp_seconds`, 마지막 결과, scheduler 활성 상태/감시 시작 시각 | 프로세스 밖의 지속 기록 필요; auth preflight 실패·재시작·미실행도 포착 |
| 사용량 | UTC 일/월 비용·한도 비율, budget 차단 건수 | `usage_events` 재사용; unknown 비용은 0으로 대체하지 않고 included 구독 비용과 구분 |
| 백업/복구 | `hlog_backup_last_success_timestamp_seconds`, `hlog_restore_last_verified_timestamp_seconds`, 마지막 실행 결과 | dump 생성과 restore 검증은 별개; 성공 기록 없는 상태도 드러냄 |

단기 one-shot worker에 메모리 counter만 추가하거나 실행 중에만 `/metrics`를 여는 방식은 사용하지 않는다. 기존 DB 집계와 필요한 최소 지속 결과를 장기 실행 수집 경로에서 읽는다. Step 0에서 현재 DB로 입증할 수 없는 cycle 성공·preflight 실패에 한해 atomic summary file 또는 최소 DB 기록 중 하나를 선택한다. 제거된 범용 generation history를 복원하지 않는다. 발행 성공은 해당 실행의 required 공개 검증 완료로 판정하며 skipped/idle/중복 실행을 새 성공으로 기록하지 않는다.

## 자원·알림 초기 기준

다음은 **로컬 검증 시작값**이다. Step 0에서 예산을 확정하고 Step 6에서 실측한다. OCI 용량은 Step 7에서 다시 확인하며 부족하면 운영 적용을 보류하고 배치를 재검토한다.

- scrape/evaluation: 60초, scrape timeout: 10초 이내. 느린 DB query에는 더 짧은 timeout과 제한된 집계 범위를 둔다.
- Prometheus 보관: 7일, TSDB size retention 시작값 1 GiB. WAL·head·Grafana DB·컨테이너 로그는 이 제한 밖이므로 전체 디스크 예산을 별도로 둔다.
- 전체 모니터링 메모리 예산 시작값 1 GiB, 전체 디스크 예산 3 GiB. 서비스별 제한, 로그 rotation, 실제 peak와 기존 앱 영향까지 확인한다. 부족한 예산에 OOM을 숨기며 맞추지 않는다.

| 신호 | 초기 알림 조건 |
| --- | --- |
| HTTP 또는 DB 불가 | 2분 지속 시 critical |
| exporter/metrics 미수집·query 오류 | 3분 지속 시 warning; 서비스 장애와 별도 분류 |
| CPU / 메모리 | CPU 85% 초과 15분 / 가용 메모리 10% 미만 10분 |
| 디스크 | 여유 15% 미만 10분 warning, 5% 미만 5분 critical; inode도 확인 |
| TLS | 만료까지 14일 미만 warning, 3일 미만 critical |
| DB 연결 | 허용 연결 80% 초과 10분 warning |
| required 작업 실패 / 작업 정체 | 새 실패 감지 / 가장 오래된 대기 10분 초과가 5분 지속; 누적 과거 실패로 계속 재알림하지 않음 |
| 일일 발행 누락 | scheduler 활성 시 09:00 KST 예정 실행이 09:30까지 공개 검증 성공하지 않음; 최초 실행·활성화 날짜와 유지보수 처리 |
| 비용 | 기존 일/월 budget 80% 도달 warning, budget 차단 발생 시 별도 알림; 일/월 경계는 UTC |
| 백업 / 복구 검증 | 일일 백업 활성 후 26시간 무성공, 복구 검증 30일 경과 warning; 한 번도 성공하지 않은 경우 포함 |

지속 시간은 평가 주기를 포함해 검증한다. 정상·firing·resolved·No Data·Error·maintenance를 구분하고, 수집 중단으로 series가 사라지는 것을 복구로 통지하지 않는다. 알림에는 고정 서비스 별칭·심각도·관측 시각·runbook만 포함하고 콘텐츠·검색어·IP·credential을 넣지 않는다. 중복 그룹화·재알림 간격·복구 통지는 Step 5에서 명시한다.

## 공통 검증과 완료 기록

- 문서/JSON: JSON parse, phase/step 번호·상태·읽을 파일·상대 링크 검사, `git diff --check`.
- 구성: 선택한 이미지 digest와 공식 출처 기록, `docker compose ... config --quiet`, Prometheus `promtool check config`, 실제 기동·수집·재시작 검증. 명령의 정확한 파일명/인자는 해당 step 완료 기록에 남긴다.
- 코드: focused RED → GREEN 후 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`. DB/repository/worker/migration 변경은 격리 DB에서 `npm run test:integration`도 실행한다.
- 화면: Grafana dashboard를 1440/390px에서 확인하고 빈 데이터·오류·시간대·단위·키보드 조작을 점검한다.
- 알림: mock receiver로 firing/지속/중복 억제/resolved/No Data/Error/미실행을 검증한다. 실제 수신처 테스트는 Step 7에서 승인된 범위로만 실행한다.
- 한 step씩 결과·실제 command·다음 step·남은 결정을 기록한다. 로컬 성공을 운영 완료로 표시하지 않으며 Step 7까지 완료해야 phase를 completed로 바꾼다.

## 범위 밖과 보존 조건

공개 모니터링 대시보드, 방문자 행동 추적, 자동 복구/재발행, Kubernetes, 기존 UI·Discord theme·레이더 변경은 포함하지 않는다. 공개 글의 published-current/privacy/원문 hash와 기존 budget guard를 유지한다. 모니터링 실패가 발행 상태를 바꾸거나 추가 LLM 호출·retry를 발생시키지 않게 한다. OCI/DNS/TLS/운영 timer/실제 provider/알림 전송은 계획 등록만으로 허용되지 않는다.

## 공식 설계 근거

- [Prometheus 구조](https://prometheus.io/docs/introduction/overview/): 수집과 시각화 역할 분리.
- [Batch 계측 지침](https://prometheus.io/docs/practices/instrumentation/): 마지막 성공 시각을 관측하는 설계의 참고 기준.
- [Node Exporter](https://github.com/prometheus/node_exporter): host 접근과 textfile collector의 지원 범위는 구현 시 선택 버전으로 재확인.
- [Blackbox Exporter](https://github.com/prometheus/blackbox_exporter): HTTP/TLS probe.
- [Grafana alert provisioning](https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/), [missing data](https://grafana.com/docs/grafana/latest/alerting/guides/missing-data/): 재현 가능한 설정과 누락 상태 처리.
