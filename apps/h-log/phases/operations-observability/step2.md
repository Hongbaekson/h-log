# Step 2: host-database-http-probes

## 개선 사항과 선행 조건

Steps 0–1 완료 후 Linux host, PostgreSQL, HTTP/TLS의 최소 상태를 수집한다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 이전 step이 만든 실제 설정·collector·test·runbook도 수정 전에 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `.codex/skills/tdd/SKILL.md` (helper/DB behavior를 변경할 경우 적용)
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`
- `apps/h-log/phases/operations-observability/index.json`
- `apps/h-log/phases/operations-observability/step1.md`
- `apps/h-log/compose.yaml`
- `apps/h-log/compose.observability.yaml`
- `apps/h-log/deploy/observability/README.md`
- `apps/h-log/deploy/observability/prometheus.yml`
- `apps/h-log/deploy/observability/gateway.conf`
- `apps/h-log/deploy/observability/grafana/provisioning/datasources/prometheus.yml`
- `apps/h-log/scripts/observability-stack.test.mjs`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/.codex/docs/local-blog-dry-run.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`

## 작업

1. Node Exporter, PostgreSQL Exporter, Blackbox Exporter를 선택형 구성에 추가한다. 앞 step에서 만든 실제 config도 읽고 공식 이미지 digest를 고정한다.
2. Node Exporter의 host CPU·메모리·filesystem/inode를 읽되 mount를 최소 read-only로 제한한다. Docker Desktop 수치는 Linux VM 기준이라는 한계를 완료 기록에 남긴다.
3. 격리 DB에 통계 조회용 최소 계정을 준비하고 DB 가용성·연결 수·lock 대기를 수집한다. 앱 DB credential, superuser, SQL 원문, 세션 식별자는 사용하지 않는다.
4. 운영자가 정한 고정 로컬 HTTP 대상과 로컬 TLS fixture를 probe한다. 정적 홈과 DB-backed Blog를 분리하고 비정상 status·timeout·TLS 만료를 확인한다. 임의 외부 URL probing은 허용하지 않는다.
5. 수집 중단·target 장애를 구분하고 retry/query 수를 제한한다. 현재 데이터가 synthetic probe latency임을 명확히 한다.
6. 기본 exporter의 instance/target/database label을 검토하고 내부 주소·식별자를 안전한 고정 서비스 별칭으로 relabel/drop한다. 알림뿐 아니라 저장 metric에도 금지 값이 남지 않는지 검사한다.

## 인수 기준

정상 host/DB/HTTP 지표가 수집되고 DB 중단·HTTP 실패·TLS 임박 fixture·exporter 중단 시 예상 값이 나온다. 계정 권한과 endpoint 비공개 경계가 확인된다.

## 검증

1. 선택형 Compose config, promtool check config, exporter config validator(제공 시)를 실행한다.
2. 격리 DB와 synthetic HTTP/TLS fixture에서 정상/timeout/실패/수집 중단을 실행하고 Prometheus query 결과를 확인한다.
3. 새 helper나 DB migration이 필요하면 TDD 및 OBSERVABILITY_PLAN의 코드/통합 gate를 적용한다. 설정만 바꾸면 parser·runtime smoke·git diff --check로 검증한다.
4. 이 phase의 index와 현재 step에 실제 결과·command·남은 결정·다음 step을 기록한다. 상세 공통 gate는 OBSERVABILITY_PLAN을 따른다.

## 하지 말 것

- Docker socket·privileged container·전체 host 쓰기 mount를 추가하지 말 것. 초기 지표에는 필요하지 않다.
- 내부 HTTP probe 성공을 인터넷 접근 성공이나 실제 방문자 p95로 표시하지 말 것. 측정 경계가 다르다.
- 민감 본문·credential·내부 URL/IP를 metric/label/로그/알림/커밋에 넣지 말 것. 운영 데이터도 공개 저장소의 privacy 경계를 따른다.
- Discord 스타일과 레이더 전체 영역을 변경하지 말 것. 이번 phase는 비공개 운영 모니터링 범위다.
- OCI·DNS/TLS·운영 timer·실제 provider·외부 알림 전송을 실행하지 말 것. 현재 사용자 보류와 로컬 검증 범위를 유지한다.

## Step 0 확정 계약 인계 — 구현 시 사용한 기준

DB exporter는 비특권 built-in 통계, H-Log collector는 고정 집계 view를 읽는다. Deprecated custom query·pg_monitor 권한은 쓰지 않는다. Source freshness·3초 query timeout·실제 권한 거부와 Linux VM/host 차이를 검증한다. [지표·권한·자원·예정 파일과 명령](../../.codex/docs/harness/OBSERVABILITY_PLAN.md)을 기준으로 하며 이번 인계 기록은 구현 완료가 아니다.

## 완료 기록 — completed — 2026-10-28

- 공식 Node 1.12.1 / PostgreSQL 0.20.1 / Blackbox 0.29.1 exporter의 immutable manifest digest를 고정했다. 실행은 Docker Desktop Linux amd64이며 arm64는 manifest 존재만 확인했다.
- 별도 opt-in probes overlay, split scrape config, 고정 HTTP module, NOLOGIN 최소 DB role/bootstrap, Node/pg collector와 테스트를 추가했다. 기존 앱 Compose/공개 UI·worker/provider·앱 migration은 바꾸지 않았다.
- Host root 계획은 더 좁게 수정했다. rslave root mount는 Docker Desktop에서 실패했고 전체 root 노출 실행은 자동 승인 검토가 거절했다. 최종 구성은 /proc/stat·meminfo·cpuinfo만 read-only로 읽으며 디스크는 내용 없는 Docker local volume을 사용한다. Prometheus와 filesystem ID/type 일치를 검증했다. Docker Linux VM/Docker data filesystem 수치이며 Windows/OCI root 또는 별도 DB disk 측정으로 표시하지 않는다.
- DB 계정의 원문 SELECT·INSERT·일반/임시 table·schema 생성과 pg_monitor 접근을 거부한다. Collector만 고정 집계 view를 읽는다. 실제 lock 대기를 count로 확인하고 pg_sleep(10) view가 3초에 취소되며 연결이 폐기되는 것을 확인했다. 전체 연결 수는 새 hlog_db_connections 집계로 제공해 임의 DB명을 저장하지 않는다.
- 최소 60초 간격 수집, max 1 collector connection, 성공 snapshot의 원래 timestamp·180초 TTL, missing/invalid/error 구분을 검증했다. 최종 DB stop 회귀에서 타이머가 경계보다 조금 일찍 실행되면 한 주기를 건너뛰는 문제를 재현했다. 1초 tick에서 collector가 60초 제한을 적용하도록 수정해 DB 시도 간격은 유지하면서 이를 해결했다. DB stop은 pg_up=0/source error, exporter stop은 up=0이다. 원문 DB 오류는 로그에 남기지 않는다.
- CA 검증을 유지한 합성 TLS의 2일 expiry, 고정 home/DB-backed blog의 503·5초 timeout·redirect 거부·DB stop을 검증했다. Prometheus fixture만 10초 scrape를 사용하고 배포 기본 60초와 collector 60초는 보존했다. 사용자 URL 입력이나 외부 probing을 제공하지 않는다.
- 저장 metric/label allowlist·canary/credential 로그 누락, 무 host port·무 default egress·비-root/read-only/cap-drop·OOM/restart 0을 확인했다. 장기 self-scrape에서 나타난 sample type label을 발견해 histogram 표본을 제외하고 고정 label만 저장하도록 수정했다.

검증(앱 디렉터리):

`node --no-warnings --experimental-strip-types --test lib/observability-collector.test.ts`: 새 모듈 부재로 RED 확인 후 3/3 GREEN. `npm run test`: 260 pass/25 DB skip. `HLOG_OBSERVABILITY_PROBES_SMOKE=1 npm run test:observability:probes`: 1/1. `HLOG_OBSERVABILITY_FULL_INTEGRATION=1` 옵션으로 새 disposable cluster에서 전체 `npm run test:integration`도 통과했다. `HLOG_OBSERVABILITY_SMOKE=1 npm run test:observability:stack`: 인증/ingress/재생성 회귀 1/1. lint/typecheck/build·문서 JSON/link/registry·diff 검증 통과.

초기 test 전용 scrape interval이 timeout보다 짧은 설정과 split YAML root 형식 오류는 promtool로 발견해 수정했다. Turbopack의 기존 생성 cache/helper에서 child process 연결 오류가 발생했다. 해당 산출물만 Git 제외 build 경로에 보관하고 새 cache로 production build가 통과했으며 기존 thumbnail tracing 경고 2개는 그대로다. 보관 파일이 lint에 포함된 문제도 기존 build 제외 경로로 정리한 뒤 검증했다. 공개 UI 수정이 없어 화면 검수는 반복하지 않았다. 검증용 project/volume/secret/certificate는 삭제했고 기존 .tmp/와 앱 자원은 유지했다.

모니터링은 **3 completed / 4 pending / 1 blocked**, 다음은 **Step 3: durable-publishing-signals**다. 현재 기본 HTTP 대상의 실제 network 연결, 운영 DB role/password/권한 회수 영향과 실제 disk/HTTPS origin/CA는 Step 7 검수다. OCI·운영 DB·외부 알림·provider·실제 발행·timer는 실행하지 않았다.
