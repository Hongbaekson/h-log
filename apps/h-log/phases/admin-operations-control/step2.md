# Step 2: monitoring-overview

## 상태와 선행 조건

상태: completed — 2026-11-02 소유자 전용 모니터링 요약 구현과 로컬 검수 완료. 선행 [모니터링 Step 6](../operations-observability/step6.md)의 기존 신호를 소비한다. 다음은 A3 Step 3이며 모니터링 Step 7/실제 timer는 이번 로컬 구현의 선행 조건이 아니다.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step에서 추가한 실제 인증/정책/요청/조회 파일도 그 완료 기록을 따라 읽는다. 아래 목록은 등록 시 존재하는 파일이다.

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
- `apps/h-log/.codex/docs/harness/ADMIN_CONSOLE_PLAN.md`
- `plans/automated-blog-publishing-plan.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/admin-operations-control/index.json`
- `apps/h-log/phases/admin-operations-control/step1.md`
- `apps/h-log/lib/blog-job-retry.ts`
- `apps/h-log/lib/blog-job-retry.integration.test.ts`
- `apps/h-log/migrations/011_publish_job_admin_id.sql`
- `apps/h-log/phases/admin-operations-control/step1.md`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`
- `apps/h-log/phases/operations-observability/index.json`
- `apps/h-log/phases/operations-observability/step3.md`
- `apps/h-log/phases/operations-observability/step5.md`
- `apps/h-log/phases/operations-observability/step6.md`
- `apps/h-log/lib/blog-usage-ledger.ts`
- `apps/h-log/lib/blog-auto-publish-cycle.ts`

## 작업

1. 선행 모니터링 phase에서 실제 생성한 collector/read model/dashboard 파일을 먼저 확인한다. 관리자 개요/monitoring에서 서비스·scheduler 비활성·최근 attempt와 required 검증 성공·비용·백업/복구 시각을 읽는다.
2. 미수집/stale/error/disabled/never succeeded를 실제 정상/0과 구분한다. 초기 구현은 수동 새로고침 또는 제한된 주기의 조회로 충분하며 SSE나 새 신호 저장소를 만들지 않는다.
3. 비공개 Grafana로 인증된 진입 안내를 제공한다. 공개 iframe/anonymous sharing/service token 전달 없이 기존 접근 정책을 유지하고 모니터링 실패가 발행 상태/재시도를 바꾸지 않게 한다.

## 인수 기준

기존 모니터링 값과 관리자 요약의 단위·시각·성공 의미가 일치한다. 수집 중단/연결 미설정은 정상으로 보이지 않고 운영 토큰/metrics가 공개되지 않는다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 로컬 실제 수집과 collector 중단·stale·DB 오류·never succeeded를 재현해 화면/경보 원본을 대조한다.
2. 익명 접근·직접 API·캐시·1440/390/320px·키보드 및 공개 route 비노출을 확인한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 구현 결과 — 2026-11-02

- `app/admin/monitoring/page.tsx`, `monitoring.css`: 서비스/수집 상태, 예정 스케줄, 최근 시도와 검증 성공, 비용, 원본 수집 시각을 표시한다. 공통 탐색과 개요에 실제 진입 링크를 연결했다.
- `lib/admin-monitoring-server.ts`는 데이터 조회 전에 소유자를 확인한다. Proxy/page 인증과 HTML/RSC의 no-store/noindex를 유지한다. 별도 API·쓰기·새 schema는 없다.
- `lib/admin-monitoring.ts`는 허용된 서버 origin에 고정 PromQL만 요청한다. 전체 3초, query 2초, 128 KiB/512행, redirect 거부를 적용한다. 180초 range와 현재 instant series의 교집합으로 지표 이름과 stale marker 의미를 보존한다. 원시 label/주소/query/error를 DTO로 전달하지 않는다.
- 수집기 중단/source 오류·누락·stale에는 과거 업무 값을 감춘다. 유효한 summary의 성공 시각 0만 성공 이력 없음이다. 예정 스케줄과 실제 timer/worker, 최근 attempt와 required 6종 검증 성공, UTC 비용과 미확인/구독 기록을 구분한다.
- Grafana는 고정 localhost 터널 링크와 별도 계정 로그인 안내만 제공한다. 수동 재조회와 기존 3분 경과 안내를 재사용한다. 연결 설정과 재현 명령은 [관리자 모니터링 runbook](../../deploy/observability/admin-monitoring.md)에 둔다.

## 검증 결과

1. RED: 신규 projection import 부재와 인증된 페이지 404를 확인했다. 실제 Prometheus에서 timestamp 연산의 이름 소실/동일 labelset 충돌을 발견했고 range query로 수정했다. 추가 stale marker 회귀는 과거 up=1이 되살아나는 RED 후 현재 series 교집합으로 GREEN을 확인했다.
2. `node --no-warnings --experimental-strip-types --test lib/admin-monitoring.test.ts`: 7/7. 누락·중단·오류·stale·중복/비정상 값·비용·정비와 HTTP 크기/redirect 경계를 확인했다.
3. `HLOG_OBSERVABILITY_RULES_TEST=1 npm run test:admin:monitoring:promql`: 실제 고정 Prometheus image의 promtool 1/1. 이름 보존, 179/180초 경계, 명시적 stale marker를 검증했다.
4. `HLOG_ADMIN_MONITORING_HTTP_TEST=1 HLOG_OBSERVABILITY_PROBES_SMOKE=1 HLOG_OBSERVABILITY_PUBLISHING_SMOKE=1 npm run test:observability:probes`: 최종 query로 1/1. 격리 fake provider·실제 required worker·collector·Prometheus의 정상, 성공 이력 없음, summary 손상, 실제 DB/collector 중단을 DTO와 Next HTML/RSC에 대조했다. stale 수집 시각은 명시적 timestamp fixture이며 실제 시간 경과 재현과 구분한다. 생성한 시험 stack은 자동 정리했다.
5. `HLOG_ADMIN_HTTP_TEST=1 npm run test:admin:monitoring:http`: dev 미설정 1/1, 최종 production build의 로컬 HTTPS ingress 1/1. 익명/잘못된 인증/RSC 401, 위조 Host 403, owned HTML/RSC 200와 no-store/noindex, 직접 API 404, 공개 홈 비노출을 확인했다. 임시 인증서만 신뢰했고 TLS 검증은 해제하지 않았다.
6. `npm run test`: 303개 중 277 pass/26 DB skip/0 fail. `npm run typecheck`와 `npm run build` 통과. 기존 thumbnail tracing warning 2건 유지. `npm run lint`는 기존 Git 제외 private CJS helper의 no-require-imports 오류 10건으로 실패했고 `node node_modules/eslint/bin/eslint.js . --ignore-pattern 'private/**'`는 통과했다. 기존 helper와 lint 설정은 변경하지 않았다.
7. 개발 서버 1440/390/320px, 가로 넘침 없음, 키보드 재조회/접기·focus, no-JS 읽기, Grafana 링크의 별도 로그인/Referer 미전달을 검수했다. 실제 격리 snapshot 기반 화면 replay로 DB 오류·수집기 중단·잘못된 summary·stale·query 오류를 확인했고 합성 브라우저 시계로 조회 3분 경과 안내도 확인했다. 근거는 Git 제외 `private/admin-monitoring`에 보관한다.
8. phase JSON 상태/개수·상대 링크·문서 동기화와 `git diff --check` 확인. 관리자 15 completed / 1 pending / 1 blocked, 모니터링 7 / 0 / 1이다.

## 남은 경계

기존 producer·DB/worker·공개 route·Compose를 변경하지 않았다. 운영 앱의 비공개 모니터링 network 연결과 server env 반영은 승인된 rollout에 남는다. 실제 운영 자격증명·외부 수신처·provider·공개 발행·timer를 사용하지 않았다. 전체 관리자 host/기능/복구 종합 검수는 다음 Step 3이며 이번 소규모 HTTPS 검사로 대체하지 않는다.

## 다음 단계

A3 Step 3 local-admin-release-rehearsal. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
