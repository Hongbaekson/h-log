# Step 1 private-performance-signals

## 상태와 선행 조건

pending — 2026-11-06 등록한 F7의 성능 지표와 재생성 상태 관측 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F3 Step 2와 F7 Step 0 완료. 기존 모니터링 로컬 Steps 0–6의 계약을 읽는다.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step에서 추가한 실제 파일·migration·계약도 수정 전에 확인한다.

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
- `apps/h-log/.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/lib/observability-collector.ts`
- `apps/h-log/lib/admin-monitoring.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/scripts/observability-config.mjs`
- `apps/h-log/scripts/observability-collector.mjs`
- `apps/h-log/deploy/observability/prometheus.yml`
- `apps/h-log/deploy/observability/probes/host-db-http.yml`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`

## 범위와 산출물

성능 지표와 재생성 상태 관측을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. route pattern별 요청 시간/오류, pool 대기, 변환 비용, 캐시 hit/miss, rebuild 진행·실패·stale 상태를 측정하는 최소 신호를 정한다. 실제 요청과 synthetic probe의 출처를 분리한다.
2. 고정 label allowlist·histogram bucket·series/저장 예산·관측 overhead를 정하고 기존 비공개 collector/Prometheus/Grafana 경로에 연결한다.
3. 여러 process/instance의 집계 의미, 재시작 후 신호, 계측 실패 때 요청 처리, collector freshness와 보안 경계를 격리 환경에서 검수한다.

## 인수 기준

- latency·pool wait·rebuild failure를 재현하여 지표 변화를 확인한다. query/slug/원문/사용자 ID·token이 label/log에 들어가지 않는다.
- 실제 series 수와 요청 overhead를 비교한다. 기존 allowlist가 새 histogram을 제거하는지 검사하고 설정/생성 dashboard 동기화를 검증한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
npm run test:observability:stack
npm run test:observability:probes
npm run test:observability:publishing
npm run test:admin:monitoring:promql
```

기본 gate를 실행하고 결과를 기록한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

전체 lint에 기존 Git 제외 private helper 오류가 있으면 실패 내역과 source lint를 따로 기록한다. 실패를 숨기거나 무관한 파일을 수정해 통과시키지 않는다.

## 경계

- 원본·과거 버전·공개 선택·검수·감사는 기준 데이터로 보존한다. 재생성 권한은 파생 데이터에 한정한다.
- 현재 published/current-version, Brain published revision, privacy 정책, owner 인증·Origin·command revision/idempotency를 모든 새 읽기/쓰기 경로에서 검증한다.
- 성능 결과에는 fixture·환경·표본 수·cold/warm 조건을 함께 기록한다. 준비 실행·최댓값·소수 표본의 중앙값을 운영 p95로 표시하지 않는다.
- 실험 DB·파일·프로세스는 본 작업이 생성한 대상을 확인한 뒤 정리한다. 운영 적용·실제 콘텐츠 발행·OCI/DNS/TLS·provider·timer·외부 알림은 기존의 명시 승인 절차를 따른다.
- 공개 UI는 승인된 화면/상호작용을 인수 기준으로 사용한다. 질문 데이터는 작성자가 기록한 항목의 계약을 따른다.

## 다음 단계

F7 Step 2 `cold-rebuild-performance-rehearsal`.
