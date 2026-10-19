# Step 2: project-post-connections

## 개선 사항

프로젝트와 글 양방향 연결. 같은 phase의 Step 1 완료 후 실행한다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 아래 파일과 수정 대상의 실제 caller를 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`
- `apps/h-log/phases/portfolio-evidence-experience/index.json`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

공개 project slug와 published 글을 연결하는 최소 mapping을 추가한다. 프로젝트 상세와 글 상세에 관계를 보여주며 DB/schema 변경 필요성은 실제 모델을 보고 결정한다. H-Log 자체 사례는 확인된 로컬/운영 범위를 나누어 작성한다.

## 인수 기준

없는 slug·비공개·철회 글은 링크되지 않는다. 프로젝트와 글 양쪽의 연결이 일치하며 DB 관련 변경 시 격리 integration gate가 통과한다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 바꾸는 public behavior의 RED를 확인한 뒤 최소 구현으로 같은 테스트의 GREEN을 확인한다. 순수 콘텐츠/문서 변경은 파서·링크·형식 검증으로 대체한다.
2. UI는 개발 서버와 격리 local DB의 synthetic fixture로 1440/390/320px, focus, 긴 글, 빈/오류 상태를 확인한다. DB/repository/worker/migration 변경 시 `npm run test:integration`을 추가한다.
3. phase index와 이 step에 실제 결과·검증 command·다음 단계를 기록한다. 완료된 기능만 completed로 표시한다.

## 하지 말 것

- 레이더의 데이터·축·형태·배치·주변 영역을 변경하지 말 것. 사용자가 명시적으로 보존을 요청했다.
- 저장 Markdown/HTML/hash나 기존 URL을 무단 재작성하지 말 것. 발행 무결성과 기존 링크를 유지해야 한다.
- raw HTML 주입, private 글/내부 evidence/근거 없는 실적 노출을 허용하지 말 것. 공개 콘텐츠 경계를 유지해야 한다.
- OCI·DNS/TLS·운영 timer·실제 provider 호출·공개 발행을 실행하지 말 것. 로컬 개선 계획이며 기존 OCI 보류는 유지된다.

## 완료 기록 — 2026-10-20

- `lib/portfolio-posts.ts`에 명시적인 프로젝트 slug·글 slug·연결 이유 두 쌍을 두고 기존 공개 selector를 재사용했다. 양쪽 상세는 같은 연결 결과와 현재 버전 제목을 사용하며 없는 글·초안·철회·현재 버전 누락·privacy 차단은 제외한다. 태그만으로 관계를 추론하지 않는다.
- `ProjectPostLinks`를 두 화면에서 공유한다. 프로젝트 상세의 `ProjectRelatedPosts`만 기존 public loader를 호출하며, 연결 후보가 없는 프로젝트는 DB 조회를 하지 않는다. Suspense로 본문을 먼저 전송하고 0건은 생략, 실패는 일반 안내·같은 canonical 경로의 GET 재시도로 처리한다. 서버 로그에는 오류 원문 없이 고정 식별자만 남긴다. JavaScript를 끄면 프로젝트 본문과 블로그 목록 대체 링크를 읽을 수 있고, 글에서 프로젝트로 가는 링크도 동작한다. 스트리밍된 관련 글 영역 자체는 JavaScript로 표시된다.
- H-Log 자체 사례를 개인 프로젝트에 추가했다. 코드·격리 DB·브라우저에서 확인한 구현과 아직 검증하지 않은 운영 트래픽·정기 자동 발행 성과를 구분한다. 기존 9개 사례 원문·성과·URL은 동일하며 전체 공개 프로젝트는 10개다. Home은 기존 `projects.length`를 그대로 사용하므로 개수만 반영되며 소개/레이더 geometry·SVG는 일치한다.
- H-Log 구현 기록과 Redis 문서 분석의 비공개 교정본을 격리 로컬 DB에 복사해 확인했다. Redis 글을 해당 프로젝트의 Pub/Sub 도입·교체 경험으로 소개하지 않는다. mapping 등록은 발행이 아니며 실제 공개 DB에 글을 넣지 않았다. 해당 slug의 글이 공개 판정을 통과할 때만 링크가 나타난다.
- Focused RED 4개 → `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/projects.test.ts` GREEN 55/55. 연결 영역 누락 브라우저 RED→GREEN도 확인했다. `npm run test`: 219 pass / 13 DB integration skip. 격리 PostgreSQL의 `npm run test:public-read-path`와 같은 test entrypoint는 1/1 통과했으며 현재 제목·철회·현재 버전 제거·privacy 차단을 검증했다. 중간 fixture 복원에서 immutable version 중복 삽입이 실패해 test-local SQL 복원으로 고친 뒤 통과했다. DB/schema/repository/worker 코드는 변경하지 않았다.
- `npm run lint`, `npm run typecheck`, `npm run build`, Markdown/JSON·상대 링크 검사와 `git diff --check` 통과. Lint가 지적한 try/catch 안 JSX 반환은 조회 결과와 렌더링을 분리해 해결했다.
- 개발 서버 1440/390/320px에서 두 연결의 왕복 이동, 키보드 초점, 긴 문자열, 가로 넘침 없음, 현재 버전 제목, 빈/미등록 관계, 없는 프로젝트 404와 비공개 글 404를 확인했다. 격리 DB의 posts 테이블 잠금 중에도 프로젝트 본문이 먼저 보였고 잠금 해제 후 연결이 표시됐다. 별도 로컬 production 서버의 DB 연결 실패에서는 본문·오류 안내·동일 경로 재시도를 검증했다. 저장 Markdown/HTML/hash는 모두 일치한다.
- 스크립트·로컬 fixture·스크린샷은 `private/project-post-check/`에 두고 Git/Docker에서 제외했다. 실제 발행·배포·외부 provider·OCI·timer는 실행하지 않았다.

Phase 4의 Steps 0–2가 완료됐다. 다음은 [Phase 5 / Step 0: visible-verification-and-revisions](../editorial-trust-and-series/step0.md)다.
