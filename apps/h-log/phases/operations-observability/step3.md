# Step 3: durable-publishing-signals

## 개선 사항과 선행 조건

Steps 0–2 완료 후 자동 발행의 누락·실패·정체·비용을 실제 데이터에서 수집한다. Production behavior 변경은 TDD로 진행한다.

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
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/operations-observability/step2.md`
- `apps/h-log/compose.observability-probes.yaml`
- `apps/h-log/deploy/observability/README.md`
- `apps/h-log/deploy/observability/database-roles.sql`
- `apps/h-log/deploy/observability/probes/host-db-http.yml`
- `apps/h-log/lib/observability-collector.ts`
- `apps/h-log/lib/observability-collector.test.ts`
- `apps/h-log/scripts/observability-collector.mjs`
- `apps/h-log/scripts/observability-probes.test.mjs`
- `apps/h-log/lib/blog-auto-publish-cycle.ts`
- `apps/h-log/lib/blog-auto-publish-cycle.test.ts`
- `apps/h-log/lib/blog-auto-publish-runner.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-usage-ledger.ts`
- `apps/h-log/scripts/blog-auto-publish-cycle.mjs`
- `apps/h-log/deploy/systemd/hlog-auto-publish.service`
- `apps/h-log/deploy/systemd/hlog-auto-publish.timer`
- `apps/h-log/migrations/001_blog_core.sql`
- `apps/h-log/migrations/002_publish_job_leases.sql`
- `apps/h-log/package.json`

## 작업

1. Step 0에서 결정한 지표 contract를 구현한다. 기존 publish_jobs/usage_events의 bounded aggregate 조회를 재사용하고 read-only collector를 장기 실행 scrape 경로에 연결한다. 원문 aggregate 전체를 읽어 지표를 만들지 않는다.
2. 상태별 작업 수, 가장 오래된 대기, lease 만료, UTC 일/월 사용량·budget 차단과 collector freshness를 제공한다. 수집 실패/unknown 비용은 0이나 최신 성공으로 꾸미지 않는다.
3. 필요한 최소 cycle 결과만 process 밖에 지속한다. 시작·완료·마지막 성공·실패 단계·scheduler 기대 상태를 구분하고 preflight 실패·kill·기록 실패도 누락 또는 stale로 드러나게 한다. 중복 skip/idle이 last_success를 갱신하지 않게 한다.
4. last_success는 해당 실행의 required 공개 검증이 끝난 경우에만 갱신한다. monitoring 기록 실패로 자동 발행을 retry하거나 공개 상태를 바꾸지 않고 별도 collector 오류로 관측한다.
5. labels는 고정된 state/job_type/stage 등으로 제한한다. post/run ID, slug, 검색어, 본문, 원문 오류, IP, provider credential을 출력하지 않는다.

## 인수 기준

DB commit 전 generation/auth 실패, required 검증 실패, 미실행, 최초 성공 없음, 재기동, duplicate skip과 정상 공개 검증을 구분한다. DB/cycle 의미·privacy·budget/publication behavior가 유지된다.

## 검증

1. 가까운 focused test에서 RED를 확인한 뒤 같은 test의 GREEN을 확인한다. clock 고정으로 날짜/활성화/누락 경계를 검증한다.
2. 격리 DB와 fake provider로 실제 scrape까지 연결하고 재기동·수집 실패·금지 label 검사를 수행한다.
3. npm run test, npm run test:integration, npm run lint, npm run typecheck, npm run build와 git diff --check를 실행한다.
4. 이 phase의 index와 현재 step에 실제 결과·command·남은 결정·다음 step을 기록한다. 상세 공통 gate는 OBSERVABILITY_PLAN을 따른다.

## 하지 말 것

- 프로세스 메모리만으로 batch 성공/실패를 기록하지 말 것. one-shot 종료 후 수집기가 읽을 수 없다.
- 범용 event/history 모델을 복원하거나 monitoring 장애로 LLM 재호출을 유발하지 말 것. 기존 발행 책임과 비용 경계를 유지한다.
- 민감 본문·credential·내부 URL/IP를 metric/label/로그/알림/커밋에 넣지 말 것. 운영 데이터도 공개 저장소의 privacy 경계를 따른다.
- Discord 스타일과 레이더 전체 영역을 변경하지 말 것. 이번 phase는 비공개 운영 모니터링 범위다.
- OCI·DNS/TLS·운영 timer·실제 provider·외부 알림 전송을 실행하지 말 것. 현재 사용자 보류와 로컬 검증 범위를 유지한다.

## Step 0 확정 계약 인계 — 구현 완료

DB 독립 host atomic JSON summary와 ExecStartPre/ExecStopPost, 현재 버전 required 6종의 실제 성공 증거를 구현한다. 최초 enqueued_at/cost_basis·unknown/zero/unlimited·09:00 KST/UTC 경계를 보존한다. Migration 번호는 당시 다음 빈 번호로 할당한다. [지표·권한·자원·예정 파일과 명령](../../.codex/docs/harness/OBSERVABILITY_PLAN.md)을 기준으로 하며 아래 완료 기록이 이 계약의 실제 검증 결과다.

## 완료 — 2026-10-28

2026-10-28 모니터링 Step 3 완료: migration 012의 최초 대기 시각·비용 근거, 현재 버전의 읽기 전용 집계, DB 밖 atomic 실행 기록과 선택형 systemd hook을 구현했다. 이번 실행의 공개 버전·필수 6종·본문 hash를 확인한 경우만 성공으로 기록한다. 가짜 provider부터 실제 worker·host helper·Prometheus까지 연결하고 중복/재생성/손상/DB 중단을 검증했다. 단위 268 pass/26 DB skip, 전체 DB integration, Linux state 8개·파일 6개, lint/typecheck/build 통과. 모니터링 completed 4·pending 3·blocked 1이며 다음은 **operations-observability Step 4: backup-and-restore-signals**다. 관리자 14·2·1과 OCI·실제 provider·발행·timer 보류는 유지한다.

- Migration 012: 이전 enqueue/cost basis는 NULL로 보존하고 새 insert만 시각을 기록한다. UTC 비용 index와 provider의 명시적 included 근거를 유지한다.
- 제한된 collector role은 세 집계 view만 읽는다. 현재 버전/처리 가능 상태, unknown age/cost, zero/unlimited/invalid budget과 lease 만료를 구분한다.
- Host Python 기록은 DB/Docker 없이 작동하고 파일 lock/fsync/atomic replace를 사용한다. 늦은 종료·중복·수동 성공이 예정 slot을 덮어쓰지 않는다. 선택형 hook과 mount는 [runbook](../../deploy/observability/README.md)에 있다.
- RED: costBasis 유실, 최초 enqueue 컬럼 부재, source collector 부재, 현재 버전 증거/집계 view 부재, summary helper 부재, FIFO 정지/공유 그룹 미설정, expectation 누락 시 시작 기록 실패, evidence 파일 부재와 mistyped timestamp를 각각 재현한 뒤 GREEN을 확인했다.
- 검증: npm run test(268 pass/26 DB skip), npm run test:integration 전체 통과, test:observability:publishing(3/3), test:observability:state(Linux 8 cases), Linux cycle/file(6/6), publishing 확장 test:observability:probes(1/1, 약 179초), lint/typecheck/build와 git diff --check.
- 실제 SQL: 10,000 usage/2,000 current-job EXPLAIN ANALYZE BUFFERS가 3초 제한 내 완료. usage 시간 index 사용, Q1 신규 index 없음. 본문 SELECT/쓰기 권한 거부, 3초 취소, 60초 수집·180초 stale 정책 확인.
- Smoke: fake provider 1회 → 실제 generation/worker/필수 adapter 6종 → host summary → read-only collector → Prometheus. 중복 성공 시각 보존, 컨테이너 재생성, 손상 파일 invalid/series 생략, DB 중단 중 file source 유지, label/log 제한 확인.
- 빌드 중 Windows Turbopack 생성 캐시 오류가 있어 해당 생성물만 ignored build 폴더로 옮기고 재검증했다. 기존 thumbnail tracing 경고 2개는 남아 있다. 새 TypeScript/lint 오류는 없다.
- 다음: Step 4 backup-and-restore-signals. Step 6에서 장기 자원/잔여 임시 파일 복구, Step 7에서 실제 host Python/systemd·권한·운영 적용을 검수한다. 운영 배포·migration·timer·실제 provider·외부 알림은 실행하지 않았다.
