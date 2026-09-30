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

## 완료 결과 (2026-09-30)

- 로컬 Docker Desktop에 전용 Compose project와 volume을 만들고 PostgreSQL을 localhost 전용 포트로 연결했다. 기존 migration과 fake-provider dry-run으로 공개 성공 글 1개와 비공개 실패 글 1개를 만들었다. 긴 제목·코드 블록과 pagination 검증용 글 7개는 이 격리 DB에만 추가했다.
- RED: `PostgreSQLConnectionPoolConfigurationValidationException: 긴 제목의 모바일 표시 검증` 제목이 있을 때 390px와 320px의 목록·검색 결과 내용이 오른쪽으로 잘렸다. `body`의 overflow 숨김 때문에 문서 폭만 검사하면 놓치므로, 화면 내 요소의 실제 오른쪽 경계도 검사했다. 코드 블록 내부 스크롤과 시각적으로 숨긴 본문 H1은 제외했다.
- GREEN: `app/blog/(index)/page.tsx`와 `components/blog/BlogSearchPanel.tsx`의 제목 H2에 `wrap-anywhere`만 추가했다. 같은 브라우저 검사에서 목록·검색·상세 각각 1440/390/320px, 총 9개 조합이 모두 통과했다. 수정 전후 스크린샷으로 정보 잘림도 확인했다.
- 1440px와 390px에서 목록 6개 → 다음 페이지 2개 → 이전, 태그 4개 필터·해제, 검색 0건·4건, 검색 결과 → 상세 → 목록 이동을 확인했다. 검색 버튼의 키보드 focus/Enter와 코드 블록의 focus/가로 스크롤도 통과했으며 page error는 없었다.
- 공개 글의 HTML·Markdown은 200, 비공개 글과 없는 글의 HTML·Markdown은 모두 404였다. 검색은 성공 글만 반환했다. 기존 dry-run은 sitemap/feed/llms/llms-full에 성공 글이 포함되고 실패 글은 제외됨을 확인했다.

| 검증 | 결과 |
| --- | --- |
| `npm run test:integration` | migration/repository/public-read/worker/dry-run 13개 통과 |
| `npm run dry-run:local` | 격리 DB → 개발 서버 HTTP 공개·비공개·crawler 검증 통과 |
| 개발 서버 브라우저 검사 | 9개 화면 크기 조합과 데스크톱·모바일 상호작용 통과 |
| `npm run test` | 151개 통과, DB 환경값 없이 실행한 integration 12개는 skip; 별도 integration gate에서 검증 |
| `npm run lint` | 통과 |
| `npm run build` | 로컬 DB와 예시 canonical origin으로 통과 |
| `npm run typecheck` | 생성된 build 타입 기준 통과 |
| phase JSON·문서 링크·`git diff --check` | 통과 |

스크린샷과 RED/GREEN·상호작용·gate 로그는 Git 제외 경로인 `apps/h-log/.codex/tmp/local-blog-design/`에 보관한다. 일회성 seed/브라우저 스크립트는 앱 lint 범위 밖의 `.codex/tmp/local-blog-design/`에 둔다. 이 로컬 보조 파일은 커밋하지 않는다.

개발 서버와 이번 검증용 DB 컨테이너는 종료하고 전용 volume은 보존했다. OCI API/SSH, 실제 provider, 운영 데이터 변경과 배포는 실행하지 않았다. 이 step에서 남은 작업은 없으며 Terraform Step 2와 운영 timer의 보류는 유지한다.
