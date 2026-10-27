# Step 1: versioned-editorial-actions

## 상태와 선행 조건

상태: completed — 2026-10-27 로컬 구현·검증 완료. A2 Steps 0–1 완료.

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
- `apps/h-log/app/admin/posts/page.tsx`
- `apps/h-log/lib/blog-admin-review.ts`
- `apps/h-log/lib/blog-admin-review-server.ts`
- `apps/h-log/components/blog/BlogContent.tsx`
- `apps/h-log/lib/blog-admin-review.integration.test.ts`
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

## 구현과 검증 기록 — 2026-10-27

2026-10-27 A2 Step 1 완료: 기존 글의 불변 수정본 저장, 선택 버전/hash 검토 후 발행 요청, 철회와 원자적 감사 receipt를 연결했다. 저장은 공개 current를 유지하고 발행은 기존 required 6종 워커를 거친다. 중복·동시 수정·감사 실패 rollback·철회 후 늦은 작업의 재노출 방지를 검증했다. Unit 248 pass/18 DB skip, 격리 integration 20/20, 개발/프로덕션 editorial HTTP 각 1/1·공통 admin HTTP 4/4, lint/typecheck/build와 1440/390/320px 저장·발행·철회·오류 복구를 확인했다. 관리자 completed 10·pending 6·blocked 1이며 다음은 A2 Step 2 draft-generation-requests다. 운영 발행·배포·provider·timer는 실행하지 않았다.

- migration 008은 posts.command_revision과 post_versions.editorial_review만 추가한다. 기존 원문/HTML/hash와 current 포인터는 upgrade 때 바꾸지 않는다. 기존 글만 편집하며 새 글 생성·출처/태그 변경은 이번 범위에 없다.
- /admin/posts/commands는 공통 owner/Host/Origin 검사 후 JSON 최대 256 KiB·읽기 10초를 제한한다. 본문 최대 128 KiB, 주장 30개·기록 20개, 사유를 검증한다. 명령 UUID 예약 → row lock → 예상 revision/state/current → 새 버전/작업/상태 → 감사 receipt를 같은 transaction으로 처리한다. 응답이 불명확하면 같은 UUID·입력을 재전송한다.
- 수동 발행은 서버 HLOG_BLOG_MANUAL_PUBLISH_ENABLED=1일 때만 허용하며 기본 OFF다. 최신 admin 수정본·저장 hash·본문 전체 검토 확인·주장/공식 출처 또는 근거·privacy/quality gate를 검사한다. 사실의 진위나 한국어 문체를 자동으로 보증하지 않으므로 소유자가 확인한다. 저장된 원문을 몰래 교정하지 않는다.
- 발행 요청은 current를 후보로 바꾸고 publishing/required jobs만 등록한다. 기존 공개본은 이때 내려간다. 워커의 render/privacy 성공 후 공개되고 public URL/Markdown/hash/sitemap 실패는 기존 숨김 경계를 따른다. 이전 버전 job은 claim하지 않고 상태 변경은 current/status 조건부 갱신으로 제한한다. 철회 후 이전 receipt나 늦은 검증 실패로 재노출하지 않는다.
- RED: 누락된 명령/HTTP 모듈, 늦은 실패가 retracted를 correction_pending으로 되돌리는 DB 회귀. GREEN: 같은 focused 테스트 통과. 브라우저에서 같은 version/hash URL의 발행 후 상태가 남는 문제를 재현하고 동일 URL은 reload하도록 수정해 철회 상태와 비활성 버튼까지 확인했다.
- HTTP는 실제 Next 경로에 합성 원고를 만들고 로컬 public ingress만 호출한다. 익명 401/public 404/형제 origin 403/잘못된 입력 400/초과 413/충돌 409/미검토 422, 저장→필수 6종→공개→철회→과거 receipt 재전송을 확인했다. 상세·Markdown 404와 Home/목록/검색/sitemap/feed/llms 제외, 원본 보존/감사 3건을 검사했다.
- 개발 화면은 직접 loopback Next origin에서 검수했다. 임시 개발 프록시를 통한 hydration 정지는 직접 연결로 해소했다. Basic 로그인 뒤 일반 URL로 검수했고 1440/390/320px 가로 넘침은 없었다. 합성 DB 중지 시 입력/동일 명령을 보존하고 재시작 후 한 버전으로 복구했다. 철회 확인은 화면 안의 체크박스로 제공한다. JavaScript 없는 조회는 유지되며 쓰기에는 JavaScript가 필요하다.
- 테스트: npm run test:editorial; npm run test:integration (격리 DB); HLOG_EDITORIAL_HTTP_TEST=1 npm run test:editorial:http (격리 DB와 loopback ingress 필요); npm run test/lint/typecheck/build; git diff --check. 기존 build의 동적 썸네일 경로 tracing 경고 2건은 남아 있다.

## 다음 작업에 넘길 제한

새 초안 생성과 draft-only 저장/요청 이력은 Step 2, 지속 자동화 허용/중지는 Step 3에서 구현한다. 이번 수동 발행 flag는 기존 자동 발행 runner의 전역 중지 정책이 아니다. 운영 migration 008·관리자 ingress·실제 발행 활성화는 OCI 보류 범위다. 공개 중 교체의 무중단 제공, 과거 원문의 자동 복원, 외부 원문 수집/사실 판정은 제공하지 않는다.
