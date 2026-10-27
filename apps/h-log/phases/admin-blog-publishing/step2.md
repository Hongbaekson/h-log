# Step 2: draft-generation-requests

## 상태와 선행 조건

2026-10-27 completed. A2 Steps 0–2 완료. 다음은 Step 3 automation-policy-controls다.

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
- `apps/h-log/phases/admin-blog-publishing/index.json`
- `apps/h-log/phases/admin-blog-publishing/step1.md`
- `apps/h-log/lib/blog-editorial-actions.ts`
- `apps/h-log/lib/blog-editorial-command.ts`
- `apps/h-log/migrations/008_blog_editorial_commands.sql`
- `apps/h-log/scripts/blog-editorial.http.test.mjs`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- `apps/h-log/lib/blog-auto-publish-runner.ts`
- `apps/h-log/lib/blog-auto-publish-cycle.ts`
- `apps/h-log/lib/blog-article-generation.ts`
- `apps/h-log/lib/blog-usage-ledger.ts`
- `apps/h-log/scripts/blog-auto-publish.mjs`
- `apps/h-log/scripts/blog-auto-publish-cycle.mjs`
- `apps/h-log/lib/blog-postgres-repository.ts`

## 작업

1. 관리자 초안 생성 요청을 최소 지속 상태·중복 키·감사와 저장한다. 기존 one-shot 실행자가 허용된 요청 한 건을 처리하도록 연결하고 웹 요청에서 LLM 프로세스를 실행하지 않는다. 실제 request consumer와 함께 필요한 최소 schema만 추가한다.
2. source freshness·개인 맥락·claim/privacy/quality·한국어 규칙·budget/usage를 재사용하면서 결과를 draft로 저장한다. publishing 상태/required publish job을 생성하지 않는 별도 검증 가능한 저장 경계를 둔다.
3. 재시작·중복 클릭·provider timeout/결과 불명확·성공 저장 실패를 구분한다. 외부 실행의 exactly-once를 가정하거나 불명확한 요청을 자동 재호출하지 않는다. 기존 서울 날짜별 자동 발행 lock과 새 수동 요청 키가 충돌하지 않도록 한다.

## 인수 기준

요청은 새로고침/재시작 뒤에도 확인되고 성공 결과는 비공개 초안으로만 저장된다. 중복 요청은 같은 결과/실행으로 수렴하며 한도 초과와 확인되지 않은 외부 결과는 안전한 중단 상태다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. fake provider의 실제 호출 횟수와 DB 요청/결과 수를 검사하고 worker 중단·재시작·deadline·budget 차단을 검증한다.
2. 성공 초안이 모든 공개 surface에서 빠지고 publish_jobs에 발행 작업이 없는지 확인한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A2 Step 3 automation-policy-controls. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## 완료 기록 — 2026-10-27

2026-10-27 A2 Step 2 완료: `/admin/automation`의 초안 요청·최근 이력·검토 링크와 migration 009의 지속 요청/입력 snapshot을 연결했다. 명령 UUID·입력 hash 중복 수렴과 감사 transaction, 기존 one-shot의 `--draft-once`, `drafted` 전용 저장을 구현했다. freshness/context/claim/privacy/한국어 규칙/usage를 재사용하며 발행 작업은 만들지 않는다. 불명확한 외부 결과는 새 생성도 보류하고, 보관된 결과의 저장 실패는 provider 재호출 없이 복구한다. Unit 250 pass/19 DB skip, 격리 integration 21/21, dev/prod draft HTTP 각 1/1, production admin HTTP 4/4, lint/typecheck/build와 1440/390/320px 검수를 통과했다. 관리자 completed 11·pending 5·blocked 1이며 다음은 **A2 Step 3: automation-policy-controls**다. 실제 provider·운영 migration·배포·공개 발행·timer는 실행하지 않았다.

- RED: draft 옵션에서 기존 publishing 저장이 발생함을 재현했다. 다중 초안의 출처 snapshot 충돌(2개 대신 1개)과 보류된 daily 출력의 postId 누락도 각각 RED→GREEN으로 수정했다.
- DB: 중복 동시 접수·다른 키의 같은 입력·입력 변경·동시 실행·재시작·10ms fake deadline·budget 차단·잘못된 claim·요청 감사 rollback·생성 응답 후 결과 보관 실패·보관된 결과의 최종 감사 실패/복구를 확인했다. 실제 provider 호출 횟수와 초안/작업/usage 수를 검사했다.
- HTTP: 인증 전 차단, public Host 404, 형제 Origin 403, 과대/추가 필드 거부, 202 receipt 재사용, 새로고침 후 이력과 Home/Blog/검색/sitemap/feed/llms/HTML/Markdown 비공개를 확인했다. 개발 모드의 HTML cache-control은 Next가 no-store로 덮어써 기존 production 전용 헤더 검사는 운영 빌드에서 4/4로 검증했다.
- UI: 개발 서버에서 요청·중복 클릭 후 새로고침·완료 이력·검토 이동을 확인했다. 1440/390/320px의 가로 넘침이 없었다.
- 기존 editorial integration의 동시 실행 승자에 따라 재사용 UUID가 다른 실패를 내던 테스트를 수정했다. 철회 상태 검사는 새 UUID로 실행하며 production 동작은 그대로다.
- 최종 명령: npm run test / test:integration / test:drafts:http / test:admin:http / lint / typecheck / build, 문서/JSON/링크 검사, git diff --check. 기존 thumbnail 동적 파일 추적 경고 2개는 유지한다.

입력 준비·서버 flag·한도·상태와 복구 한계는 [초안 요청 실행 계약](../../.codex/docs/harness/DRAFT_GENERATION_REQUESTS.md)을 따른다. 지속 정책 UI와 정확한 pause/admission 직렬화는 Step 3, 운영 실행은 별도 승인 범위다.
