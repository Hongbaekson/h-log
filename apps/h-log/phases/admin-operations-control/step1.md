# Step 1: bounded-retry-and-pause

## 상태와 선행 조건

완료 상태: completed — 2026-10-28 로컬 구현·검증 완료. 실제 provider/운영 활성화는 포함하지 않는다.

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
- `apps/h-log/phases/admin-operations-control/step0.md`
- `apps/h-log/lib/blog-admin-operations.ts`
- `apps/h-log/lib/blog-admin-operations-server.ts`
- `apps/h-log/lib/blog-admin-operations.integration.test.ts`
- `apps/h-log/app/admin/jobs/page.tsx`
- `apps/h-log/lib/blog-automation-policy.ts`
- `apps/h-log/.codex/docs/harness/AUTOMATION_POLICY.md`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-persistent-worker.integration.test.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/migrations/002_publish_job_leases.sql`
- `apps/h-log/scripts/blog-worker.mjs`

## 작업

1. 허용된 failed 작업 한 건의 명시적 재시도를 추가한다. required/retryable의 post 상태 복구 조건, 버전/hash·원인 확인·사유·재시도 상한·감사를 정의하고 기존 처리 함수를 재사용한다.
2. 현재 lease·이미 성공한 작업·철회 글·오래된 버전·중복 요청을 차단한다. retry_count 이력을 0으로 되돌리거나 임의 job을 새로 만들어 한도를 우회하지 않는다.
3. A2의 정책으로 새 claim을 pause/resume하고 running 작업은 끝내거나 기존 lease 복구 규칙을 따른다. 중지의 적용 경계를 worker transaction으로 검증하며 프로세스 강제 종료와 혼동하지 않는다.

## 인수 기준

재시도 하나가 하나의 허용된 상태 전이/감사로 수렴하고 동시 worker와 충돌해 중복 공개/외부 호출을 만들지 않는다. pause 중 신규 claim은 없고 진행 중/재개 결과를 설명할 수 있다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 더블 클릭·두 worker·lease 만료·재시도 상한·철회 경합·pause와 claim 경합·재시작을 격리 DB에서 검증한다.
2. 실제 broker/DLQ나 shell/systemctl/docker 경로가 생기지 않았는지 diff를 검토한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

operations-observability Steps 1–6, 이후 A3 Step 2. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## A3 Step 0 인계

작업/감사 조회는 완료했으며 표시용 식별자는 원시 ID의 요약 hash다. 명령용 인증/대상 식별자로 간주하지 않는다. 기존 조회의 raw 오류·사유 비노출, unknown/미관측/stale 구분과 원장 보존을 유지한다. A2가 구현한 새 작업 정책과 공개 후 보호 경로를 재사용하며, 운영 rollout/모니터링 선행 순서는 바꾸지 않는다.

## 제한된 재시도·일시정지 구현 — 2026-10-28

변경 파일: `lib/blog-job-retry.ts`, `blog-job-retry-http.ts`와 세 테스트, `app/admin/jobs/retry/route.ts`, `components/admin/JobRetryForm.tsx`, 기존 작업 조회/DAL/화면·정책 폼/개요·CSS, `migrations/011_publish_job_admin_id.sql`, migration/공통 owner HTTP/새 retry HTTP 테스트와 package 검증 chain.

- migration 011은 legacy text ID를 공개하지 않는 unique UUID `publish_jobs.admin_id`를 추가한다. 신규/기존 행에 DB가 생성하며 기존 job ID·idempotency key·내용·상태를 바꾸지 않는다. UUID 자체가 인증은 아니며 기존 owner/Host/Origin 경계가 선행한다. 화면 참조 hash와 감사 대상은 이 UUID를 기준으로 연결한다.
- POST는 4 KiB/10초, UUID/정확한 필드·확인 체크·400자 사유를 검증한다. 사유의 개인정보/내부 주소는 거부하고 raw error는 반환하지 않는다. page/DAL/HTTP owner 검사, private/no-store와 기존 공개 origin 차단을 재사용한다.
- 감사 명령 예약 → 정책 row → post row → job NOWAIT 순서다. 명령 UUID+fingerprint의 중복은 같은 receipt로 수렴하며 다른 내용은 409다. worker 완료와 post/job 잠금이 역전될 때는 기다리지 않고 안전한 충돌로 거부한다. 새 명령의 상태 불일치/상한/버전·canonical hash/lease/정책 거부는 감사와 변경 모두 rollback한다. 재시작·응답 유실 후 같은 명령을 확인할 수 있다.
- 허용 범위: 필수 `render/privacy_scan`은 failed_publish→publishing, failed_verification→verifying 또는 이미 진행 중인 같은 비공개 발행 흐름만 복구한다. 유효한 다른 실행 lease가 있으면 거부한다. 후속 `search_index/related_posts/llms/feed/og`는 현재 published 버전만 허용한다. 공개 후 검증 실패/correction_pending·철회/비공개 해제·이전 버전·외부 알림/유료·불명확 작업은 직접 재시도하지 않는다. 수정본 검토 또는 운영 확인을 안내한다.
- failed 한 건만 queued로 바꾸고 retry_count를 1회 소비한다. 기존 worker의 상수 3을 공유하고 3 이상은 거부한다. 자동 실패에 쓰던 횟수도 유지하며 초기화/새 job 생성은 없다. 과거 오류는 보존하고 lease/시작/종료 필드만 해제한다. 명령 접수는 실행 성공이나 공개 성공이 아니다.
- 중지·재개는 새 토글 저장소 없이 `AutomationPolicyForm`의 jobs-only 표시와 기존 명령을 사용한다. 숨긴 generation/publication 요청값을 보존하며 revision 충돌을 검사한다. 진행 중 실행은 완료될 수 있고, 공개 후 보호/철회는 중지 중에도 유지된다. unknown 생성 요청을 자동 재호출하지 않는다.

검증: 핵심/HTTP 모듈 미구현 RED 후 focused GREEN. migration 011 추가로 기존 버전 assertion RED를 확인하고 적용/재실행 검증을 갱신했다. 중복 명령·다른 명령의 경합·두 worker·재시작·반복 실패의 상한·만료/유효 lease·job 잠금·원문/hash 변경·이전 버전·철회 경합·감사 실패 rollback·정책 OFF/서버 OFF/재개를 격리 DB에서 검증했다. 기존 worker 통합 검증의 admission/공개 직전 pause 및 policy 오류 시 공개 보호도 통과했다.

`npm run test`: 282개 중 257 pass/25 DB skip. `DATABASE_URL=<isolated-local> npm run test:integration`: 27/27. lint/typecheck/build·diff check 통과. 개발 3043에서 재시도 HTTP 1/1, 최종 production 3048/public 3049/admin HTTPS 3050에서 owner/조회/재시도 HTTP 6/6. TLS 검증을 유지했다. 기본 Turbopack dev에서 반복 HMR을 관측해 공식 `next dev --webpack` 3046으로 UI를 검수했다. production Turbopack build는 통과했고 기존 thumbnail tracing 경고 2개가 남는다.

1440/390/320px에서 입력/체크/초점·줄바꿈·가로 넘침 없음, 중지 저장→재시도 거부 안내→재개→한 건 queued/횟수 증가를 확인했다. screenshot은 로컬 합성 데이터다. provider/worker 외부 adapter·실제 공개·운영 migration/설정은 실행하지 않았고 검수용 서버·프록시·컨테이너를 종료했다. 다음은 operations-observability Step 1이다.
