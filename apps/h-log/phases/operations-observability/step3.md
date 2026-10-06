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
