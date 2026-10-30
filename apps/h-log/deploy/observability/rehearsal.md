# 격리 장애 검증과 24시간 관측

이 절차는 개발 PC의 합성 데이터만 사용한다. 운영 적용 여부는 [Step 7](../../phases/operations-observability/step7.md)이 결정한다. Step 6은 단기 테스트와 24시간 관측, 최대 PDF 부하 및 관측 데이터 복구를 모두 검수한 뒤에만 완료한다.

## 자원과 실행

`hlog-observe-probes-local`은 새 DB와 전용 volume, 실제 exporter/collector/Prometheus/Grafana, HTTPS 응답 fixture, 내부 webhook mock을 소유한다. 기존 같은 project가 있으면 테스트는 중단한다. DB 중단 후 재기동을 위해 이 모드만 전용 `rehearsal_database` volume을 사용한다. 일반 probe smoke는 기존 tmpfs DB를 사용한다. `hlog-observe-alerts-local`은 위험한 디스크/TLS 등의 지표만 합성하는 별도 스택이다. 실제 개발 디스크를 채우거나 시계를 바꾸지 않는다.

앱 디렉터리에서 실행한다.

```powershell
$env:HLOG_OBSERVABILITY_PROBES_SMOKE = '1'
$env:HLOG_OBSERVABILITY_PUBLISHING_SMOKE = '1'
$env:HLOG_OBSERVABILITY_REHEARSAL = '1'
$env:HLOG_OBSERVABILITY_SOAK_START = '1'
npm run test:observability:probes
```

실패하면 자신이 만든 자원을 정리한다. 성공하면서 `SOAK_START=1`인 경우에만 자원을 남기고 `private/observe-step6/stack.json`에 project, 정확한 컨테이너 ID, Compose 인자와 외부 secret 파일 경로를 기록한다. 이 파일에는 비밀번호 값이 없으며 Git에서 제외한다. 플래그 이름의 `START`는 관측 준비 상태를 의미한다. 실제 관측은 아래 명령으로 별도 시작해야 한다.

```powershell
$env:HLOG_OBSERVABILITY_RECOVERY = '1'
npm run test:observability:recovery
npm run observability:soak run
# 다른 터미널 또는 다음 세션에서 확인
npm run observability:soak status
```

기본 1,441분 동안 60초 간격으로 관측하고 마지막에 이번 실행의 컨테이너만 중지한다. volume과 검수 자료는 남긴다. Windows에서 백그라운드로 실행할 때는 `Start-Process -WindowStyle Hidden`과 절대 작업 경로를 사용하고 stdout/stderr는 Git 제외 `private/observe-step6`에 둔다. PC와 Docker가 중단되면 연속 관측은 실패다. 시작 기록만으로 24시간 완료를 인정하지 않는다.

`run 2`처럼 1~1,441분을 지정할 수 있으나 24시간 미만은 반드시 `pending`이다. `run.lock`과 `samples.jsonl`의 배타적 생성으로 같은 관측에 이어 쓰기를 금지한다. 실패하거나 중단한 관측을 재시도하려면 기존 자료를 별도 보관하고 새 격리 스택을 준비한다. 이전 컨테이너 ID와 다른 자원을 같은 관측으로 합치지 않는다.

## 검증 구분

| 사례 | 입력과 기대 신호 | 검증 방식 |
| --- | --- | --- |
| 웹 중단 | 실제 HTTPS fixture 중지 → http-blog | 같은 probe 스택에서 실제 scrape, Grafana firing, mock 수신/중복 억제/해소 |
| DB 중단 | 전용 DB 중지 → database | 동일. 원래 데이터를 보존한 전용 volume으로 재기동 |
| exporter 중단 | postgres-exporter 중지 → scrape | DB 장애와 수집 장애를 별도로 판정 |
| 공급자 실패·예산 차단 | 실제 cycle에 fake 응답/예외 → autopublish-failure | cycle이 생성한 결과를 fixture summary에 연결. 외부 provider 호출 없음 |
| preflight 실패 | preflight 실패 summary → autopublish-failure | 알림 경로 검증. 실제 host hook 종료 코드는 기존 Linux state 테스트로 별도 검증 |
| 기존 summary 소실 | 실제 파일 제거 → source-autopublish | 과거 관측 이력과 실제 collector 읽기 실패를 사용 |
| 비용 근거 없음 | 실제 합성 source_fetch ledger의 null 근거 → unknown-cost | 경고를 확인한 뒤 외부 호출 없는 해당 fixture 1건에만 명시적인 0원 추정 근거를 넣어 해소. 운영 기록이나 unknown 판정은 변경하지 않음 |
| 조회 누락·오류 | datasource proxy의 빈 결과/503 | DatasourceNoData/Error 및 mock 해소 |
| Grafana 재생성 | 컨테이너 교체, volume 유지 | 실제 dashboard와 43개 rule 보존 |
| 디스크·TLS·lease·stale·첫 성공 없음·깨진 batch | 제한된 합성 지표 | 실제 PromQL/Grafana/mock. 저장소 손상이나 실제 시간 경과의 증거와 구분 |

장애 시험만 10초 평가·20초 지속·1초 첫 전송·10초 갱신·30초 재전송으로 가속한다. 실제 서비스 행은 firing/수신을 각 240초 이내, 합성 지표 행은 각 120초 이내에 확인하고 첫 수신 뒤 12초 동안 중복이 없는지 검사한다. 복구 후 새 resolved 수신을 확인한다. 각 행의 시간과 결과는 `failures.json` 또는 `synthetic-failures.json`에 남는다. 운영 지속 시간과 24시간 reminder의 실측으로 간주하지 않는다.

```powershell
$env:HLOG_OBSERVABILITY_ALERTS_SMOKE = '1'
$env:HLOG_OBSERVABILITY_MATRIX = '1'
npm run test:observability:alerts:smoke
$env:HLOG_OBSERVABILITY_RULES_TEST = '1'
npm run test:observability:alerts
$env:HLOG_OBSERVABILITY_STATE_TEST = '1'
npm run test:observability:state
$env:HLOG_OBSERVABILITY_BACKUP_SMOKE = '1'
npm run test:observability:backup
npm run test:observability:soak
```

마지막 backup 테스트는 실제 dump/복구·손상 archive·hash 불일치·이전 성공 보존을 확인한다. 알림 fixture의 `backup-failure`와 `restore-failure`만으로 실제 archive 검증을 대체하지 않는다.

## 관측 판정과 한계

장애 시험 뒤 scrape/evaluation 및 alert hold/reminder를 원래 설정으로 복구한다. 수신처만 외부 통신이 없는 mock을 유지한다. 일정 기대값은 비활성이다. 가짜 성공을 매일 쓰거나 실제 발행 timer를 켜지 않는다.

- `samples.jsonl`은 순서·UTC 시각·단조 증가 경과 시간을 함께 남긴다. 90초 초과 공백, 5초 초과 시계 차이, 수집 실패, 컨테이너 교체/재시작/OOM은 실패다. `oom`과 `identityChanged`는 매 표본에서 명시적인 `false`여야 하며, 누락·null·숫자·문자열을 정상으로 인정하지 않는다.
- 모니터링 7개 서비스 합산 메모리 1 GiB·CPU 1 core, 활성 series 5,000·업무 series 500, source age 180초·scrape 10초를 상한으로 검사한다. probe 실패나 예기치 않은 알림도 실패다.
- 메모리는 Docker stats의 cache 제외 사용량이다. CPU·메모리의 **표본 최대치**이며 표본 사이 순간 최대치를 보장하지 않는다. 테스트 DB·HTTPS/mock fixture와 앱/PDF 부하는 모니터링 1 GiB 예산에 섞지 않는다. 전체 host 여유와 앱 부하는 별도 확인한다.
- 디스크는 Prometheus WAL/head를 포함한 실제 `du`와 Grafana 자료에 로그 최대 할당 210 MiB·state/tmp 32 MiB를 더해 3 GiB와 비교한다. 로그 증가량은 구간 내 stdout/stderr의 byte 수이며 원문을 저장하지 않는다. 회전 파일의 실제 할당량은 아니므로 디스크 계산에는 고정 상한을 사용한다.
- 24시간 정상 관측은 정상 상태의 알림 노이즈를 측정한다. 24시간 reminder는 지속 장애를 별도로 유지해야 검증할 수 있다. 설정된 7일 retention이 실제 7일 보관을 입증하지 않는다.
- 수신이 늦어진 장애 시험의 resolved는 payload의 관측 시각으로 구분한다. 관측 시작 이후의 firing/resolved와 읽을 수 없는 시각만 노이즈로 센다. 마지막 sample이 90초 넘게 갱신되지 않은 미완료 관측은 `status`가 실패로 보고한다.
- 최대 20 × 5 MiB PDF 업로드/다운로드와 실제 공개 read path 부하는 기존 `test:resume:rehearsal`을 재사용한다. 그 실행이 관측 시간과 겹친 근거, 앱 RSS/tmpfs·DB/dump와 host 여유를 함께 검수해야 한다. HTTPS 응답 fixture를 실제 Next 페이지 성능으로 보고하지 않는다.

같은 host에서 최대 PDF 부하를 재현하려면 현재 소스로 `docker build --target runner -t hlog-web:observe-step6 .`를 실행하고, 스택이 정상인 동안 `HLOG_OBSERVABILITY_PDF_LOAD=1`로 `npm run test:observability:pdf`를 실행한다. 이 wrapper는 기존 전체 PDF rehearsal을 새 합성 DB·임시 인증서로 실행하고 약 3초 간격의 모니터링 표본 최대치·host 최소 가용 메모리를 `pdf-load.json`에 남긴다. 기존 PDF 테스트의 10ms RSS/tmpfs 측정·공개 철회·dump/restore·rollback 검증은 그대로 재사용한다. 부하용 앱/DB/프록시는 실행 후 정리한다.

## 종료와 정리

먼저 result와 마지막 sample을 확인한다. 과정이 멈췄는데 마지막 자료만 정상이라면 완료가 아니다. 실행 중 강제 종료한 경우도 실패로 기록한다. 결과 검수 전에 volume을 지우지 않는다.

최종 판정은 `npm run observability:soak status`로 원본 표본을 현재 검수 코드에서 다시 평가한다. 실행 중인 프로세스가 이전 코드로 작성한 `result.json`만 보고 완료 처리하지 않는다. `minimumDurationMs`는 필요한 24시간, `remainingMs`는 실제 관측이 더 필요한 시간(ms)이다. 실패나 수집 중단이면 남은 시간은 `null`이며 새 관측이 필요하다. 단순히 다음 날이 되었다고 남은 관측 시간을 줄이지 않는다. 검수 코드만 수정할 때에는 정상 관측 프로세스와 원본 기록을 유지한다.

정리할 때 `stack.json`의 project가 정확히 `hlog-observe-probes-local`이고 현재 project의 전체 컨테이너 ID 집합이 기록된 ID와 같은지 확인한다. 환경값은 descriptor의 파일 경로만 복원하고 기록된 Compose 인자로 `down --volumes --timeout 15`를 실행한다. 다른 project나 새로 추가된 자원이 있으면 정리하지 말고 먼저 소유 범위를 확인한다. 외부 scratch 경로는 현재 사용자 임시 디렉터리 아래 `hlog-observe-probes-*`로 해석되는 절대 경로인지 확인한 뒤 PowerShell `Remove-Item -LiteralPath`로 해당 디렉터리만 정리한다. Git 제외 검수 자료는 따로 보관할 수 있다.

## 설정 적용·비활성화·복구

1. **로컬 적용:** 명시적인 overlay 조합으로 `config --quiet`, promtool, 이 runbook의 격리 smoke를 통과시킨다. 생성기와 JSON의 일치도 확인한다. 운영 명령 실행은 Step 7 승인 뒤다.
2. **전송 비활성화:** 외부 수신처를 쓸 경우에도 두 알림 route에 `hlog-delivery-disabled`를 적용한다. 스택을 중지할 때는 volume을 보존한다. 중지는 복구 성공의 증거가 아니며 관측 공백을 남긴다.
3. **설정 rollback:** 이전에 검증한 코드·생성 JSON·이미지 digest를 한 세트로 복원해 새 격리 스택에서 검사한다. 새 이미지로 변경된 Grafana DB를 구버전 이미지에 그대로 붙이는 것을 rollback으로 간주하지 않는다.
4. **관측 자료 복구:** Prometheus/Grafana를 정상 중지하고 각 volume 및 외부 host 상태 파일을 별도로 백업한다. secret은 공개 artifact에 포함하지 않는다. 복원은 새 volume과 격리 project에서 한다. 시작 시각 이전의 고정 query timestamp, dashboard/rule 수, summary의 이전 성공 시각을 비교한 뒤 복구로 판정한다. 실행 증거가 없는 데이터 복구는 pending이다.
5. **이력 상실:** Prometheus의 최근 7일 이력을 잃으면 ‘처음부터 summary 없음’과 ‘과거 summary 소실’을 재구성할 수 없다. 이때 host 원본과 백업을 대조한다. 모르는 과거를 성공/정상으로 채우지 않는다.

Step 7에는 실제 HTTPS origin, private ingress 방식, 수신 채널과 payload/secret/egress, host hook/재부팅 검증, 독립 외부 감시의 주기·비용·수신처 결정이 필요하다. 모니터링 host 전체가 꺼지면 mock을 포함한 같은 host는 스스로 통지할 수 없다. 이 로컬 테스트로 외부 감시까지 검증했다고 표시하지 않는다.

`test:observability:recovery`는 보존한 격리 스택에서만 실행한다. 컨테이너 ID 집합을 대조한 뒤 두 서비스를 멈추고 tar archive를 만들어 **새 volume**에 복원한다. 복구 이전 시각의 Prometheus query 결과와 dashboard·43개 rule을 비교한 후에만 기존 테스트 volume과 임시 archive를 지운다. Grafana에는 provisioning으로 재생성되지 않는 검증용 dashboard도 미리 저장하고 복원 여부를 확인한 뒤 지운다. 검증에 실패하면 기존 volume 설정으로 돌아가고 실패를 반환한다. 새 ID는 `stack.json`, 결과는 `volume-recovery.json`에 기록한다. 이 절차는 호스트 재부팅이나 운영 Grafana 버전 다운그레이드 검증을 대체하지 않는다.
