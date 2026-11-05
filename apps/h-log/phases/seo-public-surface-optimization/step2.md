# Step 2: metadata-and-structured-data

## 상태와 선행 조건

completed — 2026-11-05. SEO-05의 페이지별 OG/Twitter 상속을 실제 HTTP로 재현하고 수정했다. 공개 제목/설명·canonical 정책과 기존 Person/WebSite/BlogPosting을 재사용했다. 본문·레이아웃·Home 레이더·승인된 Brain UI는 변경하지 않았다.

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
- `apps/h-log/app/layout.tsx`
- `apps/h-log/app/page.tsx`
- `apps/h-log/app/resume/page.tsx`
- `apps/h-log/app/portfolio/page.tsx`
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/app/brain/page.tsx`
- `apps/h-log/lib/page-social-metadata.ts`
- `apps/h-log/scripts/blog-index-seo.http.test.mjs`
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/app/brain/[slug]/page.tsx`
- `apps/h-log/app/opengraph-image.tsx`
- `apps/h-log/components/seo/JsonLd.tsx`
- `apps/h-log/lib/json-ld.ts`
- `apps/h-log/lib/site-seo.test.ts`

## 작업

1. 실제 렌더된 title/description/canonical/OG URL·이미지/한국어 lang을 읽고 S1에서 확인된 상속/누락/중복만 수정한다. 모든 페이지의 metadata를 무조건 새 helper로 추상화하지 않는다.
2. Person/WebSite/BlogPosting의 JSON을 실제 HTML에서 파싱해 작성자·url·날짜·이미지·본문과 대조한다. React escaping/직렬화가 올바른지 특수문자 합성 사례로 검사한다.
3. BreadcrumbList는 실제 보이는 탐색과 유효 링크가 필요할 때만 추가한다. 검색용 리뷰·FAQ·HowTo·성과·author/조직 정보를 만들어 내지 않는다. 미지원/제한된 rich result는 현재 공식 문서를 확인한다.
4. SEO 테스트는 실제 출력 검증을 추가하고 소스 정규식 통과만으로 schema 유효성을 선언하지 않는다. 내용 변경 없이 dateModified를 현재 시각으로 갱신하지 않는다.

## 인수 기준

표본 페이지의 metadata와 JSON-LD가 실제 공개 내용·canonical과 일치하고 특수문자에서도 파싱된다. 외부 rich-result 지원과 구문 유효성을 구분한다.

## 검증

1. 확인된 metadata/JSON-LD 결함의 focused RED→GREEN과 rendered HTML assertion.
2. 서로 다른 slug·없는/철회된 글·특수문자·공개/관리 origin 사례를 점검한다.
3. 기본 gate와 영향받은 화면 검증. 외부 validator는 공개 자료 또는 합성 자료만 사용하고 결과 한계를 기록한다.

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

## 완료 근거 — 2026-11-05

### 수정 범위

- `withPageSocialMetadata`는 영향을 받는 7개 route 정의에 페이지별 OG/Twitter 제목·설명·URL과 기존 1200×630 대표 이미지를 제공한다. Next의 중첩 metadata 교체 규칙 때문에 두 카드를 함께 지정한다. Home/root metadata와 다른 화면을 일괄 전환하지 않았다.
- 일반 Blog의 OG URL은 표시 페이지 canonical과 같고, 검색/태그는 기존 parser로 정규화한 탐색 URL을 사용한다. 추적 query는 공유 주소에서 제외하며 필터의 noindex·canonical 생략 정책은 그대로다. Blog/Portfolio 상세의 article 유형도 유지한다.
- JSON-LD/본문은 수정할 결함이 재현되지 않아 그대로 뒀다. Person/WebSite/BlogPosting의 작성자·URL·날짜·설명을 실제 HTML에서 확인했다. 기존 목록으로 돌아가기와 관련 링크가 있어 새 BreadcrumbList·FAQ·리뷰 schema를 추가하지 않았다.
- `scripts/blog-index-seo.http.test.mjs`에 실제 출력 회귀를 확장했다. 소스에서 이미지 문자열을 찾던 기존 assertion은 HTTP 이미지 URL·PNG 응답/크기 검증으로 대체했다. 새 의존성·provider·SEO 서비스는 없다.

### 실제 응답과 화면 검증

| 대상 | 결과 |
| --- | --- |
| Home, Resume, Portfolio 목록/서로 다른 상세 2개, Blog 일반/2페이지/범위 밖/검색·태그/서로 다른 상세 2개, Brain 홈/상세의 13주소 × 일반 UA/Twitterbot | title·description과 OG/Twitter의 일치, 단일 공유 태그·공개 origin·대표 이미지 확인. HTML 제한 봇은 OG URL이 head에 있음 |
| 특수문자를 가진 합성 공개 글 2개 × 두 UA | 한글·따옴표·앰퍼샌드·태그·스크립트 종료 문자열·Unicode 줄 구분자가 실제 JSON-LD에서 원래 값으로 파싱됨. 새 script로 실행되지 않음 |
| BlogPosting과 보이는 내용 | H1/설명·작성자·공개 URL·공개일 일치. 명시적인 수정 기록이 있는 글만 dateModified를 가지며 단순 updated_at 변경으로 만들지 않음. 공개일/수정일이 time 요소에도 존재 |
| 없는/초안/철회 Blog, 없는 Brain/Portfolio | 404/noindex, canonical·BlogPosting·비공개 sentinel 없음 |
| 관리자 forwarded host가 섞인 공개 요청 | canonical 설정의 공개 origin 유지, 관리자 origin 미노출. 실제 관리자 ingress 개방/인증 범위 변경은 없음 |
| 기존 OG 이미지 | 200 PNG, 1200×630. 새 글 이미지나 성과를 합성하지 않음 |
| 영향을 받는 10주소 × 1440/390/320 × JS ON/OFF | production/dev 각 60화면, 총 120. 최종 DOM의 공유 정보/JSON-LD, 특수문자 비실행, 가로 넘침·정상 화면 스크립트 오류 없음. Brain no-JS 홈의 기존 로딩 문제는 Step 5에 유지 |

### 환경·RED→GREEN·명령

- 기준 source는 `7e63df9fa0c473e1431fb0e0bae084ca9e1ac2a5`와 이번 커밋의 변경분이다. RED는 기존 `hlog-web:seo-policy` 이미지로 실행해 14개 하위 검사의 홈 공유 정보 상속 실패를 확인했다. Home URL의 끝 슬래시와 기존 상세 OG 제목의 문맥 접미사는 동일한 정상 표현으로 검사에서 구분했다.
- GREEN production은 `hlog-web:seo-metadata`, image ID `sha256:8dff41b05f9347cd2c8a43a26beb16cd9dbf9248fcdecbc44dc53daf0734453f`. 별도 합성 PostgreSQL·공개 Nginx의 `http://127.0.0.1:3048`, canonical용 `https://hlog.example.org`를 사용했다. dev는 같은 변경 소스의 Next dev `http://127.0.0.1:3050`이다.
- Node 24.22.1, Next 16.4.3, Playwright 1.62.1, Edge 156.0.4314.58. 새 인증 없는 context와 공개 경로 allowlist를 사용하고 운영 DB·실제 발행·외부 API는 사용하지 않았다.

```powershell
# helper는 매번 빈 합성 DB를 만들고 migrations/fixture/검증 후 자신이 만든 리소스만 정리한다.
$env:HLOG_SEO_LOCAL_AUDIT='1'
$env:HLOG_SEO_IMAGE='hlog-web:seo-metadata'
$env:HLOG_SEO_BROWSER='1'
node private/seo-metadata/run.mjs
node private/seo-metadata/dev.mjs
node --no-warnings --test --experimental-strip-types lib/site-seo.test.ts lib/json-ld.test.ts lib/blog-crawler-output.test.ts lib/public-site-origin.test.ts
npm run test
npm run lint
node node_modules/eslint/bin/eslint.js . --ignore-pattern 'private/**'
npm run typecheck
docker build --target runner -t hlog-web:seo-metadata .
node private/seo-metadata/validate-docs.mjs
git diff --check
```

- focused 8/8, 전체 단위 **277 pass / 26 DB skip**, production/dev HTTP 각각 **21/21**, source lint·typecheck·Docker 내부 `npm run build` 통과. DB/repository/worker 변경이 없어 DB integration은 실행하지 않았다.
- 기본 `npm run lint`는 기존 Git 제외 `private/observe-step4`, `private/observe-step5`의 CommonJS require 오류 **10건**으로 실패한다. 실행 당시 기존 helper unused import 경고 2건도 있었다. 이번 앱/테스트 소스 lint는 통과하며 전체 lint를 통과했다고 표시하지 않는다. build의 기존 filesystem trace 경고 2건도 유지된다.
- 첫 dev HTTP 검사에서 Home 파일 기반 OG 이미지의 localhost URL만 production 조건과 달랐다. 설치된 Next의 `resolve-opengraph.js`·`resolve-url.js`에서 development 전용 fallback을 확인하고 `HLOG_SEO_HTTP_DEVELOPMENT=1`일 때 **Home의 og:image만** 해당 localhost:port를 기대하게 했다. 기본/production과 나머지 페이지는 공개 HTTPS origin을 계속 강제한다. 앱 코드에 개발용 우회는 없다.
- 원자료와 helper는 Git 제외 `private/seo-metadata/`에 남긴다. `red-confirmed/`, `green/`, `final-http/`, `dev-final/`의 로그·receipt·스크린샷을 사용했다. 각 실행의 컨테이너/네트워크/임시 credential과 dev 자식 프로세스를 정리했다. Next dev가 바꾼 generated type 경로는 시작 시 값으로 복구했다.

### 남은 범위와 공식 근거

[Next metadata 지침](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)의 중첩 병합·streaming 규칙과 [Google 구조화 데이터 정책](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)을 2026-11-05 확인했다. 구문/본문 일치는 로컬 검증 결과이며 외부 Rich Results Test·실제 색인·검색 순위·카드 캐시 갱신은 검증하지 않았다. 기존 JSON-LD를 파싱할 수 있다는 사실이 검색 표시를 보장하지 않는다.

Brain 기본 발견은 Step 5, Home 최근 글은 Step 4, no-JS DB 오류의 빈 500 화면은 S3 Step 0에 남아 있다. 성능은 다음 Step 3에서 측정한다. 실제 운영 적용·GSC 제출·공개 발행·timer는 기존 보류를 유지한다.

## 다음 단계

S2 Step 3 `measured-page-performance`.
