# 비공개 모니터링 로컬 실행

`operations-observability / Steps 1–3` 구성이다. 기본 파일은 Prometheus/Grafana, probes overlay는 host/DB/HTTP/TLS, publishing overlay는 작업·비용·실행 기록을 수집한다. 백업·복구 신호, 대시보드와 알림은 후속 step이다. OCI 적용이나 timer 활성화 절차가 아니다.

## 고정 이미지

2026-10-28 공식 배포 정보와 `docker buildx imagetools inspect`로 확인했다. Compose에는 tag와 아래 multi-architecture manifest digest를 함께 기록했다. 로컬 실행은 Linux amd64이며 arm64는 manifest 존재만 확인했다.

| 서비스 | 버전 | manifest SHA-256 | 지원·선택 근거 |
| --- | --- | --- | --- |
| Prometheus | 3.13.5 | `aafa9d694e6a883c02db516d9f6e5b84e14195f49a2a6456a4cca815edda72b9` | [공식 다운로드](https://prometheus.io/download/), [3.13 LTS 지원](https://prometheus.io/docs/introduction/release-cycle/): 2027-07-31까지 |
| Grafana OSS | 12.4.13 | `41bbc1b5e04416f81891806076db2a2ff60a5d4da5f78d36a88b033a8c199185` | [12.4.13 release](https://github.com/grafana/grafana/releases/tag/v12.4.13), [12.4 지원](https://grafana.com/docs/grafana/latest/upgrade-guide/when-to-upgrade/): 2027-05-24까지. 마지막 minor의 patch 지원을 선택 |
| 로컬 진입점 | Nginx 1.30.6-alpine | `47928bf67eb62a1863cb08d9ecb52d3e704304ba614eaee17884204677702951` | [공식 stable](https://nginx.org/en/download.html)·[보안 공지](https://nginx.org/en/security_advisories.html) 확인. 기존 공개 ingress의 이미지 교체는 별도 배포 검수 범위 |
| Node Exporter | 1.12.1 | `1b4e4438faca4dd7e001dd445d161a4a2091b0fededa84093b3a8dfeae1f1be0` | [공식 release](https://github.com/prometheus/node_exporter/releases/tag/v1.12.1) |
| PostgreSQL Exporter | 0.20.1 | `ac5ec343104fae0e2d84a27bb8d69b38430a11910c5382cad85d478d2bab713e` | [공식 release](https://github.com/prometheus-community/postgres_exporter/releases/tag/v0.20.1); built-in stat_database만 사용 |
| Blackbox Exporter | 0.29.1 | `ea1c7aa3ef3f307cd03e85f34abb604478ccb90b567fc690da0cd9776da76b13` | [공식 release](https://github.com/prometheus/blackbox_exporter/releases/tag/v0.29.1) |

각 manifest에 `linux/amd64`, `linux/arm64`가 있다. 업데이트할 때 tag·digest·지원 기간을 함께 확인하고 동일한 smoke를 재실행한다. 이전 파일과 데이터 백업이 rollback 입력이며 TSDB/SQLite를 새 버전으로 연 뒤 단순 image downgrade가 안전하다고 가정하지 않는다.

## 접근과 자원

- 기본 `compose.yaml`에는 서비스나 의존성을 추가하지 않았다. 별도 파일과 `observability` profile을 명시한다. 격리 검증은 별도 project와 새 named volume만 사용한다.
- Prometheus는 internal `monitoring_net`만, Grafana는 internal `monitoring_net`/`grafana_access_net`만 사용한다. 둘 다 host port와 외부 통신 경로가 없다.
- Docker 29.6.1에서 internal-only 컨테이너의 `ports` 요청은 저장되지만 실제 포트가 생성되지 않는 것을 재현했다. [Docker 측 보고](https://github.com/moby/moby/discussions/53256)와 같았다. `monitoring-gateway`가 `127.0.0.1:3030`에서 고정 Grafana upstream만 전달한다. Gateway는 `grafana_access_net`과 별도 일반 bridge만 사용하며 Prometheus·앱/DB 망에는 연결되지 않는다. 공개 Nginx는 모니터링 망에 연결하지 않는다.
- Gateway의 일반 bridge에는 egress 경로가 있지만 설정에는 외부 upstream·동적 URL·DNS resolver가 없다. Grafana/Prometheus의 egress는 계속 차단한다. Gateway 접근 로그는 끄고 오류 로그는 회전한다. 악의적인 host/Docker 관리자를 격리하는 보안 경계는 아니다.
- Grafana의 익명 접근·가입·조직 생성·snapshot·공개 dashboard·원격 분석·업데이트 확인·plugin 자동 설치를 끈다. 계정은 `owner`다. Health endpoint는 버전/DB 상태만 반환하며 datasource와 지표는 인증이 필요하다. 공개 Nginx와 전용 gateway 모두 metrics/probe/Prometheus 경로를 차단한다.
- Prometheus 384 MiB/0.35 CPU, Grafana 304 MiB/0.20 CPU, gateway 16 MiB/0.05 CPU다. Grafana의 기존 320 MiB/0.25 CPU 예산을 나눠 총 704 MiB/0.60 CPU를 유지한다. 후속 exporter/collector까지 전체 1 GiB/1 CPU 예산이다.
- 모두 비-root·capability 제거·no-new-privileges·읽기 전용 root/config로 실행한다. 공식 이미지가 준비한 named volume 소유권을 사용한다(Prometheus 65534, Grafana 472). Host 디렉터리를 mount하면 해당 UID의 접근 권한을 별도로 확인한다. `chmod 777`이나 root 실행으로 해결하지 않는다.
- 60초 수집/10초 timeout, self 지표 5종과 scrape 상태만 저장한다. `instance=prometheus` 별칭을 사용하고 주소가 든 target 상세 series는 저장하지 않는다. 최대 2,000 sample/10 label/값 128자/body 1 MiB다.
- Retention `7d`/`1GB` 중 먼저 도래하는 조건이며 선택 이미지의 실제 flag 결과를 smoke로 확인한다. 1GB는 1 GiB(1,073,741,824 bytes)로 해석한다. WAL/head/compaction과 로그 때문에 전체 디스크 hard quota는 아니다. 전체 예산 3 GiB 중 Prometheus 2 GiB, Grafana 512 MiB를 배정한다. 로그는 서비스당 10 MiB × 3개이며 gateway 추가분 30 MiB는 예비 공간에서 차감했다.

## 시작과 종료

앱 디렉터리에서 실행한다. 먼저 저장소 **밖**의 접근 제한 디렉터리에 무작위 비밀번호 파일을 만든다. 비밀번호를 CLI 인자, Git, `.env.example` 또는 화면 캡처에 넣지 않는다. Windows에서는 현재 사용자만 읽는 디렉터리 ACL을 사용한다. Linux의 Compose file secret은 host 파일 bind이므로 uid/gid 재지정을 신뢰하지 말고 컨테이너 UID 472가 읽을 수 있는지 확인한다. 예를 들어 host 부모 디렉터리 0700과 파일 0444를 사용하면 다른 host 사용자의 경로 접근을 막으면서 지정 컨테이너의 읽기를 허용할 수 있다. [Grafana file secret 방식](https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/#configure-grafana-with-docker-secrets)을 사용한다.

PowerShell 예시(경로는 준비한 외부 파일로 바꾼다):

```powershell
$env:HLOG_GRAFANA_PASSWORD_FILE = 'C:/secure-local/hlog/grafana-password'
$env:HLOG_GRAFANA_PORT = '3030' # 충돌 시 다른 localhost 포트
docker compose -p hlog-observe-preview -f compose.observability.yaml --profile observability config --quiet
docker compose -p hlog-observe-preview -f compose.observability.yaml --profile observability run --rm --no-deps --entrypoint promtool prometheus check config /etc/prometheus/prometheus.yml
docker compose -p hlog-observe-preview -f compose.observability.yaml --profile observability up -d --wait
```

`http://127.0.0.1:3030`에서 `owner`와 준비한 비밀번호로 로그인한다. 외부 host에서 사용할 때는 승인된 SSH 터널 안의 loopback만 사용한다. Basic HTTP 검증은 로컬 전용이며 인터넷에 열지 않는다. 관리자 계정은 최초 DB 초기화 때 생성된다. 이후 secret 파일만 교체해도 저장된 비밀번호가 바뀌지는 않는다. Grafana의 비밀번호 변경/복구 절차를 사용하고 저장 volume을 삭제하지 않는다.

```powershell
# 재기동: 수집 이력과 Grafana DB 유지
docker compose -p hlog-observe-preview -f compose.observability.yaml --profile observability up -d --force-recreate --wait
# 종료: volume 보존. 실제 데이터에는 --volumes를 붙이지 않는다.
docker compose -p hlog-observe-preview -f compose.observability.yaml --profile observability down
```

현재 모니터링 volume은 별도 백업을 구현하지 않았다. 운영 전 retention·volume 백업/복구·기존 공개 Nginx 이미지 갱신과 장기 부하를 후속 단계에서 확인한다. 메모리 한도를 넘으면 자원을 늘리기 전에 측정과 예산 재검토가 필요하다.

## 재현 가능한 검증

Docker와 로컬 비밀번호 파일이 필요하다. 전용 `hlog-observe-local` project에 기존 container/network/volume이 있으면 테스트는 실행을 거절한다. 검증용 데이터만 만들고 자신이 생성한 project 자원만 삭제한다. 앱 DB나 provider를 사용하지 않는다. 오류 시 원문 로그는 비공개로 검토한다.

```powershell
docker compose -p hlog-observe-local -f compose.yaml config --quiet
docker compose -p hlog-observe-local -f compose.yaml -f compose.observability.yaml --profile observability config --quiet
$env:HLOG_OBSERVABILITY_SMOKE = '1'
node --test scripts/observability-stack.test.mjs
node node_modules/eslint/bin/eslint.js scripts/observability-stack.test.mjs
git diff --check
```

검증은 기본 서비스 설정 보존/profile OFF, promtool, 실제 readiness·인증 거부·datasource health·self `up=1`, 주소 없는 저장 label, 제한/권한/네트워크, 공개 ingress 404와 정상 경로 통과, 다른 앱 망에서 Prometheus 접근 거부, 새 컨테이너의 과거 sample·Grafana 저장 자료·datasource 보존을 확인한다. Container recreation 검증용 빈 dashboard는 테스트가 삭제한다. 이 검증은 실제 업무 dashboard·알림 또는 host 전체 장애 감시가 아니다.

정확한 실행 결과와 다음 작업은 [Step 1 완료 기록](../../phases/operations-observability/step1.md)을 참고한다.

## Step 2: 상태 수집과 측정 범위

`compose.observability-probes.yaml`을 추가하면 `prometheus.yml`의 `scrape_config_files`가 고정 scrape 목록을 읽는다. 기본 스택만 실행할 때 이 디렉터리가 없어도 정상이다. 기존 앱 서비스와 기본 의존성은 바꾸지 않는다. Exporter 3개에 각각 64 MiB/0.05 CPU, H-Log collector에 128 MiB/0.25 CPU를 배정해 전체 1 GiB/1 CPU를 유지한다.

- Node Exporter에는 host `/proc/stat`, `/proc/meminfo`, `/proc/cpuinfo` 세 파일만 read-only로 연결한다. Host `/`, 전체 `/proc`·`/sys`, Docker socket은 연결하지 않는다. CPU·메모리는 Docker Desktop Linux VM 값이며 Windows host 또는 OCI 실측이 아니다.
- 디스크는 비어 있는 `observed_filesystem` local volume의 backing filesystem만 `mountpoint=docker-data`로 수집한다. 이 volume에서 파일을 만들지 않는다. Smoke가 Prometheus volume과 filesystem ID/type이 같은지 비교한다. 운영에서 DB·Prometheus가 다른 디스크/driver를 쓰면 이 지표로 둘 다 대표할 수 없다. Step 7에서 실제 배치를 확인하고 필요한 filesystem마다 내용이 없는 전용 통계 경로를 승인·연결한다. Root disk를 측정했다고 표시하지 않는다.
- PG exporter는 비특권 `stat_database`와 `pg_up`만 사용한다. 저장 연결 수는 DB `hlog`를 `database=app`으로 치환한 한 series다. 다른 DB명·datid·주소는 저장하지 않는다. 전체 DB 연결 수는 collector의 `hlog_db_connections`, 설정 상한은 `hlog_db_max_connections`이므로 전체 사용률은 이 둘로 계산한다. DB명이 다르면 운영 검수 때 고정 match를 함께 조정한다.
- `monitoring.database_health`는 연결·잠금 수와 max_connections만 반환한다. Collector는 최소 60초 간격으로 read-only transaction을 실행하며 연결 2초, query 전체 5초, statement 3초로 제한한다. 1초 tick에서 실행 시점을 확인하므로 타이머가 경계보다 일찍 깨어나도 한 주기를 건너뛰지 않는다. 실패한 connection은 폐기한다. 동시 실행과 즉시 재시도를 막고 HTTP 요청은 캐시만 읽는다.
- 실패 시 `hlog_metrics_collection_success=0`과 `state=error`를 내보내고 마지막 정상 timestamp를 유지한다. 유효한 과거 값은 180초까지만 제공한다. 첫 성공이 없거나 오래된 값은 생략하며 실패를 0건으로 표시하지 않는다. `/metrics`만 GET/HEAD로 응답한다.
- PG exporter upstream의 오류에는 server/DSN이 들어갈 수 있어 해당 프로세스 stdout/stderr를 저장하지 않는다. `up`은 scrape, `pg_up`은 DB 연결, collector의 state/freshness는 집계 상태다. 시작 오류도 `up=0`으로 드러나며 원문 로그를 켜서 공개하지 않는다. 고정 0.20.1의 legacy pool 1개와 built-in pool, DB role connection limit 2로 상한을 제한한다.
- HTTP scrape는 고정 `/`, `/blog` 두 경로와 `home`/`blog` 별칭만 사용한다. 응답 코드 200, 5초 timeout, 1 MiB body, redirect 금지, 정상 CA 검증을 적용한다. Blackbox 포트는 publish하지 않고 연결망 모두 internal로 두어 외부 URL에 접근할 기본 route가 없다. `/probe`는 신뢰된 모니터링 망 안의 exporter API이며 임의 URL을 받는 사용자 기능으로 열지 않는다. 이 구성은 Docker 관리자나 같은 망을 조작할 수 있는 운영자를 격리하지 않는다.
- `probe_success=0, up{job="http"}=1`은 대상 실패다. `up{job="http"}=0`과 `up{job="probe-exporter"}=0`은 exporter/scrape 실패다. TLS expiry는 HTTPS만 제공한다. 이 지연은 합성 probe 값이며 실제 방문자 응답 시간이나 외부 인터넷 접근 성공이 아니다.

## DB 계정 준비와 선택형 연결

현재 단계에서는 아래 준비를 **새 격리 DB에서만** 자동 검증한다. 운영 DB에는 적용하지 않는다. [database-roles.sql](database-roles.sql)은 앱 migration과 별개의 최초 1회 bootstrap이다. 대상 DB 소유자와 CREATEROLE 권한으로 실행하며 기존 role/schema가 있으면 실패하고 transaction을 취소한다. 기존 계정을 조용히 재사용하거나 권한을 변경하지 않는다.

Bootstrap은 두 role을 NOLOGIN으로 생성한다. 비밀번호를 별도 비공개 작업으로 설정한 뒤 LOGIN을 허용해야 한다. `hlog_metrics_exporter`에는 기본 통계만, `hlog_metrics_collector`에는 집계 view의 USAGE/SELECT만 허용한다. 앱 credential, pg_monitor, pg_read_all_stats, superuser를 사용하지 않는다. DB PUBLIC의 TEMPORARY/CREATE와 public schema CREATE를 회수하므로, 운영 적용 전 기존 앱의 temp-table 사용과 역할별 명시 권한을 검토한다. 읽기 전용 기본값만으로 쓰기 권한이 차단됐다고 판단하지 않는다.

저장소 밖의 제한된 디렉터리에 다음 파일을 준비한다. Secret 값은 CLI 인자로 넣지 않는다. Compose file secret은 컨테이너 UID가 읽을 수 있는 파일 권한이 필요하다(상위 디렉터리 0700, mount 대상 파일 0444 또는 승인된 UID별 ACL). 파일 형식의 host는 고정 내부 DB 서비스이며 실제 주소는 문서에 기록하지 않는다.

| 환경 변수 | 파일 내용 |
| --- | --- |
| `HLOG_GRAFANA_PASSWORD_FILE` | 기존 Grafana 비밀번호 |
| `HLOG_EXPORTER_URI_FILE` | `host:port/database?sslmode=...&connect_timeout=2&options=-c%20statement_timeout%3D3000` (user/password 제외) |
| `HLOG_EXPORTER_PASSWORD_FILE` | 통계 전용 exporter 비밀번호 |
| `HLOG_COLLECTOR_DSN_FILE` | 별도 collector 계정의 PostgreSQL URI |

Profile은 같지만 probes 파일은 별도 선택이다. 현재 고정 HTTP 서비스 `hlog-web:3000`을 probe_net에 연결하는 일은 대상 실행 환경의 명시적 override가 맡는다. Base 앱을 이 파일만으로 자동 재기동하거나 망에 연결하지 않는다. TLS origin/CA·DB 배치·계정·동일 filesystem 검수는 운영 Step 7의 선행 조건이다.

```powershell
docker compose -p hlog-observe-preview -f compose.observability.yaml -f compose.observability-probes.yaml --profile observability config --quiet
# 실제 대상 network와 계정을 준비한 승인 환경에서만 up을 실행한다.
```

## 격리 장애 검증

```powershell
$env:HLOG_OBSERVABILITY_PROBES_SMOKE = '1'
# 전체 앱 DB 통합 검증도 새 disposable cluster에서 수행하려면 지정한다.
$env:HLOG_OBSERVABILITY_FULL_INTEGRATION = '1'
npm run test:observability:probes
```

Docker와 OpenSSL이 필요하다. Windows 기본값은 Git의 `usr/bin/openssl.exe`이며 `HLOG_TEST_OPENSSL`로 명시할 수 있다. 테스트가 저장소 밖 임시 비밀번호·2일짜리 TLS 인증서를 만들고 전용 `hlog-observe-probes-local` project를 정리한다. 기존 project가 있으면 거부한다. DB fixture는 tmpfs이며 앱 DB에 접근하지 않는다. Grafana의 loopback 포트 기본값은 3030이다.

검증은 real SQL 권한 거부(본문/쓰기/일반·임시 table/schema), 실제 lock 대기, 3초 slow-query 취소, 정상 host/DB 지표, 고정 synthetic home/DB-backed blog, 정상 CA/임박 expiry·503·5초 timeout·redirect 거부, DB 중단과 exporter 중단의 구분을 포함한다. DB collector의 60초 주기는 그대로다. 테스트용 Prometheus만 10초 scrape로 바꾸며 배포 설정의 60초를 별도로 검사한다. 저장 series의 고정 label·canary/credential 로그 누락과 read-only mount·무 egress도 확인한다. 공개 ingress와 Grafana 인증·재생성 보존은 Step 1 smoke가 맡는다.

## Step 3: 발행·비용과 실행 기록

`compose.observability-publishing.yaml`을 두 모니터링 파일 뒤에 명시적으로 추가한다. Collector는 동일한 read-only transaction 안에서 `publishing-views.sql`의 세 집계 view를 읽는다. Migration `012_observability_signals` 적용 후 DB 소유자가 이 view를 설치해야 한다. Bootstrap과 마찬가지로 현재 검증 대상은 새 로컬 DB다. 운영 migration은 별도 승인 대상이다.

- 작업은 현재 버전만 집계한다. 처리 가능한 글의 queued/retrying 최초 대기 시각, 시각 미상 수, 만료된 running lease를 구분한다. 기존 작업의 `enqueued_at`은 NULL이고 새 INSERT부터 DB가 시각을 채운다. 재시도/claim은 그 값을 바꾸지 않는다.
- 비용은 UTC 일/월 경계부터 현재 시각까지 합산한다. `cost_basis`는 명시적인 provider 근거를 보존하며 기존 0원은 구독 포함으로 추정하지 않는다. 알려진 금액 합계와 unknown 건수는 겹칠 수 있다. 한도 0은 유효한 차단, 빈 설정은 무제한, 잘못된 값은 invalid다. Collector에는 자동 발행과 같은 두 `HLOG_*_ESTIMATED_COST_LIMIT` 값만 전달한다. 전체 provider 환경 파일을 수집기에 연결하지 않는다.
- `source=db,autopublish,backup,restore,expectations`는 각각 수집한다. DB 중단 중에도 파일 신호를 읽고, 실패한 source는 성공 flag 0·기존 timestamp와 최대 180초 캐시를 유지한 뒤 업무 값을 생략한다. 읽기 성공 시각과 오래된 마지막 업무 성공은 별개다.
- 성공은 이번 실행에서 생성한 글의 current/published 버전, 필수 6종의 존재·성공, 불변 본문 hash를 한 snapshot에서 확인한 경우다. 중복·idle·초안·budget 차단은 성공을 갱신하지 않는다. 실패 단계는 `hlog_batch_stage`, 결과는 `hlog_batch_result`로 구분한다. 본문·ID·URL·provider label은 내보내지 않는다.

### Host 파일과 실행 hook

Linux host의 Python 3 표준 라이브러리만 사용하며 pip 패키지는 없다. 개발용 Linux fixture에서는 고정 Python 이미지를 사용했다. OCI host의 Python 설치·systemd 버전·실제 service 실행은 Step 7 검수 대상이다.

승인된 설치 시 `hlog-ops` 사용자와 `hlog-observe` 그룹을 준비한다. `/var/lib/hlog-observability`는 `hlog-ops:hlog-observe`, 0750, JSON/lock은 0640이다. 하위 `evidence`는 2770(setgid)으로 만들고 cycle에 이 디렉터리만 쓰기 가능하게 mount한다. Collector에는 상위 디렉터리 전체를 read-only로 mount한다. 두 컨테이너에 같은 그룹의 숫자 GID를 추가한다. Host helper만 요약을 쓰고 cycle은 증거 파일만 쓴다.

`/etc/hlog/observability.env`에는 `HLOG_OBSERVABILITY_STATE_DIR=/var/lib/hlog-observability`와 실제 `HLOG_OBSERVABILITY_GID`를 넣는다. Compose를 수동 실행하는 환경에도 같은 값을 제공한다. 운영자에게 Docker와 앱 환경 파일을 사용할 권한이 있어야 한다. `docker` 그룹은 강한 host 권한이므로 비특권 파일 writer와 Docker 운영자를 보안 격리했다고 해석하지 않는다.

선택형 [systemd drop-in](../systemd/hlog-auto-publish.service.d/observability.conf)은 첫 ExecStartPre에서 시작을 기록한 뒤 기존 auth 검사를 실행한다. ExecStopPost는 preflight 실패도 기록한다. Hook은 best-effort이며 저장 실패가 발행 실행·종료 코드·재시도를 바꾸지 않는다. 전원 차단은 완료 기록이 없는 running으로 남는다. 기록 자체가 실패하면 누락/오래된 시각을 확인해야 한다. 기존 timer 설정은 그대로이며 이번 단계에서는 drop-in을 설치하거나 timer를 켜지 않았다.

`autopublish.json`과 `evidence/autopublish.json`은 helper/cycle이 관리한다. 기대 상태는 운영자가 별도로 관리하는 `expectations.json`이다. 초기 비활성 값은 아래와 같다. 활성화 시 실제 승인 시각을 epoch seconds로 기록한다. 임의 성공 파일을 만들지 않는다.

```json
{"schema_version":1,"autopublish":{"enabled":false,"enabled_at":0,"maintenance_from":0,"maintenance_until":0},"backup":{"enabled":false,"enabled_at":0,"maintenance_from":0,"maintenance_until":0},"restore":{"enabled":false,"enabled_at":0,"maintenance_from":0,"maintenance_until":0}}
```

Expectation도 `scripts/observability-state.py`의 `atomic_write`로 같은 filesystem에서 교체한다. 파일 누락/손상은 disabled가 아니다. enabled 기록만 있고 summary가 없으면 첫 실행 전으로 해석한다. KST 09:00 slot/09:30 deadline을 사용하며 09:10 활성화는 다음 날부터다. 재부팅 시 가장 최근 도래한 slot만 인정한다. 정비는 최대 24시간이고 정비 전 실패를 지우지 않는다. 수동 실행은 `python3 scripts/observability-state.py run -- <command>`로 감싸며 Docker에는 `-e HLOG_OBSERVABILITY_INVOCATION_ID`를 전달한다. 같은 publishing overlay를 사용한다. 수동 성공은 scheduled slot을 채우지 않는다.

요약 교체에는 flock, file fsync, atomic rename, directory fsync를 사용한다. 파일은 32 KiB 이하이며 symlink·FIFO·손상·미래 시각을 정상값으로 읽지 않는다. 기록 실패는 원문 없는 고정 오류를 남긴다. 강제 전원 차단 때 남을 수 있는 `.tmp`의 정리와 state 디스크 예산은 Step 6 장애/자원 검수 항목이다. JSON은 감사 이력이나 발행 DB의 대체물이 아니다.

### Step 3 격리 검증

```powershell
# DATABASE_URL은 전용 로컬 disposable DB에만 설정한다.
npm run test:observability:publishing
$env:HLOG_OBSERVABILITY_STATE_TEST = '1'
npm run test:observability:state
$env:HLOG_OBSERVABILITY_PROBES_SMOKE = '1'
$env:HLOG_OBSERVABILITY_PUBLISHING_SMOKE = '1'
npm run test:observability:probes
```

State test는 네트워크 없는 비특권 Linux 컨테이너와 tmpfs에서 실행한다. Publishing smoke는 가짜 provider와 실제 generation/worker/필수 adapter, host helper, 읽기 전용 collector, Prometheus를 연결한다. 중복 실행의 성공 보존, 컨테이너 재생성, 손상된 summary의 invalid/업무 series 생략, DB 중단 중 파일 수집, label/log 개인정보 경계를 확인한다. 실제 provider·운영 공개·scheduler는 사용하지 않는다. 검증 결과는 [Step 3 완료 기록](../../phases/operations-observability/step3.md)에 남긴다.

## Step 4: 수동 백업·복구 검증

새 timer는 없다. 초기 기대 상태는 위와 같이 모두 disabled이며, 기존 expectations 파일에도 backup/restore 항목을 명시적으로 추가해야 한다. 항목 누락·손상은 정상 비활성으로 처리하지 않는다. 백업 보관은 [백업 runbook](../../.codex/docs/backup-restore-runbook.md)을 따른다. 백업 성공과 복구 검증 성공은 별개다.

Linux host의 전체 checkout에서 설치된 Node 의존성·Docker CLI·Python 3와 `npm run build` 결과를 사용한다. OCI 설치는 아직 검증하지 않았다. Dump는 repository 밖 0700 디렉터리의 새 절대 경로에 둔다. 환경 변수는 비공개 host env에서 설정하며 credential을 명령 인자나 로그에 쓰지 않는다.

| 명령 | 필요한 환경 변수 |
| --- | --- |
| backup | `HLOG_BACKUP_DB_CONTAINER`, `HLOG_BACKUP_DB_NAME`, 선택 `HLOG_BACKUP_DB_USER`(기본 postgres) |
| restore | `HLOG_RESTORE_DB_CONTAINER`, `HLOG_RESTORE_DATABASE_URL`, 선택 `HLOG_RESTORE_DB_USER`(기본 postgres) |

```bash
# apps/h-log, 승인된 로컬 대상의 비공개 env를 준비한 뒤 실행한다.
python3 scripts/observability-state.py --directory /var/lib/hlog-observability --task backup run -- node --no-warnings --experimental-strip-types scripts/observability-backup.mjs backup --file /absolute/private/new-archive.dump
python3 scripts/observability-state.py --directory /var/lib/hlog-observability --task restore run -- node --no-warnings --experimental-strip-types scripts/observability-backup.mjs restore --file /absolute/private/new-archive.dump
```

Wrapper의 `run`은 실제 명령 종료 결과를 보존하며 evidence 기록 실패만으로 작업을 재시도하지 않는다. 수동 실행도 atomic summary를 쓰지만 schedule을 켜지는 않는다. Backup은 새 파일 생성·binary stream·fsync·PGDMP/목록 검사가 끝난 뒤 성공을 기록한다. Restore는 `hlog.restore-rehearsal=1` label·기본 PGDATA tmpfs·loopback port가 일치하는 **별도 일회용 DB 컨테이너**만 허용한다. URL query 옵션은 거부하며 사용자도 명시한 DB user와 같아야 한다. 입력 URL의 기존 database에 복원하지 않고 새 무작위 DB를 생성한다.

Restore는 정확한 migration 목록·vector 연산·본문/PDF hash·PDF 정책을 검사하고 해당 DB를 사용하는 새 Next 프로세스의 공개 글 200·비공개 글 404와 Markdown을 확인한다. Dump 밖의 새 PDF epoch로 GET/HEAD·조건부/Range 요청도 404인지 확인하고, 복원된 포인터를 감사 reset한다. 생성 DB와 웹 프로세스 정리를 마친 뒤에만 restore 성공이다. 원본 DB의 글/공개 포인터는 수정하지 않는다. 강제 종료 잔여 자원은 소유 여부를 확인한 뒤 정리하며 실제 데이터/최대 용량·운영 재부팅은 후속 검수다.

`backup.json`/`restore.json`과 `evidence/backup.json`/`evidence/restore.json`은 task별로 독립된다. Collector는 `hlog_batch_last_attempt_timestamp_seconds{task}`·`hlog_batch_last_success_timestamp_seconds{task}`·기존 result/stage를 읽는다. 실패 시 이전 성공 시각이 남아도 현재 실패를 함께 표시해야 한다. 누락 summary에는 가짜 성공 시각을 만들지 않는다. 기대 상태와 성공 시각으로 첫 백업 26시간·첫 복구 24시간, 이후 26시간/30일 deadline을 계산한다. 재활성화 전 성공을 새 성공으로 쓰지 않으며 정비 전부터 지연된 deadline도 지우지 않는다. 손상된 summary는 source 오류로 표시하고 새로운 deadline을 만들지 않는다. Dashboard/알림은 Step 5다.

```powershell
$env:HLOG_OBSERVABILITY_BACKUP_SMOKE = '1'
npm run test:observability:backup
```

이 검증은 독립 tmpfs PostgreSQL과 외부 임시 폴더만 사용한다. 실제 성공, 기존 파일 덮어쓰기 거부, 깨진 dump·본문 hash 변조·잘못된 복구 대상 거부, 기록 실패 시 정상 작업 종료와 실패 후 성공 시각 보존을 확인한다. 앞의 publishing smoke도 실제 backup→host helper→collector→Prometheus와 재생성 보존·restore 미실행/disabled를 확인한다. [Step 4 기록](../../phases/operations-observability/step4.md)에 검증 결과와 다음 단계를 남겼다.
