# 관리자 초안 생성 요청 — A2 Step 2

2026-10-27 구현/로컬 검증 완료. 운영 provider·DB migration·timer는 활성화하지 않았다.

## 접수와 실행

- 소유자는 /admin/automation에서 서버에 준비된 자료의 제목/출처 수를 확인하고 요청 사유를 남긴다. 사유는 감사용이며 writer prompt가 아니다.
- 서버가 HLOG_AUTO_PUBLISH_INPUT_FILE에서 256 KiB 이하 JSON을 읽고 기존 parser·24시간 freshness·privacy로 검증한다. URL 수집이나 임의 파일 선택 기능은 없다. 원본 rawContent는 저장하지 않고 기존 요약/근거·개인 맥락 snapshot을 보관한다. 같은 자료를 다시 요청해도 동일 input hash의 요청 하나로 수렴한다. 다시 생성하려면 검토·갱신한 입력이 필요하다.
- HLOG_BLOG_DRAFT_GENERATION_ENABLED=1은 web/runner의 초안 접수/실행 상한이다. 기본값은 OFF다. runner는 HLOG_DAILY_ESTIMATED_COST_LIMIT와 HLOG_MONTHLY_ESTIMATED_COST_LIMIT가 둘 다 유한한 비음수일 때만 실행한다. 빈 한도는 실행 허용이 아니다. 기존 usage ledger의 UTC 일/월 경계와 실제 provider 사용량 기록을 재사용한다. 사전 한도 검사와 응답 후 한도 검사를 적용하며 한 번의 호출이 남은 금액을 넘지 않는다는 비용 상한 보장은 하지 않는다.
- 기존 entrypoint의 npm run draft:once (= blog-auto-publish.mjs --draft-once)가 요청 한 건을 처리한다. 웹은 실행자를 시작하지 않는다. 배포 후 입력 파일을 web에서 읽을 수 있게 준비하고 별도 승인된 runner 환경에서 실행해야 한다. Compose mount·scheduler·운영 설정은 이번에 추가하지 않았다.
- daily --once와 draft --draft-once는 공통 session advisory lock으로 동시 생성을 막는다. 서울 날짜별 daily lock과 post ID는 그대로이며 수동 요청은 draft-request:UUID / post-draft-UUID를 쓴다. 생성 보류 출력에도 daily postId가 있어 기존 보호 검증은 계속 실행할 수 있다.
- 기존 Hermes writer/한국어 규칙/context/claim/privacy/quality를 통과한 글만 drafted로 저장한다. publish_jobs는 만들지 않는다. 출처 ID는 draft post마다 분리해 다른 글의 snapshot을 덮어쓰지 않는다. 실제 공개는 기존 블로그 검토에서 새 admin 버전과 근거를 저장한 뒤 별도 검토/발행 절차를 거친다.

## 저장과 장애 의미

| 상태 | 의미와 재실행 |
| --- | --- |
| queued | DB 접수 완료. 아직 provider 실행 전 |
| running | runner가 실행 시작을 저장함. provider_started_at을 먼저 저장한 뒤 호출 |
| result_ready | 검증된 aggregate를 보관함. 재실행 시 provider 없이 초안·완료·감사 transaction만 재개 |
| completed | drafted post와 완료 감사가 함께 commit됨. 동일 요청은 재생성하지 않음 |
| blocked | 입력 만료/변경/검사 실패·한도 초과 등. 자동 재시도 없음 |
| needs_review | 중단 또는 외부 결과/저장 상태가 불명확함. 자동 재호출 없음; 새로운 chargeable 생성도 보류 |

Hermes process timeout은 기존 5분, 요청 소비자의 응답 deadline은 최대 330초다. timeout이 외부 실행 취소나 무과금을 뜻하지 않는다. 연결이 끊겨 session lock을 새 실행자가 얻으면 이전 running을 needs_review로 전환한다. 시작 전 중단, provider 결과 미확인, 응답 이후 결과 보관 실패를 reason_code와 시각으로 구분한다. 이력은 최근 20개를 표시하며 자동 polling은 없다.

결과 보관 뒤 final transaction이 실패하면 post/완료 감사 모두 rollback되고 result_ready는 남는다. 이 상태에서는 재실행해 저장만 복구할 수 있다. 응답 후 보관 자체가 실패하면 결과 복구를 보장하지 않는다. 원본 오류·provider 응답을 웹으로 보내지 않으며 needs_review 상태에서 운영자가 provider 실행/과금·usage ledger·감사를 먼저 대조해야 한다. 상태를 무조건 queued로 되돌리거나 행을 지워 재시도하지 않는다. 정책 조정은 [자동화 정책 계약](AUTOMATION_POLICY.md)에 따라 Step 3에서 구현했다. 결과 확인/복구는 A3 후속 범위다.

## 검증과 다음 단계

2026-10-27 A2 Step 2 완료: `/admin/automation`의 초안 요청·최근 이력·검토 링크와 migration 009의 지속 요청/입력 snapshot을 연결했다. 명령 UUID·입력 hash 중복 수렴과 감사 transaction, 기존 one-shot의 `--draft-once`, `drafted` 전용 저장을 구현했다. freshness/context/claim/privacy/한국어 규칙/usage를 재사용하며 발행 작업은 만들지 않는다. 불명확한 외부 결과는 새 생성도 보류하고, 보관된 결과의 저장 실패는 provider 재호출 없이 복구한다. Unit 250 pass/19 DB skip, 격리 integration 21/21, dev/prod draft HTTP 각 1/1, production admin HTTP 4/4, lint/typecheck/build와 1440/390/320px 검수를 통과했다. 관리자 completed 11·pending 5·blocked 1이며 다음은 **A2 Step 3: automation-policy-controls**다. 실제 provider·운영 migration·배포·공개 발행·timer는 실행하지 않았다.

기존 단위 250 pass/19 DB skip와 전체 격리 DB 21/21, 실제 local HTTP 공개 제외, production HTTPS Host/Origin/RSC/직접 API와 모바일 검수를 확인했다. 이 완료는 production activation 승인이 아니다. 2026-10-28 Step 3 완료 후 현재 다음은 [A3 Step 0](../../../phases/admin-operations-control/step0.md)이다.

Step 3부터 접수/provider admission은 지속 generation/jobs 정책과 서버 상한을 모두 검사한다. 일일 실행의 불명확 예약도 새 수동 생성을 보류하며 수동 요청 결과는 자동 공개 설정과 관계없이 drafted다.
