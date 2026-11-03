# Step 0: crawl-and-index-policy

## 상태와 선행 조건

completed — 2026-11-04. [감사 기준선](../../.codex/docs/harness/SEO_AUDIT_BASELINE.md)의 SEO-01/02/06을 실제 HTTP RED→GREEN으로 수정했다.

SEO-01/02/06: 페이지·검색/필터 정책과 DB 읽기 실패 시 목록 200을 각각 확인하고 index/status 계약을 고정한다.

S1 감사 기준선과 공개 URL 표본이 있어야 한다.

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
- `apps/h-log/lib/blog-search-ui.ts`
- `apps/h-log/components/blog/BlogPagination.tsx`
- `apps/h-log/app/robots.txt/route.ts`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/lib/blog-crawler-output.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/public-site-origin.ts`
- `apps/h-log/next.config.ts`

## 작업

1. S1 발견을 근거로 route별 index/canonical/status 계약을 표로 확정한다. 일반 `/blog?page=N`은 서로 다른 글 목록이므로 유효한 page 2+ self canonical을 기본안으로 삼는다. `q`와 조합 필터는 초기 noindex·정규화 정책, tag 전용 색인은 별도 고유 내용이 준비된 경우에만 검토한다.
2. page=1·잘못된 page·빈 결과·추적 query·중복 query의 의미를 구분하고 기존 URL 검색/뒤로가기 동작을 보존한다. canonical/noindex를 상충되게 겹쳐 검색 결과가 다른 문서의 복제본인 것처럼 표시하지 않는다.
3. robots·sitemap은 같은 public origin과 승인된 공개 selector를 사용한다. sitemap에는 200 canonical URL만 포함하고 lastmod는 실제 내용 변경 근거가 있을 때만 넣는다.
4. 공개 /admin·internal API 차단, PDF 다운로드 noindex, /projects 308·없는 slug 404를 유지한다. robots Disallow를 삭제해 관리자 내용을 검사하거나 crawler에게 별도 우회 응답을 만들지 않는다.
5. 확인한 독립 결함이 여러 페이지에 걸치면 작은 step으로 분리한다. 이 단계에서 실제 DNS/production robots 제출이나 운영 sitemap ping을 하지 않는다.

## 인수 기준

페이지·검색·태그·정적/상세 주소의 canonical/index 정책이 HTTP 응답에서 일치하고 private·철회·오류 URL이 sitemap에 포함되지 않는다.

## 검증

1. canonical/robots/meta·상태/redirect·query normalization focused RED→GREEN.
2. 합성 published/withdrawn/없는 slug·page 2·빈 결과·DB 실패의 실제 HTTP와 sitemap을 비교한다.
3. 코드 기본 gate와 변경 UI의 데스크톱/모바일·뒤로가기 회귀. DB selector를 바꾸면 관련 integration도 실행한다.

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

## 다음 단계

S2 Step 1 `server-rendered-blog-discovery`.

## 확정한 URL·색인 계약 — 2026-11-04

| 요청/상태 | HTTP | canonical / robots | 처리 |
| --- | --- | --- | --- |
| 일반 `/blog` 또는 유효한 page 2+ | 200 | 첫 페이지 `/blog`, 나머지는 `/blog?page=N`; noindex 없음 | 실제 표시한 공개 목록 페이지를 기준으로 계산 |
| page=1/0/음수/소수/문자/안전 정수 범위 초과 | 200 | 기존 parser가 선택한 첫 페이지 `/blog` | 사용자 URL을 강제 redirect하지 않음 |
| page=02, 중복 page, tracking query | 200 | 정규화한 표시 페이지; tracking 제외 | 기존 첫 번째 query 값 우선 규칙 유지 |
| 범위를 넘는 양의 page | 200 | 실제 표시한 마지막 페이지 | 기존 clamp 동작 유지. 8개 fixture에서 page=99는 page=2 canonical |
| 빈 query/tag 또는 공백만 입력 | 200 | 일반 목록 규칙 | 기존 trim/공백 정리 재사용 |
| 검색·태그·검색+태그/페이지 조합, 결과 없음 | 200 | `noindex, follow`, canonical 없음 | 기본 목록의 복제 문서라고 표시하지 않음. 태그 고유 내용이 없는 현재 정책 |
| 공개 글 자체가 없는 정상 DB | 200 | `/blog`, noindex 없음 | 빈 목록 문구. DB 실패와 구분 |
| 목록 DB 읽기 실패 | 500 | 성공 목록을 먼저 보내지 않음 | Next의 오류 경계 사용. 새 proxy·DB 접근 경로·가짜 빈 store 추가 없음 |
| 공개 상세 / 비공개·철회·없는 상세 | 200 + self canonical / 404 + noindex | 기존 정책 유지 | 공개 selector/hash·Markdown·crawler 계약 변경 없음 |
| sitemap, robots, RSS/llms, `/projects` | 기존 정책 유지 | 공개 canonical origin / 308 `/portfolio` | query 변형은 sitemap에 추가하지 않음 |

`generateMetadata`는 화면과 같은 URL parser·공개 index의 currentPage를 사용한다. `loadPublicBlogContentStore`의 기존 요청 단위 React cache를 재사용한다. 검색/태그의 제외 결정은 비어 있지 않은 정규화 값으로 판단하며 본문은 기존 검색 UI가 처리한다.

`app/blog/(index)/loading.tsx`가 DB 결과 전에 200 응답을 시작하던 것이 오류 상태 계약의 원인이었다. 이 경계를 제거해 실패 시 500을 유지한다. 그 결과 일반/2페이지/태그의 no-JS 목록도 실제로 보였다. 정상 목록의 초기 응답은 DB 읽기를 기다리는 방식이며 별도 로딩 화면은 없고 기존 오류 UI·클라이언트 검색 전환 상태는 유지한다. Blog 발견 Step 1은 이 결과를 기준으로 남은 인수 조건을 확인하고, 이미 충족한 부분은 근거 있는 no-op로 처리한다.

## 검증과 실행 기록

- 앱 기준 `31fc600`에서 쓰던 production baseline 이미지로 새 `scripts/blog-index-seo.http.test.mjs`를 먼저 실행했다. page 2 canonical(`/blog`), 검색 noindex 누락, DB 실패의 200이 각각 기대한 이유로 실패했다. 공개 경계와 정상 빈 목록은 기존부터 통과했다.
- 수정 이미지 `hlog-web:seo-policy` / `sha256:07837c516a7c151e0bde068e4d5671959855c00c53dc43a7ad5a59b899b614b3`의 실제 공개 Nginx에서 **HTTP 6/6**, 개발 서버에서도 **6/6** 통과했다. 일반 URL 13개·검색/태그 조합 7개·공개/철회/없는 글·crawler·DB 오류·빈 DB를 포함한다.
- production과 dev에서 각각 `/blog`, page 2, 태그 × JS ON/OFF × 1440/390/320px = 18화면, 총 **36화면** 검수. 보이는 공개 링크 6/2/6개, 가로 overflow와 pageerror 없음. 키보드 검색·태그 유지·페이지 이동·뒤로가기를 확인했다. 검색 API는 합성 데이터의 기능 회귀 검사에만 허용했다.
- 가까운 17/17, 전체 단위 **277 pass / 26 DB skip**, typecheck와 Docker 내부 `npm run build` 성공. 기본 샌드박스의 기존 테스트 3개가 loopback/임시 파일 제한으로 실패해 Node 24와 필요한 로컬 권한으로 동일 suite를 재실행했다.
- `npm run lint`는 기존 Git 제외 `private/observe-step4`, `private/observe-step5`의 CJS import 오류 10건과 이전 감사 helper 경고 1건으로 실패했다. `node node_modules/eslint/bin/eslint.js . --ignore-pattern 'private/**'`는 통과했다. 추적 코드의 새 lint 오류는 없다.
- build의 기존 동적 filesystem tracing 경고 2개를 기록했다. 설치 로그의 전체 의존성 경고는 production 영향과 구분했으며 `npm audit --omit=dev --json`은 **0건**이다. 패키지 버전은 바꾸지 않았다.
- JSON/Markdown·상대 링크·phase 수·`git diff --check` 검증. DB/repository/migration 변경이 없으며 별도 전체 DB integration은 재실행하지 않았다. HTTP 검수 자체는 새 합성 DB에 migration을 적용하고 실제 repository로 seed했다.
- private 증거 `private/seo-policy/{red,green,dev}/`와 검증 로그를 보관했다. 두 production 리허설의 컨테이너 6개, dev DB 1개, 전용 네트워크 3개·임시 secret 및 직접 시작한 dev process를 정리했다. 기존 서비스·운영 상태는 변경하지 않았다.

### HTTP 테스트 재현

새로 migration한 **빈 합성 DB**의 이름은 `hlog_seo_`로 시작해야 한다. 해당 DB를 사용하는 production app + 공개 Nginx(또는 dev)를 loopback에 시작하고 다음 환경을 지정해 `npm run test:seo:http`를 실행한다.

- `HLOG_SEO_HTTP_TEST=1`
- `HLOG_SEO_HTTP_ORIGIN=http://127.0.0.1:<검수 포트>`
- `HLOG_PUBLIC_BASE_URL=https://hlog.example.org` — 앱과 테스트가 동일하게 사용
- `DATABASE_URL` — loopback의 위 합성 DB만 사용. secret은 로컬 env로 주입

테스트는 합성 글 10개를 만들고 잠시 테이블 이름/fixture 상태를 바꾼다. 실제 DB에서 실행하지 않는다. 종료 후 호출자가 합성 DB를 제거한다. 기본 실행에서는 명시 opt-in 없이는 skip한다. 일회성 Docker/dev 준비 helper는 Git 제외 `private/seo-policy/`에 있다.

완료 상태: SEO **completed 3·pending 7·blocked 1**, 다음은 **S2 Step 1 `server-rendered-blog-discovery`**. 실제 도메인 색인·GSC·배포·timer는 기존 보류 상태다.
