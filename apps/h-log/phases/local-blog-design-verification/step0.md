# Step 0: verify-db-backed-blog-after-design-refresh

## 읽을 파일

- `apps/h-log/AGENTS.md`, `.codex/skills/harness/SKILL.md`, `.codex/skills/sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`, `ADR.md`, `ARCHITECTURE.md`, `WORKFLOW.md`, `AGENT_LOOP.md`, `IMPLEMENTATION_PLAN.md`
- `apps/h-log/phases/discord-design-preview/index.json`, `step0.md`
- `apps/h-log/DESIGN.md`, `.codex/rules/frontend.md`, `.codex/rules/content-seo-privacy.md`
- `apps/h-log/package.json`, `compose.yaml`, `deploy/env.dev`, `deploy/postgres.env.dev`
- `apps/h-log/scripts/blog-local-dry-run.mjs`, `scripts/blog-migrations.mjs`, `lib/blog-local-dry-run.ts`
- `apps/h-log/app/blog/(index)/page.tsx`, `app/blog/[slug]/page.tsx`, `components/blog/BlogSearchPanel.tsx`
- `apps/h-log/lib/blog-discovery-ui.test.ts`, `blog-detail-ui.test.ts`, `blog-search-ui.test.ts`, `blog-local-dry-run.integration.test.ts`
- 동작 수정이 필요하면 `.codex/skills/tdd/SKILL.md`와 해당 호출 경로/테스트를 추가로 읽는다.

## 작업

최근 Discord 디자인 반영 때 Blog는 로컬 DB가 없어 unavailable 상태까지만 확인했다. 현재 디자인에서 DB에 글이 있을 때의 공개 화면과 탐색 흐름을 검증한다.

1. Docker context가 로컬인지 확인하고 이번 작업 전용 Compose project/DB를 만든다. 기존 volume과 충돌하지 않는 이름 및 localhost 포트를 확인한다. 실제 운영 env나 기존 `DATABASE_URL`을 재사용하지 않는다.
2. 기존 migration과 fake-provider dry-run을 재사용해 공개 성공 글과 비공개 실패 글을 준비한다. 실제 Hermes/외부 LLM, source fetch, 공개 발행은 호출하지 않는다.
3. 개발 서버에서 목록 → 태그 → 검색 → 상세 이동을 데스크톱 1440px와 모바일 390px로 확인한다. 320px overflow, 긴 제목·코드 블록, 검색 0건, 키보드 focus도 확인한다. 기존 fixture로 부족한 표시 조건은 격리 DB에만 추가한다.
4. 비공개/없는 글의 상세·Markdown 404, 공개 글의 HTML/Markdown 및 sitemap/feed/llms 노출을 확인한다. 기존 dry-run과 integration test를 먼저 사용한다.
5. 스크린샷과 명령 결과는 Git 제외된 로컬 경로에 보관하고 redacted 검증 결과만 phase에 기록한다. 결함이 확인되면 관련 동작의 failing test 또는 브라우저 재현을 먼저 남기고 가장 작은 수정만 한다. 결함이 없으면 불필요한 UI 변경을 만들지 않는다.

## 인수 기준

- 격리된 local DB의 공개 글이 목록·검색·상세·crawler에서 일관되게 보인다.
- 비공개 실패 글은 공개 경로에서 404이며 crawler/search에 나오지 않는다.
- 데스크톱·모바일에서 가로 overflow나 주요 정보 잘림이 없고 탐색·키보드 조작이 동작한다.
- 아래 기존 gate가 통과하고 확인한 화면·fixture·검증 명령을 기록한다.

`apps/h-log`에서 이번 작업의 격리 local `DATABASE_URL`과 `HLOG_DRY_RUN_BASE_URL`을 지정한 뒤 실행한다.

```sh
npm run test:integration
npm run dry-run:local
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

브라우저 확인은 `npm run dev`를 사용한다. 실행 전 전용 local DB/포트임을 검증하고, public HTTP 404는 필요한 경우 production build에서도 확인한다.

## 하지 말 것

- OCI API/SSH, bucket, remote state, import/apply, 운영 DB, DNS/TLS, timer를 실행하지 말 것. Reason: 사용자가 OCI 작업을 보류했다.
- 실제 provider 호출이나 새 자동 발행 활성화를 하지 말 것. Reason: 이번 범위는 기존 fake-provider를 사용하는 로컬 검증이다.
- 기존 local/운영 volume을 삭제하거나 sample을 실제 데이터에 넣지 말 것. Reason: 격리된 검증 환경만 사용한다.
- 관리자 인증·임베딩·학습 기능을 추가하지 말 것. Reason: 확인된 디자인 검증 공백 한 단위만 처리한다.
