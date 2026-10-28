# Step 0: job-and-audit-inspection

## 상태와 선행 조건

완료 상태: completed — 2026-10-28 로컬 구현·검증 완료. 실제 운영 활성화와 재시도 명령은 포함하지 않는다.

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
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-usage-ledger.ts`
- `apps/h-log/migrations/001_blog_core.sql`
- `apps/h-log/migrations/002_publish_job_leases.sql`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`

- `apps/h-log/.codex/docs/harness/AUTOMATION_POLICY.md`
- `apps/h-log/lib/blog-automation-policy.ts`
- `apps/h-log/lib/blog-automation-runner.ts`
- `apps/h-log/migrations/010_blog_automation_policy.sql`

## 작업

1. 인증된 /admin/jobs와 /admin/audit에 제한된 페이지/필터 조회를 추가한다. 실제 publish_jobs 상태·required/retryable·lease·시도 횟수·안전한 오류 분류, 작업 대상 버전과 현재 공개 버전을 구분한다.
2. 관리자 명령/정책 변경 이력과 기존 usage_events의 비용·한도·unknown을 조회한다. 원문·secret·내부 경로·raw stack trace를 출력하지 않는다.
3. job 없음·worker idle·프로세스 미관측·관측값 stale·DB 오류를 구분한다. 현재 schema에 없는 DLQ/실행 이력/heartbeat를 존재한다고 표시하지 않는다.

## 인수 기준

실제 원장에 기반한 조회가 가능하며 재시도/정책 명령을 실행하지 않는다. 0건/미관측/오류가 구분되고 private 응답은 인증·cache 경계를 지킨다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. queued/running/retrying/failed/succeeded 및 expired lease/unknown 비용/오류 원문 sentinel fixture를 조회한다.
2. 대량 fixture에서 제한된 query/페이지와 1440/390/320px·키보드·오류 화면을 검증한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A3 Step 1 bounded-retry-and-pause. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## A2 Step 3 인계

정책 변경/일일 admission은 admin_actions, 초안/worker admission revision은 각 원장에 있다. 실제 0건·정책 차단·만료 lease·불명확 결과·프로세스 미관측을 구분한다. 보호 경로와 unknown 자동 재호출 금지를 보존한다.

## 작업·감사 조회 구현 — 2026-10-28

- 변경: `app/admin/jobs/page.tsx`, `app/admin/audit/page.tsx`, `app/admin/operations.css`, `components/admin/AdminOperations.tsx`, `AdminObservation.tsx`, 기존 개요/메뉴, `lib/blog-admin-operations.ts`, `blog-admin-operations-server.ts`, `admin-observation.ts`와 단위/통합/HTTP 검증. `package.json`의 전체 integration chain에도 조회 테스트를 추가했다.
- page/DAL의 owner 확인과 기존 Host/Basic/cache 경계를 재사용한다. PostgreSQL read-only repeatable-read, 최대 21행 조회/20행 반환, 1~10,000 페이지와 허용 필터, statement 3초 제한이다. SQL은 원문·raw error·actor/target 원시 식별자를 반환하지 않는다. 오류/사유는 존재 여부만 표시하고 정책 receipt는 revision/boolean만 투영한다.
- 작업별 최신 상태·필수/후속 구분·기록된 retry_count·대상 버전/hash·현재/공개 버전·admission revision·lease를 표시한다. 총 시도 횟수/최초 enqueue/실행별 이력/DLQ/heartbeat를 만들어 내지 않는다. finished_at은 기존 실행 기준 시각이므로 정확한 완료 시각/소요 시간으로 사용하지 않는다.
- 사용량은 기존 guard와 같은 UTC 일/월 경계 및 미래 제외 합계다. NULL 금액은 합계 제외+미상 건수, 현재 cost_basis 부재는 모든 행의 근거 미기록으로 표시한다. 기록 없음·알려진 0·무제한·0 한도·유효 한도·잘못된 한도를 구분한다. 원장에 없는 호출 비용이나 무료/구독 포함 여부를 추정하지 않는다.
- 워커 프로세스/idle은 미관측이다. 조회 시각부터 180초가 지난 화면은 오래된 값으로 바뀌며 자동 재조회하지 않는다. DB 오류를 0건으로 바꾸거나 이전 성공값으로 대체하지 않는다. 필터와 페이지 링크는 native GET이다.

검증:

1. RED: `node --no-warnings --experimental-strip-types --test lib/blog-admin-operations.test.ts lib/blog-admin-operations.integration.test.ts`에서 미구현 모듈 실패 확인. 조회 함수 구현 후 단위 3/3, 격리 DB 1/1 GREEN. UI는 `node --test scripts/blog-admin-operations.http.test.mjs`의 owner GET 404→200으로 RED/GREEN 확인.
2. 5개 작업 상태·이전/현재/철회 버전·만료 lease·raw error/본문/사유/receipt sentinel·정책 revision·NULL/0 비용·미래/이전 월 제외·0/무제한/무효 한도를 확인했다. 작업/감사 각각 3,000건을 추가해 20건 제한과 페이지 중복 없음, 읽기 전후 원장 보존, DB 오류 거부를 검증했다.
3. `npm run test`: 279개 중 255 pass/24 DB skip. `DATABASE_URL=<isolated-local> npm run test:integration`: 26/26. `npm run lint`, `npm run typecheck`, `npm run build` 통과. 기존 thumbnail tracing 경고 2개는 남아 있다.
4. 개발 서버 3043의 조회 HTTP 1/1. production build 3048 + public 3049/admin HTTPS 3050에서 `node --test scripts/admin-owner.http.test.mjs scripts/blog-admin-operations.http.test.mjs`: 5/5. 익명 401/공개 origin 404, HTML/RSC/prefetch private/no-store와 비노출을 확인했다. 기존 테스트 인증서 만료와 합성 published fixture의 hash/origin 준비 오류는 로컬 fixture만 바로잡아 재검증했다. TLS 검증은 해제하지 않았다.
5. 개발 서버 1440/390/320px, 가로 넘침 없음, 키보드 필터/초점/상세 열기, 페이지 이동, 0건, 테이블 일시 숨김의 DB 오류/복구, 실제 3분 경과 stale 표시를 검수했다. 새 collector·migration·provider·timer·운영 설정은 추가하지 않았다. 검수 서버/프록시/컨테이너/탭은 종료했다.

한계와 다음 작업: OFFSET 상한/timeout을 둔 개인 규모 조회다. 더 큰 원장에서 지연이 확인되면 keyset/index를 추가한다. 표시용 hash 참조는 명령 인증 수단이 아니다. Step 1에서 명시적 대상 선택·재시도 상한·버전/lease 검증·사유·감사·기존 정책 pause 경계를 구현한다.
