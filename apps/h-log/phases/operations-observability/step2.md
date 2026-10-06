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
