# Step 1: versioned-editorial-actions

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. A2 Step 0 완료.

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
- `apps/h-log/phases/admin-blog-publishing/step0.md`
- `apps/h-log/lib/blog-admin.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-public-read-path.integration.test.ts`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`
- `apps/h-log/migrations/005_blog_public_editorial.sql`

## 작업

1. 초안 저장/공개 글의 새 수정본 작성은 append-only 버전으로 다루고 기존 공개 본문과 current pointer를 조용히 덮어쓰지 않는다. 기존 상태 모델에 필요한 실제 전이만 확인해 구현한다.
2. 선택한 버전/hash의 발행 요청과 철회를 인증된 명령으로 연결한다. 공개 전 render/privacy·claim/quality와 공개 후 required 검증/실패 시 숨김 경계를 재사용한다. UI 요청으로 즉시 published로 덮어쓰지 않는다.
3. 명령마다 revision/state·사유·중복 키를 확인하고 상태 전이/작업 등록/감사를 transaction으로 묶는다. 감사 실패·동시 편집·중복 클릭·철회 후 이전 버전 재노출을 검증한다. 런타임에 없는 범용 admin helper를 일괄 복원하지 않는다.

## 인수 기준

저장만으로 공개가 바뀌지 않으며 검수한 버전만 기존 발행 검증을 거친다. 철회는 모든 public surface에서 제외되고 감사 실패 시 부분 변경이 남지 않는다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 합성 글과 fake provider로 draft→버전 선택→required 검증→공개→수정본→철회, 실패 rollback과 stale revision을 격리 검증한다.
2. public URL/Markdown/sitemap/feed/llms/search/related와 저장 원문/hash를 확인한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A2 Step 2 draft-generation-requests. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
