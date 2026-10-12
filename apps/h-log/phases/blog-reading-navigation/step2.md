# Step 2: related-post-navigation

## 개선 사항

관련 글과 이전·다음. 같은 phase의 Step 1 완료 후 실행한다.

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
- `apps/h-log/phases/blog-reading-navigation/index.json`
- `apps/h-log/lib/blog-search.ts`
- `apps/h-log/lib/blog-search.test.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

기존 related/tag 선택 로직으로 관련 글 2~3개와 이전/다음 글을 상세 하단에 연결한다. 비공개/철회/current-version 경계를 유지하며 추천 이유는 독자가 이해할 관계로 표시한다. 외부 embedding 호출은 추가하지 않는다.

## 인수 기준

자기 자신·비공개·철회 글은 제외되고 관련 글이 없거나 하나뿐이어도 정상이다. 정렬이 결정적이며 DB 실패를 가짜 글로 숨기지 않는다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-search.test.ts lib/blog-public.test.ts
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

## 완료 기록 (2026-10-12)

- `getPublicBlogPostNavigation`에서 기존 공개 selector와 related 태그 fallback을 재사용했다. 최대 3개의 관련 글에 현재 버전 제목과 정렬된 공통 태그를 제공하고, 발행일/slug 순서로 바로 이전·다음 글을 연결한다. 자기 자신·비공개·철회·유효한 현재 버전이 없는 글·privacy 차단 글을 제외한다.
- 상세 page와 metadata는 같은 request-cached 공개 store를 읽는다. 참고 출처 아래에 관련 글과 이전·다음 링크를 출력하고 관련 글 0개/1개, 한 방향만 있는 글, 단일 공개 글을 처리한다. 새 client 상태·DB/schema/worker 변경·embedding/외부 호출은 없다.
- RED: 새 navigation selector의 정렬/공개 경계/빈 결과 3개 테스트 실패와 브라우저 관련 글 영역 누락을 확인했다. GREEN: focused public/search 49/49, 전체 unit 205 pass/13 DB skip, lint/typecheck/build, 격리 PostgreSQL public-read-path integration 1/1을 통과했다.
- 격리 local DB synthetic fixture로 1440/390/320px에서 관련 글 3개·공통 태그·양방향 이동·뒤로 가기·키보드 Tab/Enter와 focus outline·긴 제목 줄바꿈·페이지 넘침 없음을 검증했다. 관련 글 없는 글의 영역 생략, 마지막 글의 단방향 링크, private/retracted/privacy/missing 404, JavaScript 없는 탐색 링크와 Markdown 원문 일치를 확인했다.
- 후보를 로컬에서 철회하거나 current version을 비우면 새 요청에서 링크가 제거되는 것을 확인하고 fixture를 복구했다. 별도 로컬 production 서버의 DB 연결 실패에서는 기존 오류 화면·다시 시도만 표시하고 가짜 글이나 탐색 링크를 만들지 않았다.
- Phase 2의 Steps 0–2가 모두 완료됐다. 다음은 [blog-discovery-and-home / Step 0: URL에 남는 통합 검색](../blog-discovery-and-home/step0.md)이다. Home/레이더·Second Brain·OCI 보류는 유지한다.
