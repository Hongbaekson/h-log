# Step 1: server-rendered-blog-discovery

## 상태와 선행 조건

completed — 2026-11-04. Step 0의 `32abacd`에서 일반/2페이지/태그 no-JS 목록이 이미 복구되어 앱 구현은 clean-no-op로 마쳤다. 이번 변경은 실제 검수 결과와 phase/계획 문서다. 새 정상 탐색 결함이 없어 production code·테스트·의존성을 추가하지 않았다.

인수 기준인 인증 없는 일반 목록→상세→다음 페이지와 JS 검색·필터·오류 재시도를 확인했다. **no-JS DB 장애의 500 응답은 유지되지만 화면 본문은 비어 있다.** 이 한계를 정상/빈 목록의 발견 문제와 구분하고 [S3 Step 0](../seo-release-and-measurement/step0.md)의 후속 검토에 남긴다. Brain 발견 결함 SEO-04는 UI를 보존하는 Step 5의 대상이다.

## 읽을 파일

경로는 저장소 루트 기준이다. S1 이후 생성된 adapter·감사 보고서와 앞 단계의 완료 기록도 먼저 읽는다. 아래 목록은 계획 등록 시 존재하는 파일이다.

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
- `apps/h-log/.codex/docs/harness/SEO_OPTIMIZATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/SEO_AUDIT_BASELINE.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/seo-public-surface-optimization/index.json`
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/scripts/blog-index-seo.http.test.mjs`
- `apps/h-log/components/blog/BlogSearchPanel.tsx`
- `apps/h-log/components/blog/BlogPagination.tsx`
- `apps/h-log/app/brain/page.tsx`
- `apps/h-log/app/brain/[slug]/page.tsx`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`
- `apps/h-log/phases/backend-operations-lab/step1.md`

## 작업

1. production build에서 JS OFF의 일반 `/blog`가 loading 안내에 머무는 기존 현상을 먼저 재현한다. 소스만 보고 고치지 않으며 재현되지 않으면 환경 차이와 정상 증거를 기록한다.
2. 확인된 경우 공개 목록·일반 페이지 이동·글 href를 서버 HTML에서 읽게 하는 최소 변경을 한다. 검색 API와 client 필터·서버 loading/error 경계를 함께 보존하고 별도 블로그 데이터 복사본을 만들지 않는다.
3. JS ON/OFF의 공개 제목·링크·본문이 같은 published-current 정책을 따르는지 확인한다. 숨겨진 SEO 전용 글 목록이나 봇 전용 다른 본문을 추가하지 않는다.
4. 공개 Brain의 독립 상세/목록 링크도 감사 표본으로 확인하되 이 단계의 구현은 Blog 발견 문제에 한정한다. Brain에 별도 결함이 확인되면 UI 보존 조건을 포함한 후속 step으로 분리한다.

## 인수 기준

인증 없는 no-JS 방문자가 일반 Blog 목록에서 공개 글과 다음 페이지로 이동하고, JS 검색·필터/오류 재시도도 유지된다. 이미 해결돼 있다면 근거 있는 no-op로 기록한다.

## 검증

1. 실제 브라우저 JS OFF 또는 HTTP HTML에서 공개 글 anchor를 확인하는 RED→GREEN.
2. JS ON/OFF·키보드·1440/390/320px·빈 목록·DB 오류의 기본 읽기를 검증한다.
3. site/crawler/public-read 회귀와 기본 gate. 공개 데이터/hash·Home 레이더·Memory UI가 바뀌지 않았는지 diff 확인.

Production code를 바꾸면 focused RED→GREEN 뒤 다음 기본 gate를 실행한다. 문서/콘텐츠만 바꾼 경우 관련 파서·형식 검사로 범위를 좁힌다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 하지 말 것

- SEO 점수 때문에 비공개 데이터·관리 경로를 공개하지 말 것. 인증/공개 사본 정책이 SEO보다 우선한다.
- 근거 없는 경험·성과·검색량·구조화 데이터를 만들지 말 것. 기존 공개 근거와 한국어 작성 기준을 보존한다.
- 원격 installer·extension·새 provider·전체 upstream agent 실행을 자동 적용하지 말 것. 이 단계에서 필요한 자료와 도구만 사용한다.
- 운영 보류를 해제하거나 DNS/TLS·GSC 제출·실제 글/PDF 발행을 계획 승인만으로 수행하지 말 것. 로컬 변경과 외부 상태 변경은 별도 범위다.
- Home 레이더·승인된 Brain UI·DB published-current/hash를 SEO 작업에 섞어 전면 변경하지 말 것.

## 완료 근거 — 2026-11-04

### 범위와 환경

- 작업 기준: `32abacd9822f294e1a74c6e6288e1f5bc2530989`. Step 0에서 빌드·검수한 `hlog-web:seo-policy` 이미지 `sha256:07837c516a7c151e0bde068e4d5671959855c00c53dc43a7ad5a59b899b614b3`를 재사용했다. 앱 코드가 그대로여서 재빌드·dev 검수는 반복하지 않았다.
- 별도 합성 PostgreSQL의 공개 글 8개·초안 1개·철회 1개, 공개 Nginx ingress `http://127.0.0.1:3048`, canonical용 `https://hlog.example.org`. 실제 도메인/운영 DB/인증 정보는 사용하지 않았다.
- Node 24.22.1, Playwright 1.62.1, Edge 156.0.4314.58. 인증 없는 새 context에서 1440/390/320 × JS ON/OFF를 검사했다. Blog/Brain·정적 자원과 합성 공개 검색 API만 허용하고 다른 경로의 prefetch는 차단했다. 검색 실패는 브라우저에서 첫 API 응답을 503으로 주입한 뒤 실제 API 재요청으로 복구했다.

### 관측과 판정

| 표본/동작 | 결과 |
| --- | --- |
| 일반 목록·2페이지·PostgreSQL 태그, 18화면 | 200, 보이는 공개 글 링크 각각 6/2/6개. loading에 머물지 않음 |
| 목록→상세, 6화면 | 링크에 키보드 Enter로 이동해 공개 제목·본문을 읽음. 상세의 목록 링크로 복귀 |
| 페이지/필터 동작, 6조합 | 다음/이전 링크·뒤로가기·태그 선택·검색/필터 초기화 정상. JS 없이도 동작 |
| 없는 태그, 6화면 | 200과 해당 태그에 공개 글이 없다는 안내. 공개 글 링크 0개, 초기화로 복귀 |
| 공개 글 0개인 목록의 page=2, 6화면 | 200, 첫 페이지 canonical, 빈 목록 안내. 가짜 글·빈 페이지 이동 링크 없음 |
| JS 검색, 3개 viewport | 오류 안내→같은 검색어 Enter 재제출→실제 검색 6개→2페이지 2개, 없는 검색어의 빈 결과 정상 |
| DB 읽기 실패, 6화면 | 모두 HTTP 500과 공개 글 링크 0개. JS ON 3화면은 안전한 안내와 다시 시도 버튼, DB 복구 뒤 6개 목록으로 복귀. JS OFF 3화면은 **빈 본문**이며 DB 복구 뒤 브라우저 새로고침으로 200/목록 복귀 |
| Brain 홈/상세, 4표본 | 기본 그래프 상세 anchor 0개, no-JS 홈은 loading. 공개 상세는 두 모드 모두 제목과 관련 상세 링크 4개가 보임. 기존 SEO-04를 Step 5에 유지 |

위 42개 Blog 표본은 정상·빈 목록·장애의 관측 수다. **no-JS 장애 안내까지 42개 모두 정상이라는 의미가 아니다.** 정상 화면의 스크립트 오류·가로 넘침은 없었다. 320px 빈 목록/JS 오류 스크린샷도 직접 확인했다. 합성 글의 status/current version/content hash를 포함한 posts/post_versions 전체 값이 검수 전후 같았고, 초안/철회 본문은 HTTP와 보이는 화면에서 노출되지 않았다.

### 실행한 검증

```powershell
$env:HLOG_SEO_LOCAL_AUDIT='1'
$env:HLOG_SEO_BROWSER='1'
node private/seo-discovery/run.mjs
node --no-warnings --test --experimental-strip-types lib/site-seo.test.ts lib/blog-crawler-output.test.ts lib/public-site-origin.test.ts lib/blog-public.test.ts lib/blog-discovery-ui.test.ts lib/blog-search-ui.test.ts
node private/seo-discovery/validate-docs.mjs
git diff --check
```

- 기존 `scripts/blog-index-seo.http.test.mjs`: **6/6**. 일반/query canonical·noindex, 공개/철회/없는 상세, sitemap/feed/llms, 기존 308, DB 장애 500·정상 빈 목록 200을 확인했다.
- 가까운 공개 읽기·검색·crawler/SEO 테스트: **61/61**, skip 없음. 이번 커밋은 문서/JSON만 바꾸므로 전체 test/lint/typecheck/build와 DB integration은 다시 실행하지 않았다. Step 0의 기본 lint에는 기존 private helper 오류 10건이 남아 있으며 이번에 고쳤거나 통과했다고 표시하지 않는다.
- JSON/Markdown 파싱·내부 링크·phase 수와 다음 단계·운영 보류 유지, `git diff --check`를 검사했다. Home 레이더·승인된 Brain UI·공개 selector·원문/hash·의존성·배포 파일의 변경은 없다.
- 실행 helper·HTTP/브라우저 원자료·스크린샷은 Git 제외 `private/seo-discovery/verification/` 및 상위 helper 파일에 보관한다. 생성한 컨테이너 3개·네트워크 1개·임시 credential 파일을 정리했다.

### 남은 한계

no-JS 검색 결과의 서버 렌더링은 이번 일반 목록 발견 인수 범위에 포함하지 않았다. no-JS DB 장애는 현재 Next 오류 응답의 빈 화면으로 남는다. [S3 Step 0](../seo-release-and-measurement/step0.md)에서 이를 재현하고, 5xx를 유지하는 안내 방안을 별도 판단한다. 안내를 만들기 위해 오류를 200/빈 목록으로 숨기거나 새 proxy/DB 복사본을 추가하지 않았다. Brain·공유 metadata·Home 최근 글·성능/실제 검색 성과는 각 후속 단계의 범위다.

## 다음 단계

S2 Step 2 `metadata-and-structured-data`.
