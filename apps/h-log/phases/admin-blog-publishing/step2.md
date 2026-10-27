# Step 2: draft-generation-requests

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. A2 Steps 0–1 완료. 기존 자동 발행 pipeline과 새 초안 요청의 의미를 분리한다.

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
