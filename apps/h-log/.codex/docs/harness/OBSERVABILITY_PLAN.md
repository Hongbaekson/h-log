# H-Log 운영 모니터링 계획

등록일: 2026-10-06. **2026-10-26 Step 0의 지표·권한·자원 계약을 확정했다. 수집기·대시보드·알림은 아직 구현하지 않았다.** 실행 상태는 [phase registry](../../../phases/operations-observability/index.json)를 따른다. 이 문서가 모니터링 계약의 단일 기준이다.

## 목적과 실행 순서

사이트 접속 장애와 자동 발행 중단을 함께 감지한다. HTTP 200, 프로세스 종료 코드 0, worker idle을 발행 성공으로 표시하지 않는다.

| Step | 이름 | 완료 결과 |
| --- | --- | --- |
| [0](../../../phases/operations-observability/step0.md) | monitoring-contract-and-budget | 완료: 아래 계약과 구현 인계 확정 |
| [1](../../../phases/operations-observability/step1.md) | private-metrics-stack | 격리 로컬 Prometheus/Grafana와 재현 가능한 구성 |
| [2](../../../phases/operations-observability/step2.md) | host-database-http-probes | Linux host·PostgreSQL·HTTP/TLS 수집 |
| [3](../../../phases/operations-observability/step3.md) | durable-publishing-signals | 지속 실행 결과·발행/비용·누락 신호 |
| [4](../../../phases/operations-observability/step4.md) | backup-and-restore-signals | 백업과 복구 검증을 구분한 지속 신호 |
| [5](../../../phases/operations-observability/step5.md) | dashboards-and-alert-routing | 대시보드·알림·복구 통지·대응 절차 |
| [6](../../../phases/operations-observability/step6.md) | isolated-failure-rehearsal | 장애·수집 중단·재기동·자원 검증 |
| [7](../../../phases/operations-observability/step7.md) | approved-production-rollout | OCI 보류로 blocked: 승인된 운영 설치와 외부 감시 |

현재 1 completed / 6 pending / 1 blocked다. **일반 다음 작업은 [A2 Step 0: private-post-review](../../../phases/admin-blog-publishing/step0.md)**다. [통합 관리자 계획](ADMIN_CONSOLE_PLAN.md)의 A1/A4 → 모니터링 계약 → A2 Steps 0–3 → A3 Steps 0–1 → 모니터링 Steps 1–6 → A3 Steps 2–3 순서를 유지한다. 모니터링 트랙을 지정하면 이 phase의 Step 1부터 이어간다.

수집기·신호·대시보드·알림은 이 phase가 소유하고 관리자 화면은 그 결과를 소비한다. 승인된 모니터링 Step 7 → 관리자 rollout → 기존 auto-publish-ops-hardening Step 4의 timer 활성화 순서다. **모니터링 완료에 실제 반복 발행을 요구하지 않는다.** 비활성 scheduler와 로컬 누락 재현으로 먼저 검증하므로 순환 의존이 없다.

## 실제 코드·schema 대조

2026-10-26 로컬 소스 기준이며 운영 host는 조회하지 않았다.

| 근거 | 현재 상태 | 계약 반영 |
| --- | --- | --- |
| compose / Nginx | web `/`·DB pg_isready healthcheck만 존재. 모니터링 없음 | 선택형 구성, ingress metrics/probe 차단을 후속 구현 |
| auto-publish-cycle / CLI | worker idle이면 completed; 중복·budget 차단도 반환 | 종료 코드나 completed를 발행 성공으로 사용하지 않음 |
| content model / required adapter / persistent worker | required 6종 중 render/privacy는 공개 전, public_url/md_url/sitemap/content_version_match는 공개 후 검사 | 현재 버전의 6종 모두 존재하고 succeeded인지 확인. published만으로 성공 판정 금지 |
| migration 001 publish_verifications | 테이블은 있으나 실제 adapter/worker의 INSERT 없음. dry-run fixture만 기록 | 이 테이블 대신 실제 publish_jobs를 성공 근거로 재사용 |
| migrations 001–002 / worker | 최초 enqueue 시각 없음. started_at은 claim마다 변경, finished_at은 호출 시작 시각 runAt | Step 3에 최초 enqueued_at 추가. 기존 행 unknown, 실제 완료 시각은 별도 summary |
| usage ledger / Hermes provider | estimated_cost nullable. 포함 구독의 0은 저장되지만 비용 근거 구분은 유실 | Step 3에 nullable cost_basis 추가. unknown/included/알려진 금액 분리 |
| daily pipeline / systemd | 일부 budget 차단은 usage event 전 반환. auth는 ExecStartPre. DB 이전 실패·미실행 지속 신호 없음 | DB 독립 atomic summary 선택. 원장만으로 전체 차단 횟수를 표시하지 않음 |
| backup runbook / A4 Step 3 | 격리 dump/restore 실측은 있으나 정기 backup/restore 신호 없음 | 활성화·첫 성공을 따로 기록. 문서 작성일을 성공으로 사용하지 않음 |

## 구성과 접근 권한

선택형 `compose.observability.yaml`에 Prometheus, Grafana/Grafana Alerting, Node Exporter, PostgreSQL Exporter, Blackbox Exporter, H-Log collector를 둔다. Collector는 기존 Node/pg 런타임의 작은 별도 프로세스이며 공개 Next.js route가 아니다. 별도 Alertmanager/Loki/Tempo/OTel Collector/Pushgateway/cAdvisor는 추가하지 않는다.

- monitoring_net은 internal이다. Prometheus/Grafana/Node exporter는 이 망만, DB exporter/H-Log collector는 추가로 data_net만 연결한다. Blackbox는 고정 HTTP 대상 접근망을 추가한다. Nginx는 monitoring_net에 연결하지 않는다. Grafana의 외부 알림 egress는 Step 7에서 승인 수신처에 한해 연다.
- Grafana만 `127.0.0.1:3030:3000`을 기본값으로 publish하고 SSH 터널로 접속한다. 포트 충돌은 로컬 override로 기록한다. 익명 접근·가입·외부 공유를 끄고 Prometheus/exporter 포트는 publish하지 않는다. 공개/관리자 ingress 모두 metrics/probe를 제공하지 않는다.
- DB exporter LOGIN에는 CONNECT와 필요한 기본 통계 조회만 허용한다. 앱 테이블, pg_monitor, pg_read_all_stats, superuser, 쓰기·DDL 권한은 부여하지 않는다. pg_up와 stat_database의 연결 수만 수집 allowlist에 남기고 SQL 전문·사용자·client 주소·테이블별 통계는 제외한다.
- H-Log collector LOGIN은 별도로 두고 migration 소유자가 만든 monitoring schema의 고정 집계 view에만 USAGE/SELECT를 부여한다. PUBLIC에는 view 권한을 주지 않는다. View는 count/시각/금액만 반환하며 원문 테이블·PDF bytea·Brain·키에 대한 직접 SELECT와 쓰기를 거부해야 한다. 읽기 전용 transaction과 timeout도 적용한다.
- [PostgreSQL 통계 권한](https://www.postgresql.org/docs/16/monitoring-stats.html)과 exporter built-in collector를 사용한다. Deprecated custom query 기능에는 의존하지 않는다. 선택 버전의 옵션·출력·비특권 동작을 Step 2에서 검증하고 권한 부족을 superuser로 해결하지 않는다.
- Node Exporter는 Linux `/proc`, `/sys`, filesystem 통계용 root를 read-only로 연결한다. CPU/meminfo/filesystem만 enable하고 Docker socket·privileged·쓰기 mount는 금지한다. Root mount의 파일 읽기 가능성을 기록하고 비-root UID/cap-drop·host 파일 권한으로 제한한다. Docker Desktop 값은 Linux VM 수치이며 Windows host/OCI 실측이 아니다.
- Secret은 커밋하지 않는 파일로 주입한다. DSN·host/IP·오류 원문은 metrics/logs/알림에서 제외한다. Collector는 summary를 read-only로 받고 shell/systemctl/Docker 제어를 하지 않는다.
- Blackbox는 운영자가 지정한 home/blog 두 별칭의 `/`, `/blog`만 검사한다. 관리자·PDF·임의 URL·credential·사용자 입력을 제외하고 외부 redirect를 거부한다. Timeout은 5초다. HTTPS origin은 Step 7 입력이며 로컬에서는 격리 HTTP/TLS fixture를 쓴다.

## 지표 계약

아래는 **구현할 이름**이다. Gauge는 순간값/시각/구간 합계, counter는 누적값이다. 공통 job/instance label은 고정 별칭으로 바꾸고 실제 주소를 저장하지 않는다. 추가 label은 표의 목록뿐이다. ID/slug/URL/query/오류 문자열/provider·model 원문은 금지한다.

| 이름 | type·단위 / 추가 label | 원본·의미 |
| --- | --- | --- |
| `up` | gauge, 0/1 / 없음 | Prometheus scrape 결과. DB query/업무 성공과 별개 |
| `hlog_metrics_collection_success` | gauge, 0/1 / source | source=db,autopublish,backup,restore,expectations의 마지막 수집 성공 |
| `hlog_metrics_collected_timestamp_seconds` | gauge, Unix seconds / source | 마지막 유효 snapshot 수집 시각. 실패 시 갱신하지 않음 |
| `hlog_metrics_source_state` | gauge, one-hot / source,state | state=ready,missing,invalid,error. 파일 없음과 파싱/IO/DB 오류 구분 |
| `node_cpu_seconds_total` | counter, seconds / cpu,mode | Linux CPU 누적 시간. 5분 rate의 non-idle 비율로 사용률 계산 |
| `node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes` | gauge, bytes / 없음 | Linux meminfo |
| `node_filesystem_avail_bytes`, `node_filesystem_size_bytes`, `node_filesystem_files_free`, `node_filesystem_files` | gauge, bytes 또는 inode 수 / mountpoint | root/DB/monitoring 실제 fs allowlist. 같은 fs는 중복 집계하지 않고 device/fstype은 필터 후 제거 |
| `pg_up` | gauge, 0/1 / 없음 | DB exporter 연결/수집. exporter 자체 장애는 up으로 구분 |
| `pg_stat_database_numbackends` | gauge, connections / database | pg_stat_database. datid 제거, DB명은 별칭. 전체 연결 대비는 모든 DB 합계 |
| `hlog_db_max_connections`, `hlog_db_waiting_locks` | gauge, connections/locks / 없음 | 고정 view: current_setting('max_connections'), pg_locks NOT granted count |
| `probe_success`, `probe_duration_seconds`, `probe_ssl_earliest_cert_expiry` | gauge, 0/1·seconds·Unix seconds / target | target=home,blog. expiry는 HTTPS만. Synthetic 지연이며 방문자 p95/5xx 비율이 아님 |
| `hlog_publish_jobs` | gauge, jobs / state,job_type,importance | Q1. live enum 5상태·15종·required/retryable, 현재 버전만 |
| `hlog_publish_oldest_pending_age_seconds`, `hlog_publish_pending_age_unknown_jobs` | gauge, seconds/jobs / importance | Q1. queued/retrying의 최초 enqueued_at. 기존 시각 미상을 0초로 대체하지 않음 |
| `hlog_publish_expired_leases` | gauge, jobs / importance | Q1. running이고 lease_expires_at이 DB 현재 시각보다 과거 |
| `hlog_autopublish_last_attempt_timestamp_seconds`, `hlog_autopublish_last_success_timestamp_seconds`, `hlog_autopublish_last_success_slot_timestamp_seconds`, `hlog_autopublish_last_budget_block_timestamp_seconds` | gauge, Unix seconds / 없음 | 유효한 autopublish summary. success는 아래 증거와 실제 완료 시각; slot은 09:00 KST 예정 시각 |
| `hlog_batch_last_attempt_timestamp_seconds`, `hlog_batch_last_success_timestamp_seconds` | gauge, Unix seconds / task | task=backup,restore의 summary. restore 성공은 복구 검증 완료 |
| `hlog_batch_result` | gauge, one-hot / task,result | task=autopublish,backup,restore. result=never,running,succeeded,failed,skipped,budget_blocked,interrupted,unverified |
| `hlog_schedule_expected_enabled`, `hlog_schedule_enabled_timestamp_seconds`, `hlog_schedule_deadline_timestamp_seconds`, `hlog_schedule_maintenance_until_timestamp_seconds` | gauge, 0/1 또는 Unix seconds / task | expectation과 일정 계산. 실제 systemd active를 추측하지 않음 |
| `hlog_usage_known_cost_usd`, `hlog_usage_unknown_events`, `hlog_usage_included_events` | gauge, USD/events / window | Q2. window=day,month(UTC). known 합계는 알려진 금액의 하한, 구독료 총액이 아님 |
| `hlog_usage_budget_usd`, `hlog_usage_budget_ratio` | gauge, USD/ratio / window | 기존 budget과 known 합계. 양수 유한 한도만 ratio 계산 |
| `hlog_usage_budget_state` | gauge, one-hot / window,state | 기존 parser 기준 limited,zero,unlimited,invalid. 0은 유효한 차단 정책, 미설정은 unlimited |

### 조회·수집·누락 규칙

- Scrape/evaluation 60초, scrape timeout 10초. DB 연결 2초, statement 3초, transaction 전체 5초, collector 전체 8초 상한이다. Collector/DB exporter pool은 각각 2개 이하. 실패를 즉시 반복하지 않는다.
- Q1은 posts와 publish_jobs를 post_id/current_version_id로 연결한 SQL 집계다. 상태별 수는 현재 버전 전체, pending/lease는 처리 가능한 publishing/verifying/published만 집계한다. Obsolete version은 제외한다. Pending이 없음이 확인되면 age=0, 모두 시각 미상이면 age 생략+unknown count, 일부만 알면 알려진 최댓값+unknown count다.
- Q2는 usage_events.created_at이 UTC 월 시작 이상·수집 시각 이하인 금액·unknown/included 건수를 집계하고 day 조건을 함께 적용한다. 기존 guard의 UTC 경계와 budget 설정을 재사용한다. Token/provider label은 추가하지 않는다.
- Known cost는 근거 분류와 별개로 NULL이 아닌 estimated_cost를 합산해 기존 guard와 일치시킨다. 근거 미상은 별도 unknown count에도 포함하므로 known/unknown은 상호 배타적 건수 지표가 아니다. 금액 NULL은 합계에 넣지 않는다. 유효한 0 한도는 budget_usd=0·ratio 생략·zero 표시, 미설정 무제한은 금액/ratio 생략·unlimited 표시다. 무효 설정만 invalid 경고이며 임의 기본 한도로 바꾸지 않는다.
- 집계 결과 row 수는 enum으로 제한하지만 조회 대상 전체 row 수까지 제한됐다고 주장하지 않는다. Step 3에서 규모 fixture의 EXPLAIN과 timeout을 확인한다. usage_events(created_at) 인덱스를 추가하고 Q1 인덱스는 기존 실행 계획을 보고 필요한 것만 추가한다. 임의 LIMIT으로 합계 원본을 잘라내지 않는다.
- 신규 publish_jobs.enqueued_at은 enqueue 때 한 번 기록하고 retry/claim에서 유지한다. 기존 행을 post.created_at/started_at으로 소급하지 않는다. Nullable usage_events.cost_basis는 estimated/included/unknown을 허용하고 provider의 명시적 근거를 보존한다. 기존 0/NULL을 included로 추정하지 않는다. 금액 NULL 또는 근거 미상은 unknown으로 표시하며 기존 budget guard 동작은 바꾸지 않는다.
- Source별 snapshot을 원자적으로 교체한다. 정상적인 빈 집계만 0이다. DB 실패 시 마지막 snapshot을 최대 180초 보관하되 성공 flag=0·원래 수집 시각을 유지하고 이후 업무 series를 생략한다. Dashboard/alert는 freshness를 함께 검사한다. 180초 초과는 stale, 수집하지 못한 source는 missing/error다.
- 유효한 expectation의 enabled=false만 disabled다. 파일 누락/손상은 disabled가 아니다. 유효한 활성화 기록만 있고 summary가 없으면 never attempted, 유효한 summary에 성공이 없으면 last_success=0이다. 읽기 실패에서 가짜 0을 만들지 않는다. 신선한 수집과 오래된 batch 성공은 별개다.
- 아직 활성화하지 않은 batch의 summary 없음은 N/A, 첫 실행 전 없음은 해당 첫 deadline으로 판단한다. 이를 일반 source 누락 3분 경보에 넣지 않는다. 한 번 읽었던 summary의 소실·손상/IO 실패는 별도 수집 경보다. DB/exporter/expectation 누락 경보는 batch 비활성화로 억제하지 않는다.
- Timestamp는 UTC epoch seconds, 발행 slot은 Asia/Seoul이다. 60초 넘는 미래 실행/수집 시각이나 완료가 시작보다 이른 기록은 invalid다(미래 deadline/정비 예약 제외). 파일당 32 KiB 이하. Timestamp는 sample timestamp가 아닌 gauge 값으로 전달한다.

## 지속 실행 결과와 일정

**작업별 atomic JSON summary**를 선택한다. 새 범용 실행 이력 테이블이나 Pushgateway는 만들지 않는다. DB job/usage를 재사용하며 summary는 발행 상태의 source of truth가 아니다.

- Host 전용 state 디렉터리에 autopublish/backup/restore summary와 expectation을 둔다. 디렉터리 0750·파일 0640, 비특권 writer와 read-only collector만 접근한다. Host Python 3 표준 라이브러리 helper가 시작/종료를 기록한다. Step 3에서 설치 여부를 확인하며 pip 패키지는 추가하지 않는다. Docker·DB가 없어도 실패 기록이 가능해야 한다.
- Summary는 schema_version, 내부 invocation ID, 시작/완료 시각, 고정 result/stage, 마지막 성공/slot/budget 차단 시각만 저장한다. ID는 중복 방지에만 쓰고 metric/알림에는 넣지 않는다. 잠금·임시 파일 fsync·같은 filesystem atomic replace·directory fsync를 적용한다. 늦은 이전 invocation은 새 실행을 덮어쓰지 않는다.
- **첫 ExecStartPre**가 시작을 기록한 뒤 auth preflight를 실행한다. ExecStopPost가 SERVICE_RESULT/EXIT_CODE/EXIT_STATUS를 고정 분류로 변환한다. [systemd 계약](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)에 따라 preflight 실패도 다룬다. 전원 차단은 hook을 보장하지 않으므로 미완료 running과 deadline으로 탐지한다.
- Cycle은 별도 제한된 evidence 파일에 같은 invocation의 성공/실패 증거를 쓴다. Host helper가 유일한 summary writer다. 종료 코드 0만으로 성공 처리하지 않고 증거/기록 실패는 unverified 또는 기록 오류로 남기며 last_success를 보존한다. 수동 실행도 wrapper를 사용하되 scheduled/manual을 구분한다.
- 관측 hook의 쓰기 실패는 기존 auth/cycle 실행이나 종료 코드를 바꾸지 않는 best-effort 경로로 구현한다. 원문 없는 고정 오류를 journal에 남기고 다음 수집의 미완료/누락 deadline으로도 드러낸다. 파일 쓰기 자체가 실패한 상황을 즉시 durable하게 기록했다고 주장하지 않는다. 시작/종료 hook 실패 때문에 systemd가 발행을 재시도해서는 안 된다.
- **성공 증거**는 이번 invocation이 새로 생성·발행한 post/version의 published/current_version 일치와 required 6종 모두의 존재+succeeded다. 실패 행이 없다는 조건만으로 통과시키지 않는다. Adapter의 hash·공개 URL/Markdown/sitemap 검증을 재사용하고 transaction snapshot에서 확인한다. 실제 확인 완료 시각을 저장하며 job.finished_at을 복사하지 않는다. 후속 철회는 별도 현재 상태로 보고 과거 성공을 지우지 않는다.
- 중복 skip·idle·budget 차단·초안 생성은 last_success/slot을 갱신하지 않는다. 같은 slot의 기존 입증된 성공은 보존한다. 관측 실패가 공개 상태를 바꾸거나 발행 retry/LLM 재호출을 발생시키지 않게 한다. DB 이전 실패·auth·required 실패·kill·미실행·정상을 각각 검증한다.
- 원장만으로 전체 budget 차단 횟수를 보장할 수 없어 초안의 차단 건수 대신 마지막 차단 시각과 result를 채택한다. Summary는 전체 실패 이력/감사의 대체물이 아니다.
- 백업 성공은 dump 종료·파일 존재/크기·검사 완료 뒤, 복구 성공은 격리 restore와 migration/hash/public-private·PDF 복구 epoch 검증 뒤에 기록한다. 민감 상세 보고서는 private 위치에만 보관한다.

Expectation은 task별 enabled/enabled_at/유한 maintenance 구간이다. 변경은 해당 운영 작업의 승인·실제 설정과 함께 수행하고 collector가 활성화하지 않는다. expected_enabled는 운영자가 기대하는 일정이다. 실제 timer가 중지됐다고 기대값을 OFF로 바꾸지 않아 미실행을 감지한다.

- 자동 발행의 첫 slot은 enabled_at 이상인 첫 09:00 KST, deadline은 09:30이다. 08:59 활성화는 당일, 09:10은 다음 날이다. 해당 예정 slot의 공개 검증 성공을 요구하며 canary/수동 실행은 대체하지 않는다.
- Persistent=true 재부팅 보정 실행은 가장 최근 도래한 기대 slot만 충족할 수 있다. 밀린 날짜별 LLM 호출은 추가하지 않는다. 기한 초과 경보는 늦은 검증 성공 때 복구한다. Running이 기존 TimeoutStartSec 30분을 넘기면 정체로 표시한다.
- 백업은 활성화 후 첫 성공까지 26시간, 이후 last_success+26시간. 복구 검증은 활성화 후 24시간 이내 첫 검증, 이후 30일이다. 과거 실측/배포 시각을 성공으로 채우지 않는다. Disabled는 성공 지연 알림만 억제하고 별도 표시한다.
- 정비는 최대 24시간의 명시적 구간이다. 원본 신호를 유지하고 기간 중 도래한 일정의 알림만 억제한다. 발행은 종료 후 첫 09:00 slot, 백업/복구는 종료 후 각각 26시간/24시간 내 성공을 요구한다. 정비 전 실패를 자동 해소하거나 정비를 성공 처리하지 않는다.
- 비용 일/월은 UTC 00:00/월 1일 00:00 경계다. KST 발행일과 혼동하지 않으며 첫 활성화·비활성화·정비·재부팅·UTC 전환을 clock 고정 테스트로 검증한다.

## 자원 예산

**로컬 구현·검증 상한**이며 OCI 수용 가능 여부의 확인 결과가 아니다. Step 6 실측과 Step 7의 승인된 host 검증을 통과해야 한다.

| 서비스 | 메모리 limit | CPU limit |
| --- | ---: | ---: |
| Prometheus | 384 MiB | 0.35 vCPU |
| Grafana | 320 MiB | 0.25 vCPU |
| Node / PostgreSQL / Blackbox exporter | 각각 64 MiB | 각각 0.05 vCPU |
| H-Log collector | 128 MiB | 0.25 vCPU |
| 합계 | **1,024 MiB** | **1.00 vCPU** |

- 모니터링 디스크 **3,072 MiB**: Prometheus 2,048(보관 1,024 + WAL/head/compaction 여유 1,024), Grafana 512, 로그 180(6개 × 10 MiB × 3개), state/임시 32, 추가 여유 300. Volume 예산 표기는 hard quota가 아니므로 실사용을 감시한다.
- Retention은 7d와 1GB 중 먼저 도래하는 조건이다. [공식 storage 설명](https://prometheus.io/docs/prometheus/latest/storage/)상 WAL/head도 size 계산에 포함되나 삭제 대상은 persistent block뿐이다. 삭제·compaction도 즉시 끝나지 않으므로 retention.size를 전체 디스크 상한으로 보지 않는다. 이전 초안의 “WAL/head는 size 계산 밖” 설명을 수정했다. 선택 버전의 size 단위/bytes를 확인해 1,024 MiB 이하로 설정한다.
- 전체 active series 5,000 이하, 업무 series 500 이하를 목표로 한다. Job별 sample_limit 최대 2,000, label_limit 10, label 값 128자, scrape body 1 MiB. 초과를 일부만 정상 수집한 것으로 숨기지 않는다. CPU/fs/DB 수에 따른 실제 series와 오류를 Step 6에서 검증한다.
- [A4 실측](../../../phases/admin-resume-pdf/step3.md): 합성 원본 100 MiB, DB 증가 113.80 MiB, dump 116.49 MiB, dump/restore 6,544/2,888 ms, 단일 업로드 web RSS 299.50 MiB, 동시 다운로드 최대 367.13 MiB. PDF 임시 공간은 별도 32 MiB tmpfs다. 전체 운영 peak로 일반화하지 않는다.
- PDF의 기존 **3 GiB 백업/복구 예산은 모니터링 3 GiB와 별도**다. 앱/DB/WAL/OS·검사 프로세스 여유도 필요하다. Step 6은 최대 PDF 자료·기존 읽기 경로를 함께 확인한다. OOM/재시작/디스크 초과/앱 지연은 예산·배치를 재검토하고 재검증한다.

## 알림과 대시보드

60초 평가이므로 아래 지속 조건 이후 통지는 최대 한 평가 주기와 group_wait가 추가로 걸릴 수 있다.

| 신호 | 조건·심각도 |
| --- | --- |
| HTTP / DB 불가 | 유효 probe_success 또는 pg_up=0 2분, critical |
| 수집 실패·missing·invalid·stale | up=0/source 오류 3분 또는 수집 시각 180초 초과, warning |
| CPU / 메모리 | CPU >85% 15분 / MemAvailable <10% 10분, warning |
| filesystem / inode | 가용 <15% 10분 warning, <5% 5분 critical |
| TLS | 유효 HTTPS 인증서 <14일 warning, <3일 critical. HTTP fixture의 expiry 부재는 N/A |
| DB 연결 / lock | 전체 DB 연결/max_connections >80% 10분; waiting_locks >0 5분, warning |
| required 실패 / pending | 현재 버전 required failed >0 1분; known oldest >10분이 5분 지속, warning. unknown age는 별도 데이터 경고 |
| batch / 일정 누락 | 새 failed/interrupted/unverified 또는 enabled deadline 초과, warning. Running 30분 초과 포함 |
| 비용 | day/month known budget_ratio >=0.8 1분; 새 budget 차단 경고. unknown>0은 비용 불명 경고 |
| 백업 / 복구 | enabled task의 첫/후속 deadline 초과, warning. 성공 이력 없음 포함 |

- 고정 service/rule/severity로 그룹화하며 group_wait 30초, group_interval 5분, repeat_interval 24시간이다. 작업 ID별 알림을 만들지 않는다. 지속 실패의 24시간 reminder는 허용하되 새 실패로 꾸미지 않는다.
- 정상/실패/미실행/disabled/No Data/Error/stale/maintenance와 UTC 비용·KST 일정을 표시한다. [Grafana No Data/Error](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/nodata-and-error-states/)를 Normal로 취급하지 않는다. 업무 rule은 Keep Last State와 별도 source-health 경보를 함께 사용한다. 고정 label의 누락과 missing-series eviction을 시험하고 **신선한 정상 증거가 있어야** 서비스 resolved 통지를 보낸다.
- 알림은 고정 서비스 별칭·심각도·관측 시각·runbook만 포함한다. SQL/URL/IP/콘텐츠/검색어/token은 제외한다. 기존 발행 Discord job과 분리하고 로컬은 mock receiver만 사용한다.
- Host 전체 장애는 같은 host의 Grafana로 알릴 수 없다. Step 7에서 독립 외부 HTTP+모니터링 heartbeat의 서비스·수신처·간격·비용을 확정한다. 현재 입력 미정이며 계정 생성/유료 계약/전송은 하지 않는다.

## 후속 구현 파일과 검증 인계

아래 신규 파일·명령은 **예정이며 아직 구현/실행 결과가 아니다.** 경로는 앱 기준이다. Migration 번호는 선행 A2/A3 작업 이후 다음 빈 번호로 할당한다.

| Step | 예정 파일 / 재사용 파일 | 완료 검증 |
| --- | --- | --- |
| 1 | `compose.observability.yaml`, `deploy/observability/prometheus.yml`, `deploy/observability/grafana/provisioning/datasources/prometheus.yml`, `deploy/observability/README.md` | 기본/선택형 config·promtool·self scrape·datasource·접근/재기동 |
| 2 | `deploy/observability/blackbox.yml`, `deploy/observability/database-roles.sql`, `lib/observability-collector.ts`, `scripts/observability-collector.mjs`, `lib/observability-collector.test.ts` | 비특권 SQL·권한 거부·timeout RED/GREEN·실제 host/DB/고정 HTTP·TLS scrape |
| 3 | `lib/observability-publishing.ts`, `lib/observability-publishing.test.ts`, `lib/observability-publishing.integration.test.ts`, `scripts/observability-state.py`, `scripts/observability_state_test.py`; 기존 cycle/service/usage/repository·신규 migration | 6종 proof·빈 job·이전 버전·preflight/DB 이전 실패·kill·slot/UTC·비용 unknown·atomic 파일·재시작 |
| 4 | `scripts/observability-backup.mjs`, `scripts/observability-backup.test.mjs`; 기존 backup runbook/PDF rehearsal·공통 state helper | 격리 dump/restore·hash/private·실패/never/stale·첫 deadline |
| 5 | `deploy/observability/grafana/provisioning/dashboards/hlog.yml`, `deploy/observability/grafana/dashboards/hlog.json`, `deploy/observability/grafana/provisioning/alerting/hlog.yml`; 위 README | 1440/390px·빈/오류·mock firing/group/repeat/resolved/NoData/Error/maintenance |
| 6 | `scripts/observability-rehearsal.mjs`; 위 README·각 완료 기록 | 최소 24시간 격리 soak·DB/서비스 중단·host 재부팅·미실행·PDF 부하·자원 peak·복구 |
| 7 | 위 구성·runbook·운영 적용 기록 | 승인된 host 예산·비공개 접근·외부 HTTP/heartbeat·rollback; timer OFF |

예정 명령(앱 디렉터리, Git 제외 로컬 env 사용):

```bash
docker compose -p hlog-observe-local -f compose.yaml config --quiet
docker compose -p hlog-observe-local -f compose.yaml -f compose.observability.yaml --profile observability config --quiet
docker compose -p hlog-observe-local -f compose.yaml -f compose.observability.yaml --profile observability run --rm --no-deps --entrypoint promtool prometheus check config /etc/prometheus/prometheus.yml
node --no-warnings --experimental-strip-types --test lib/observability-collector.test.ts
node --no-warnings --experimental-strip-types --test lib/observability-publishing.test.ts
node --no-warnings --experimental-strip-types --test lib/observability-publishing.integration.test.ts
python3 -m unittest discover -s scripts -p observability_state_test.py
node --test scripts/observability-backup.test.mjs
node --no-warnings --experimental-strip-types scripts/observability-rehearsal.mjs
```

DB 테스트에는 격리 DATABASE_URL이 필수다. Host helper/systemd hook·재부팅은 격리 Linux에서 실제 재현하고 Docker Desktop만으로 통과했다고 하지 않는다. 이미지 공식 출처·version/digest/CPU architecture와 실제 명령을 해당 step에 기록한다. Production code는 focused RED→GREEN 후 npm run test/lint/typecheck/build, DB/worker/migration 변경은 전체 격리 npm run test:integration을 추가한다. 문서/JSON만 바꾼 Step 0은 파서·링크·읽을 파일·registry 상태와 git diff --check로 검증한다.

## 범위 밖과 남은 운영 입력

공개 대시보드·방문자 추적·자동 복구/재발행·Kubernetes·기존 UI/Discord theme/레이더 변경은 제외한다. Monitoring 실패는 공개 상태나 budget guard를 바꾸지 않는다. 운영 host 자원·HTTPS origin·비공개 알림 수신처·독립 외부 감시 서비스/비용은 Step 7에서 확정한다. OCI/DNS/TLS/운영 migration·timer/실제 provider/외부 전송/실제 PDF 공개는 이번 계약에 포함하지 않는다.

공식 근거: [Prometheus batch 계측](https://prometheus.io/docs/practices/instrumentation/), [Node Exporter](https://github.com/prometheus/node_exporter), [PostgreSQL Exporter](https://github.com/prometheus-community/postgres_exporter), [Blackbox Exporter](https://github.com/prometheus/blackbox_exporter). 지원 옵션과 이미지 digest는 해당 구현 step에서 다시 확인한다.
