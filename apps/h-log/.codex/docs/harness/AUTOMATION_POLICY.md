# 블로그 자동화 정책

2026-10-28 A2 Step 3 로컬 구현 계약. [관리자 명령 경계](ADMIN_ACCESS_CONTRACT.md)와 [초안 요청](DRAFT_GENERATION_REQUESTS.md)을 함께 따른다.

## 저장과 화면

migration 010의 singleton blog_automation_policy는 generation/publication/jobs를 각각 false, revision을 0으로 시작한다. /admin/automation/policy POST는 owner/Host/Origin 인증 뒤 JSON 4 KiB/10초, UUID·예상 revision·세 boolean·사유를 검사한다. 정책 row 잠금과 변경/감사 receipt는 같은 transaction이다. 같은 명령은 원래 receipt, 다른 입력의 키 재사용과 오래된 revision은 409다. 감사 실패는 변경도 rollback한다. DB 오류는 원문 없이 503이다.

화면은 저장된 설정과 서버 상한을 적용한 실제 허용, 차단 이유, 조회 시각을 구분한다. 진행 중 초안·worker lease·일일 실행 예약을 종류별 최대 20개(오래된 예약부터) 보여 주며 허용 revision/시각, 만료/확인 필요를 표시한다. 예약이 존재한다는 사실로 프로세스 생존을 추정하지 않는다. 타이머/프로세스 상태는 미관측이며 A3/observability에서 연결한다. 새로고침으로 상태를 읽고 polling은 없다.

## 서버 상한

| 환경값 | 범위 | 기본값 |
| --- | --- | --- |
| HLOG_BLOG_DRAFT_GENERATION_ENABLED | 수동 초안 접수/소비 및 일일 provider 호출 | OFF |
| HLOG_BLOG_AUTO_PUBLISH_ENABLED | 일일 결과의 publishing 진입과 자동 공개 전이 | OFF |
| HLOG_BLOG_JOBS_ENABLED | 새 생성·비공개 발행·선택 후처리 admission | OFF |
| HLOG_BLOG_MANUAL_PUBLISH_ENABLED | 검토한 admin 버전의 수동 발행 | OFF |

각 값은 정확히 1일 때만 상한을 연다. DB에서 ON이어도 상한이 OFF면 실행하지 않는다. generation/publication의 실제 허용은 jobs 허용도 필요하다. 웹과 실행자 환경을 함께 준비해야 하며 화면의 effective는 해당 웹 서버 기준이다. 각 실행자가 자신의 상한을 다시 읽는다. 환경값/credential/timer를 웹에서 변경하지 않는다. Compose mount/환경 전달과 운영 활성화는 후속 승인 범위다.

수동/일일 생성 모두 HLOG_DAILY_ESTIMATED_COST_LIMIT와 HLOG_MONTHLY_ESTIMATED_COST_LIMIT가 유한한 비음수여야 한다. 기존 UTC 일/월 ledger·사전/응답 후 한도 검사를 재사용하며 호출별 최대 과금 보장은 아니다. 실제 provider를 호출하지 않고 fake provider로 검증했다. 같은 날짜의 알려진 품질 실패를 다시 실행하면 각 admission UUID를 LLM usage event ID에 포함해 매 호출 비용을 기록한다. 날짜별 고정 ID 중복으로 두 번째 호출 비용이 빠지던 경로를 RED/GREEN으로 보완했다.

## 실행과 중지

1. 초안 접수와 provider 직전, worker의 새 lease claim은 정책 row를 잠그는 짧은 transaction에서 허용을 확인한다. 요청/lease에 policy_revision과 시작 시각을 함께 기록한다. 일일 호출은 기존 admin_actions에 automation_admitted/system/daily-runner 예약을 남긴다. 같은 row를 잠그는 정책 변경보다 나중에 admission한 일반 작업은 시작하지 않는다. 먼저 예약한 호출은 중지 이후 시작/완료할 수 있으며 외부 호출 중 DB row lock을 잡지 않는다.
2. daily와 manual은 기존 공통 generation advisory lock을 공유하고 daily의 Seoul 날짜 lock/postId를 유지한다. 보류/정책 오류 및 생성 입력 파일 미설정에서도 중지된 실행은 daily postId를 반환해 기존 공개 검증 cycle이 진행할 수 있다. unknown manual/daily 실행이 있으면 새 유료 생성은 보류한다. 일일 프로세스 유실 시 남은 running 예약도 확인 전 재호출하지 않는다.
3. 수동 요청 결과는 항상 drafted/작업 0개다. 일일 결과는 현재 generation/publication/jobs가 모두 유효할 때만 publishing/required 6종을 저장한다. 자동 공개 OFF나 처리 중 중지는 private 초안으로 남긴다. 모든 기존 freshness/context/claim/privacy/quality gate는 유지하며 auto ON이 품질 gate를 건너뛰지 않는다.
4. worker는 public 전이 직전에 정책을 다시 잠그고 검사한다. 중지됐으면 완료 직전 check를 queued로 돌려 재개 시 다시 검사한다. posts.publication_mode는 automatic/manual을 구분한다. 수동 발행은 특정 admin 버전/hash 검토와 별도 서버 상한으로 허용하며 자동 공개 OFF를 우회 권한으로 사용하지 않는다. jobs OFF는 수동 발행 admission도 막는다. migration은 기존 current admin 검토 버전의 manual 의도를 보존한다.
5. 이미 published인 글의 required 검증·실패 시 correction_pending으로 숨김·철회는 보호 경로다. 정책 row 조회가 고장 나도 worker는 이 경로만 claim할 수 있다. DB 자체가 불능이면 검증/상태 저장도 불가능하며 성공으로 표시하지 않는다. 선택 후처리는 jobs 정책을 따른다. 일시정지는 프로세스 종료나 과거 공개 글 삭제를 뜻하지 않는다.

## 장애와 인계

정책 ON만으로 unknown 요청/예약을 queued로 바꾸지 않는다. 수동 result_ready는 기존 저장만 재개하는 계약을 유지한다. daily provider 오류나 응답 후 저장/정책 조회 실패는 needs_review 예약을 남기며 자동 재호출하지 않는다. daily 결과 보관용 별도 queue는 추가하지 않았으므로 저장 전에 DB가 고장 나면 응답 복구는 보장하지 않는다. 운영자는 provider 과금·usage·post·감사를 대조한 뒤 별도 승인된 복구로 정리한다. 웹 재시도/복구는 A3 범위다. DB를 과거 백업으로 되돌릴 때는 먼저 서버 상한을 OFF로 두고 복원된 ON 정책과 실행 예약을 대조한다.

관련 파일: lib/blog-automation-policy.ts, lib/blog-automation-runner.ts, lib/blog-draft-requests.ts, lib/blog-persistent-worker.ts, lib/blog-editorial-actions.ts, migration 010, AutomationPolicyForm. 새 브로커/daemon/범용 command bus는 없다.

## 검증

2026-10-28 A2 Step 3 완료: 초안 생성·자동 공개·새 작업 처리를 기본 OFF의 DB 정책으로 분리했다. 요청한 설정/서버 상한을 반영한 실제 허용·차단 이유·확인 시각과 실행 예약 당시 revision을 표시한다. 정책 변경과 요청/lease admission을 같은 row lock으로 직렬화하고 관리자·CLI·일일 실행·worker에 적용했다. 자동 공개 OFF 또는 생성 중 중지 시 drafted/작업 0개로 저장하며 공개 전이를 재확인한다. 공개 후 필수 검증·실패 시 숨김·철회는 중지/정책 조회 실패에도 보존한다. 단위 252 pass/23 DB skip, 격리 integration 25/25, dev/prod draft·policy HTTP 각 1/1, production admin HTTP 4/4, lint/typecheck/build와 1440/390/320px 검수를 통과했다. A2 전체 완료, 관리자 completed 12·pending 4·blocked 1이며 다음은 **A3 Step 0: job-and-audit-inspection**다. 운영 migration·provider·배포·공개 발행·timer는 실행하지 않았다.

초기 worker 기본 OFF가 adapter 1회 실행되는 RED, 초안/수동 발행 정책 우회 RED, CLI의 중지 중 input file 접근 RED, cycle의 paused 오류 RED를 확인한 뒤 수정했다. 정책 OFF→ON→OFF/동시 revision/감사 rollback/DB 오류/새 pool 재조회, provider 응답 직후 중지/불명확 결과, 자동 공개와 품질 차단, worker 공개 직전 중지와 policy 실패 후 공개 보호를 격리 DB에서 검증했다. 실제 HTTP는 인증/공개 host 404/Origin/중복 receipt/409/정책 차단과 초안의 모든 공개 표면 제외를 확인했다. 빌드의 기존 썸네일 동적 파일 추적 경고 2건은 남아 있다.

다음은 [A3 Step 0](../../../phases/admin-operations-control/step0.md)의 작업·감사 조회다.
