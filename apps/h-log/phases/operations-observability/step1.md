# Step 1: private-metrics-stack

## 개선 사항과 선행 조건

Step 0 완료 후 Prometheus와 Grafana의 격리 로컬 실행 기반만 만든다. 호스트/DB exporter와 업무 지표는 후속 step에서 연결한다.

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
- `apps/h-log/phases/operations-observability/step0.md`
- `apps/h-log/compose.yaml`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`

## 작업

1. Step 0에서 확정한 선택형 Compose 구성과 deploy/observability 디렉터리를 만든다. 앱의 기본 compose 실행에 모니터링이 자동 포함되지 않게 하고 별도 project/volume으로 local smoke를 진행한다.
2. 공식 이미지의 지원 버전·digest·CPU architecture를 확인하고 pin 근거를 기록한다. credential 없는 예시만 커밋하며 Grafana 관리자 secret은 저장소 밖 local secret으로 주입한다.
3. Prometheus self-scrape와 Grafana datasource를 provisioning한다. Grafana는 충돌 없는 localhost 포트에만 바인딩하고 익명 접근을 끈다. exporter/DB/Prometheus ingress를 공개하지 않는다.
4. 서비스별 자원 제한, retention, log rotation, volume 소유권과 read-only config를 적용한다. 재기동 시 datasource와 history가 유지되는지 확인한다.

## 인수 기준

구성 검증·기동·self-scrape·Grafana datasource·재기동 보존이 통과한다. 외부 비인가 접근과 public Nginx metrics 경로가 차단되고 기존 앱의 기본 Compose 구성이 유지된다.

## 검증

1. 선택형/기본 Compose 각각 docker compose ... config --quiet와 promtool check config를 실행한다. 정확한 인자는 완료 기록에 남긴다.
2. 격리 로컬 기동 후 readiness·self up·datasource 조회·재기동·localhost binding·익명 접근 차단을 확인한다.
3. 추가된 JSON/YAML과 git diff --check를 검증한다. 정리는 이번 격리 project 자원만 대상으로 한다.
4. 이 phase의 index와 현재 step에 실제 결과·command·남은 결정·다음 step을 기록한다. 상세 공통 gate는 OBSERVABILITY_PLAN을 따른다.

## 하지 말 것

- latest tag나 실제 password/webhook을 커밋하지 말 것. 재현성과 비밀 경계를 지켜야 한다.
- production Compose 재시작이나 기존 DB volume 정리를 하지 말 것. 이번 범위는 로컬 수집 기반이다.
- 민감 본문·credential·내부 URL/IP를 metric/label/로그/알림/커밋에 넣지 말 것. 운영 데이터도 공개 저장소의 privacy 경계를 따른다.
- Discord 스타일과 레이더 전체 영역을 변경하지 말 것. 이번 phase는 비공개 운영 모니터링 범위다.
- OCI·DNS/TLS·운영 timer·실제 provider·외부 알림 전송을 실행하지 말 것. 현재 사용자 보류와 로컬 검증 범위를 유지한다.

## Step 0 확정 계약 인계 — 구현 시 사용한 기준

선택형 compose·서비스별 limit·7d/1GB retention·로그 rotation과 비공개 network/loopback을 적용한다. 예정 파일·명령은 단일 계약의 인계 표를 따른다. 새 서비스 설치는 이 step부터다. [지표·권한·자원·예정 파일과 명령](../../.codex/docs/harness/OBSERVABILITY_PLAN.md)을 기준으로 하며 이번 인계 기록은 구현 완료가 아니다.

## 완료 기록 — completed — 2026-10-28

- `compose.observability.yaml`, self-scrape·datasource·gateway 설정, 실행 README와 재현 가능한 `scripts/observability-stack.test.mjs`를 추가했다. 공개 Nginx는 metrics/probe/Prometheus/Grafana 경로를 명시적으로 차단한다. 기본 Compose 서비스/의존성은 변경하지 않았다.
- 공식 Prometheus 3.13.5 LTS/Grafana OSS 12.4.13의 지원 기간, 새 gateway Nginx 1.30.6 stable과 immutable multi-architecture digest, linux/amd64·arm64 manifest를 확인했다. 실제 실행은 Docker Desktop Linux amd64/Engine 29.6.1/Compose 5.2.0이다. Arm64 실행과 OCI 자원 검증은 하지 않았다.
- Docker internal-only network의 host port 미생성 실패를 재현했다. Prometheus/Grafana를 internal로 유지하고 별도 localhost 고정 upstream Nginx gateway를 추가했다. Grafana 예산 320 MiB/0.25 CPU를 304/0.20+gateway 16/0.05로 나누고 로그 예산 30 MiB를 여유에서 배정했다. Nginx read-only root의 기본 temp 경로 오류는 제한된 tmpfs로 수정했다. 전체 1 GiB/1 CPU·3 GiB 예산은 유지한다.
- 파일 secret은 저장소 밖 Windows 현재 사용자 전용 ACL 디렉터리에서 생성했다. 본문/키/DB/운영 자료를 사용하지 않는다. 익명/잘못된 인증은 401, 공개 ingress·local gateway의 금지 경로는 404, 정상 공개 경로는 합성 upstream까지 통과했다. Prometheus/Grafana에 기본 외부 route가 없고 앱 망에서 Prometheus 직접 접근도 실패했다.
- 실제 smoke **1/1**: 기본 설정 deep equality/profile OFF, promtool, readiness·self `up=1`, datasource health/read-only, 주소 없는 저장 label, service별 limit·UID/capability/read-only mount·localhost binding, 새 container ID와 동일 volume·과거 sample·Grafana 저장 자료·datasource 보존을 확인했다. 최종 컨테이너 OOM/restart는 0이다. 임시 빈 dashboard는 검증 후 삭제했다.
- 검증 중 Prometheus flag는 `7d`를 `1w`, `1GB`를 `1GiB`로 정규화했다. Test assertion을 실제 표기에 맞췄다. 초기 테스트의 디렉터리 정리 오류는 rmdir로 수정한 뒤 재검증했다. 짧은 관측값 Prometheus 38.92 MiB, Grafana 110.6 MiB는 부하 peak/장기 예산 검증의 대체물이 아니다. Gateway의 재생성 중 0B 표본은 실측값에서 제외한다.

실행 명령(앱 디렉터리, 외부 secret 경로를 환경값으로 주입):

```powershell
docker compose -p hlog-observe-local -f compose.yaml config --quiet
docker compose -p hlog-observe-local -f compose.yaml -f compose.observability.yaml --profile observability config --quiet
docker compose -p hlog-observe-local -f compose.observability.yaml --profile observability config --quiet
# smoke가 아래 promtool과 선택형 up/force-recreate/down을 실행한다.
docker compose -p hlog-observe-local -f compose.observability.yaml --profile observability run --rm --no-deps --entrypoint promtool prometheus check config /etc/prometheus/prometheus.yml
$env:HLOG_OBSERVABILITY_SMOKE = '1'
node --test scripts/observability-stack.test.mjs
node node_modules/eslint/bin/eslint.js scripts/observability-stack.test.mjs
node private/observability-step1-verify.mjs
git diff --check
```

설정/문서와 테스트 도구만 변경했다. TDD configuration-only 예외를 사전에 알렸고 실제 parser/runtime 검증을 사용했다. 앱 code·DB·worker·UI가 그대로라 npm 전체 unit/integration/build와 화면 검수는 반복하지 않았다. 새 package script는 기존 suite를 바꾸지 않는다. 기존 공개 nginx 이미지의 별도 갱신, host/DB/HTTP 지표·업무 신호·dashboard/알림·24시간 부하·운영 접근은 후속 범위다.

모니터링은 **2 completed / 5 pending / 1 blocked**다. 다음은 **Step 2: host-database-http-probes**이며 모니터링 Steps 2–6 이후 A3 Step 2로 돌아간다. 테스트가 만든 local/debug project와 volume만 정리하고 기존 앱/DB 자원·.tmp/는 유지했다. OCI/DNS/TLS/live migration·provider·실제 PDF·공개 발행·timer·외부 알림은 실행하지 않았다.
