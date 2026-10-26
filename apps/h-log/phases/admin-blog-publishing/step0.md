# Step 0: private-post-review

## 상태와 선행 조건

2026-10-27 구현·로컬 검증 완료: completed. A1 전체와 operations-observability Step 0 완료. 모니터링 스택 설치는 필요하지 않다.

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
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/migrations/001_blog_core.sql`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`
- `apps/h-log/migrations/005_blog_public_editorial.sql`

## 작업

1. 인증된 /admin/posts에서 현재 글·상태·선택 버전·출처·저장된 검증 결과를 제한된 조회/페이지로 읽는다. 공개 selector를 느슨하게 만들지 않고 관리자 조회만 분리한다.
2. 공개 renderer의 안전한 본문 표현을 재사용한 비공개 미리보기를 만든다. 저장 Markdown/HTML/hash·공개 current version과 검토 중 버전을 구분한다. 미리보기 URL은 인증·no-store/noindex 경계 안에 둔다.
3. 실제 저장되지 않은 generation history/품질 점수를 추정하지 않고 미기록으로 표시한다. DB 오류·0건·상태 필터·긴 글·오래된 버전 읽기를 확인한다.

## 인수 기준

소유자는 비공개/실패/공개 글과 버전을 검토할 수 있고 익명/공개 API에는 published-current 데이터만 남는다. 미리보기는 글 상태나 hash를 변경하지 않는다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 같은 private 글의 관리자 200과 공개 detail/Markdown/검색/crawler 제외를 테스트한다.
2. SSR/RSC payload·미리보기 경로 누출과 raw HTML 실행을 검사한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A2 Step 1 versioned-editorial-actions. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## 완료 기록 — 2026-10-27

- `app/admin/posts/page.tsx`와 `posts.css`에 상태 필터·20개 단위 목록·버전 번호 선택·본문/원문·출처·검증 결과를 추가했다. 준비 메뉴였던 블로그를 실제 링크로 연결했다. 저장·발행·철회 버튼은 Step 1에서 구현한다.
- `lib/blog-admin-review-server.ts`는 owner 인증 뒤에만 DB를 읽는다. `blog-admin-review.ts`는 read-only repeatable-read transaction, 3초 statement timeout, 제한된 페이지·256 KiB 본문/HTML·50개 출처/검증/작업을 사용한다. 현재 포인터와 선택 버전을 구분하며 요청한 버전이 없으면 다른 버전으로 대체하지 않는다.
- 공개 상세의 안전한 renderer를 `components/blog/BlogContent.tsx`로 옮겨 재사용했다. Markdown/HTML/hash·상태·current pointer는 읽기 전후 동일하다. 저장 HTML은 escaped text로만 보여 주며 원격 이미지·실행 HTML을 주입하지 않는다. 본문 문법은 기존 공개 renderer와 같다.
- 출처는 글 단위 기록이므로 과거 버전 당시 목록임을 보장하지 않는다. 검증/작업은 선택 버전만 읽고 raw result/error를 제외한다. 저장되지 않은 생성 이력·품질 점수는 미기록이라고 안내한다. 미설정·DB 오류·빈 목록·없는 버전을 구분한다.

### 실행한 검증

- RED: 새 query/parser 테스트와 격리 DB 테스트가 모듈 부재로 실패했다. 구현 전 인증된 `/admin/posts` HTTP 요청은 404였다. GREEN: query/안전 본문 단위 2개와 DB 통합 1개 통과.
- `npm run test`: 247 pass / 17 DB skip / 0 fail. `npm run test:integration`: 19/19, 신규 `test:admin:posts` 포함. 각 DB suite는 자체 임시 DB를 생성·정리했다.
- `npm run test:admin:posts:http`: 개발 모드 1/1, 로컬 production 모드 1/1. 합성 `review-private` v1/v2와 별도 public/admin ingress를 사용했다. owner 200, 익명/잘못된 인증 401, 공개 ingress 404, 위조 Host 403, HEAD/RSC/prefetch, raw HTML·오류 원문 제외, 공개 detail/Markdown/검색/crawler 제외를 확인했다. Next 개발 모드는 no-store, production 모드는 private/no-store를 확인했다. prefetch는 본문 없는 route tree일 수 있으며 실제 RSC 본문 조회는 별도로 검사한다.
- `npm run test:admin:http`: production HTTPS ingress에서 4/4. 테스트 인증서는 이 명령의 Node 프로세스에만 신뢰시켰다. 운영 인증서/설정은 변경하지 않았다.
- `npm run lint`, `npm run typecheck`, `npm run build` 통과. 빌드에는 기존 `blog-thumbnails.ts`의 dynamic filesystem tracing 경고 2개가 남아 있다.
- 개발 서버 1440×1000 / 390×844 / 320×780에서 목록/본문·표/코드·원문·필터·페이지 이동·저장 버전 전환·키보드 제출을 확인했다. 모바일에서 페이지 가로 넘침은 없고 표/코드만 내부 스크롤한다. 합성 DB 중지 시 오류 안내, 재시작 후 같은 필터의 native 재요청 복구를 확인했다.
- 문서·phase JSON·상대 링크/읽을 파일과 `git diff --check` 검증. 테스트 원자료/로그/임시 TLS 파일은 ignored `private/admin-post-review-check/`에만 보관했다.

### 남은 범위

운영 배포·실제 글 발행·외부 provider·timer는 실행하지 않았다. 새 schema/API/쓰기 명령은 없다. 별도 버전 목록 페이지·전체 원문 다운로드·256 KiB 초과 미리보기는 제공하지 않는다. 다음은 **A2 Step 1: versioned-editorial-actions**다.
