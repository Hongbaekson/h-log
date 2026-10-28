# 비공개 모니터링 로컬 실행

`operations-observability / Step 1` 구성이다. Prometheus self-scrape와 Grafana datasource만 연결한다. Host/DB/HTTP exporter, 발행·비용·백업 신호, 대시보드와 알림은 후속 step이다. OCI 적용이나 timer 활성화 절차가 아니다.

## 고정 이미지

2026-10-28 공식 배포 정보와 `docker buildx imagetools inspect`로 확인했다. Compose에는 tag와 아래 multi-architecture manifest digest를 함께 기록했다. 로컬 실행은 Linux amd64이며 arm64는 manifest 존재만 확인했다.

| 서비스 | 버전 | manifest SHA-256 | 지원·선택 근거 |
| --- | --- | --- | --- |
| Prometheus | 3.13.5 | `aafa9d694e6a883c02db516d9f6e5b84e14195f49a2a6456a4cca815edda72b9` | [공식 다운로드](https://prometheus.io/download/), [3.13 LTS 지원](https://prometheus.io/docs/introduction/release-cycle/): 2027-07-31까지 |
| Grafana OSS | 12.4.13 | `41bbc1b5e04416f81891806076db2a2ff60a5d4da5f78d36a88b033a8c199185` | [12.4.13 release](https://github.com/grafana/grafana/releases/tag/v12.4.13), [12.4 지원](https://grafana.com/docs/grafana/latest/upgrade-guide/when-to-upgrade/): 2027-05-24까지. 마지막 minor의 patch 지원을 선택 |
| 로컬 진입점 | Nginx 1.30.6-alpine | `47928bf67eb62a1863cb08d9ecb52d3e704304ba614eaee17884204677702951` | [공식 stable](https://nginx.org/en/download.html)·[보안 공지](https://nginx.org/en/security_advisories.html) 확인. 기존 공개 ingress의 이미지 교체는 별도 배포 검수 범위 |

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
