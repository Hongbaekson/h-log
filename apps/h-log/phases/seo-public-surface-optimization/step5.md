# Step 5: server-rendered-brain-discovery

## 상태와 선행 조건

completed — 2026-11-05. SEO-04의 기본 목록·독립 링크를 개선하고 승인된 그래프 UI·공개 사본 정책을 보존했다.

## 읽을 파일

경로는 저장소 루트 기준이다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `.agents/skills/hlog-seo/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/SEO_OPTIMIZATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/SEO_AUDIT_BASELINE.md`
- `apps/h-log/phases/seo-public-surface-optimization/index.json`
- `apps/h-log/app/brain/page.tsx`
- `apps/h-log/app/brain/[slug]/page.tsx`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/components/brain/BrainNote.tsx`
- `apps/h-log/lib/brain-server.ts`
- `apps/h-log/lib/brain.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/app/sitemap.xml/route.ts`

## 작업

1. 합성 공개 사본으로 production build의 `/brain` JS OFF 로딩 고착과 독립 상세 anchor 부재를 focused RED로 확인한다. 상세 route의 기본 읽기는 이미 통과한 기준선으로 보존한다.
2. 기존 Explorer·공개 graph selector·상세 route를 재사용해 인증 없는 방문자에게 공개 기록의 기본 제목/링크를 제공한다. 기존 목록 보기의 anchor 또는 no-JS 기본 목록 중 작은 해결책을 선택한다. 숨겨진 SEO 전용 본문이나 봇 UA별 다른 콘텐츠를 추가하지 않는다.
3. 승인된 그래프의 모양·레이아웃·검색·필터·선택 동작을 보존한다. 링크를 누르는 기본 동작과 JS 그래프 선택/뒤로가기를 함께 확인한다. Home 레이더를 변경하지 않는다.
4. `/brain?note=`는 그래프 상태, `/brain/[slug]`는 독립 기록이라는 계약을 확인하고 불필요한 query URL 색인을 늘리지 않는다. 공개 상세 canonical과 사이트맵을 유지한다.
5. 공개 사본만 읽고 미공개 수정/철회/원문을 기본 목록으로 옮기지 않는다. 파일 카탈로그 모드와 DB-enabled 모드 모두 검증한다.

## 인수 기준

JS OFF 방문자가 Brain 홈에서 공개 기록의 제목과 기본 상세 링크를 읽고 이동할 수 있다. 상세 내용은 공개 사본과 일치하며 JS ON의 승인된 그래프 UI와 탐색 동작은 유지된다.

## 검증

1. 1440/390/320px JS ON/OFF의 제목·visible anchor·상세 본문 focused RED→GREEN. raw HTML의 숨겨진 문자열만으로 통과시키지 않는다.
2. 비공개/철회/미선택 수정본의 HTML/RSC/목록/sitemap 노출 0건, 없는 상세 404와 캐시 경계 확인. DB selector 변경 시 관련 integration 실행.
3. UI 변경은 개발 서버에서 desktop/mobile·키보드·뒤로가기 확인 후 production build에서도 비교한다.
4. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`. 기존 private lint 오류와 새 회귀를 구분해 기록한다.
5. phase 상태·감사 발견 해결 여부·다음 단계를 함께 갱신한다. 성능·검색 순위 향상은 측정 없이 주장하지 않는다.

## 하지 말 것

- 공개 사본 정책을 약화하지 말 것. SEO 발견 가능성보다 원문/비공개 경계가 우선한다.
- 그래프 전면 재설계·새 서비스/SEO 라이브러리를 추가하지 말 것. 이번 범위는 기본 읽기와 링크다.
- 운영 DB·실제 발행·DNS/TLS·GSC 제출을 실행하지 말 것. 운영 보류는 별도 승인 대상이다.

## 완료 기록 — 2026-11-05

- 변경: `app/brain/page.tsx`의 Suspense fallback이 같은 공개 graph의 제목·요약·상세 링크를 제공한다. `memory.css`에는 이 기본 목록의 스크롤/간격만 추가했다. 기존 JS 목록은 anchor를 사용하며 일반 클릭/Enter는 그래프 안에서 기록을 선택하고 Ctrl 클릭은 독립 상세를 연다. 그래프 renderer·배치·공개 selector·DB·sitemap·canonical·Home 레이더는 바꾸지 않았다.
- RED: 이전 production 이미지 `8dff41b05f9347cd2c8a43a26beb16cd9dbf9248fcdecbc44dc53daf0734453f`에서 `scripts/brain-discovery.browser-check.mjs`의 1440/390/320px × JS ON/OFF 6표본 모두 공개 상세 anchor 0개로 실패했다. 기존 HTTP 회귀 21/21은 통과했다.
- GREEN: 새 production 이미지 `294ef66be285a634985da3fbd93c192bd14f170f692a9c20e2522b206e1b4ff2`의 DB 모드 29개(기존 28개+합성 공개 사본), 파일 모드 28개, 개발 서버 DB 모드 29개를 검수했다. 총 18표본의 visible anchor·제목·요약·상세 본문·canonical·가로 넘침 검사를 통과했다. 같은 3환경의 9화면에서 Enter/검색/뒤로가기/Ctrl 새 탭/모바일 필터/배치 전환을 확인했다.
- 공개 경계: 3환경에서 HTTP 회귀 각 21/21 및 추가 14/9/14응답을 확인했다. 비공개 원문·미선택 수정본·미공개·철회 기록은 HTML/RSC/공개 목록/sitemap에 나오지 않는다. DB 공개 사본은 수정만으로 바뀌지 않고 철회 뒤 새 요청의 목록·RSC·사이트맵에서 제거되며 상세는 404다. DB 모드 공개 응답은 no-store를 유지한다.
- 필수 gate: 단위 277 pass/26 DB skip, source lint(`eslint . --ignore-pattern 'private/**'`), typecheck, Docker production build 통과. 최초 단위 실행의 sandbox 임시 파일 접근 실패는 정상 임시 폴더에서 재실행해 통과했다. 기본 lint는 기존 `private/observe-step4`, `private/observe-step5`의 require import 오류 10건이 남는다. 관련 없는 helper는 수정하지 않았다.
- 원자료: Git 제외 `private/seo-brain/`의 `red`, `green`, `boundaries`, `file-catalog`, `dev-final`. Node 24.22.1, Next 16.4.3, 전용 Edge/Playwright를 사용했다. Production 표본 origin은 `http://127.0.0.1:3048`, 개발은 `http://127.0.0.1:3050`, canonical은 합성 `https://hlog.example.org`다. 매 실행의 전용 DB/container/network/임시 credential을 정리했다.
- 재현: 별도 localhost 앱·합성 DB·브라우저를 준비한 harness에서 `verifyBrainDiscovery(browser, origin, publicGraph, outputDirectory)`를 호출한다. checker는 loopback origin만 허용하고 각 JS 모드의 실패를 `discovery.json`에 기록한다. 운영 DB나 사용자 브라우저를 재사용하지 않는다.
- 한계: SEO-04의 기본 발견 결함을 해결한 것이다. 실제 검색 색인/순위·성능/INP 향상은 측정하지 않았다. SEO-07 Home 최근 글 no-JS 직접 링크 제한과 S3의 오류 안내·실제 콘텐츠 성능 후속 검수는 유지한다.

## 다음 단계

S3 Step 0 `local-seo-release-rehearsal`.
