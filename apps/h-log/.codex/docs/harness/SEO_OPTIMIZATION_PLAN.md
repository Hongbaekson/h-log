# H-Log SEO 개선과 claude-seo의 Codex 도입 계획

등록일: 2026-10-26. 요청은 claude-seo를 Codex에서 활용할 방법과 H-Log SEO 개선 순서를 정리해 커밋·푸시하는 것이다. **이번 변경은 계획 등록이다. 스킬 설치, 전체 SEO 감사, 앱 수정, 실제 도메인 제출은 하지 않았다.** 새 트랙은 3개 phase / 10개 step(pending 9·blocked 1)이다.

A4·모니터링 Step 0 계약과 A2 Steps 0–2 완료 후 일반 다음 작업은 `admin-blog-publishing / Step 3`이다. SEO를 지정해 진행하면 S1 Step 0부터 시작할 수 있고, 일반 관리자 작업과 독립적으로 진행한다. 운영 SEO 확인은 기존 OCI 보류 해제·공개 도메인 확정 뒤에만 가능하다. 이 계획은 관리자·모니터링·timer의 기존 실행 순서를 바꾸지 않는다.

## 1. 검토한 원본과 도입 결론

기준은 [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo)의 **2.5.0 / commit `6be93f45064ffbadced572b5d5c95f55fd263af0`**다. GitHub main의 commit 시각은 2026-10-22T16:47:38Z이고 2026-10-26에 API와 고정 commit의 소스를 확인했다. H-Log 비교 기준은 `4682e30`이다. 이후 도입할 때 변경된 main을 자동 설치하지 말고 이 기준과 차이를 먼저 확인한다.

Codex용으로 **필요한 SEO 지침을 선별해 저장소 스킬 `hlog-seo`로 이식하는 방식**을 권한다. 원본의 설치 명령을 Codex 명령처럼 실행하지 않는다. [Codex 공식 문서](https://learn.chatgpt.com/docs/build-skills)는 `name`·`description`이 있는 SKILL.md와 저장소 `.agents/skills/` 검색을 설명한다. 기본 예정 경로는 루트 `.agents/skills/hlog-seo/`이며 S1에서 실제 앱의 검색·명시 호출까지 확인한다. 기존 `.codex/skills` 전체를 이동하거나 같은 스킬을 양쪽에 중복 설치하지 않는다.

| 원본에서 확인한 항목 | H-Log의 적용 방식 |
| --- | --- |
| [메인 스킬](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/skills/seo/SKILL.md)의 `/seo`, Claude 도구·agent 호출 | `$hlog-seo` 명시 호출과 현재 Codex 도구에 맞춘 지침으로 변환. 이식 전 원본 스킬이 Codex에 설치됐다고 표현하지 않음 |
| [아키텍처](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/docs/ARCHITECTURE.md)의 skill/reference 분리 | page·technical·schema·sitemap·content·images·GEO의 필요한 참고 자료만 읽음. 전체 agent/extension 복제나 상시 다중 agent 실행은 기본값으로 두지 않음 |
| [Windows installer](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/install.ps1)의 `.claude` 설치와 경로 치환 | 전역 installer·사용자 Claude 설정을 변경하지 않고 repo 안의 명시적 adapter로 관리 |
| [runtime.py](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/scripts/runtime.py)의 launcher, Python 환경과 별도 데이터 위치 | 초기 adapter는 지침 중심. 기존 HTTP/브라우저/Node 검증을 우선 사용. Python helper가 꼭 필요할 때만 격리 환경·고정 의존성·doctor 결과를 별도 기록하고 web/worker image에는 넣지 않음 |
| [schema hook](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/hooks/hooks.json)의 PostToolUse | Codex에서 자동 실행된다고 가정하지 않음. H-Log의 실제 HTML에 있는 JSON-LD를 명시적으로 파싱하는 테스트로 검증 |
| [URL 안전 검사](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/scripts/url_safety.py) | 사설 주소 차단을 유지. `CLAUDE_SEO_LOCAL_TARGETS`는 첫 URL의 host:port 예외일 뿐 redirect·subresource·브라우저 요청 전체 허용이 아님. 로컬 화면은 별도 loopback 검증으로 읽고 차단을 해제해 해결하지 않음 |
| [MIT LICENSE](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/LICENSE) | 이식한 자료에 LICENSE·원저작자·원본 경로/commit·변경점을 보존. FLOW 등 별도 라이선스 자료와 상용 extension은 이번 기본 범위에서 제외 |

이것은 소스 검토에 따른 이식 제안이며 Codex 호환 실행을 이미 증명한 결과는 아니다. S1 Step 0에서 자동 인식·명시 호출·경로·도구 누락·외부 행동 경계를 실제로 확인해야 한다. 원본의 AGENTS/설치 지침은 분석 자료이며 H-Log 지침을 대체하지 않는다.

## 2. H-Log에서 이미 있는 것과 확인할 것

SEO 기반을 다시 만드는 대신 아래 차이를 실제 응답으로 확인한다. 이 표의 후보는 영향이나 검색 순위를 측정한 결론이 아니다.

| 현재 근거 | 확인한 사실 | 다음 검증/개선 |
| --- | --- | --- |
| `app/layout.tsx`, `lib/public-site-origin.ts` | 한국어 lang, title template, OG/Twitter, Person/WebSite, 명시적 production HTTPS origin | 각 페이지의 최종 head/본문과 public/admin origin 분리, title·description·OG URL 상속 확인 |
| `app/blog/(index)/page.tsx` | 검색/태그/page는 URL 상태를 사용하지만 metadata canonical은 `/blog`로 고정 | 일반 페이지 2+의 self canonical, 검색/태그 조합의 index 정책을 구분. 전부 첫 페이지로 합치거나 전부 색인시키지 않음 |
| `PUBLIC_EXPERIENCE_PLAN.md`, `backend-operations-lab/step1.md` | 2026-10-22 no-JS `/blog` 목록이 loading 안내에 머무른 기록 | S2 Step 1에서 production build로 재현 후 목록·페이지 링크의 기본 HTML 복구. 이번에는 재현/수정했다고 주장하지 않음 |
| `app/brain/page.tsx`, `app/brain/[slug]/page.tsx` | 그래프 화면과 독립 상세 route·canonical·404가 존재 | JS 없이 공개 목록→상세 발견, 그래프의 `?note=`와 상세 주소 관계 확인. 기존 Memory UI는 보존 |
| `app/robots.txt/route.ts`, `app/sitemap.xml/route.ts` | 관리자/API Disallow, 정적·Portfolio·공개 Blog/Brain sitemap | 정상 200 canonical URL만 포함, 철회/404/장애·query 중복·lastmod 검증. robots는 인증 대체 수단이 아님 |
| `app/blog/[slug]/page.tsx`, `components/seo/JsonLd.tsx` | BlogPosting·실제 공개일·명시적 수정일·안전한 직렬화 | 렌더된 JSON-LD의 파싱·본문/작성자/날짜/URL 정합성. 필요한 BreadcrumbList는 보이는 탐색과 함께 검토 |
| `lib/blog-crawler-output.ts`, Markdown route | published-current 기반 RSS·llms·Markdown 존재 | HTML과 같은 공개 버전/hash·철회 반영 확인. 기존 Blog-only RSS/llms 범위를 임의 확장하지 않음 |
| 공개 관련 글·프로젝트·시리즈와 한국어 작성 가이드 | 근거·읽기 순서·내부 연결이 존재 | 고립된 공개 글, 애매한 제목/도입·출처/한계·실제 문제 해결 검색 의도 보완 |
| `lib/site-seo.test.ts` | metadata 일부는 소스 정규식 검사 | 소스에 문자열이 있다는 검사와 실제 HTTP/DOM/JSON-LD 결과를 구분해 보강 |
| PDF Step 1의 audit 기록 | 기존 Next.js 16.2.11 포함 production dependencies에 critical 경고 | 기존 보안 패치 작업의 완료 확인을 배포 전 필수 조건으로 유지. 이 계획 등록으로 패치했다고 표시하지 않음 |

현 상태에서 실행한 가까운 기준선은 `site-seo.test.ts`, `blog-crawler-output.test.ts`, `public-site-origin.test.ts`의 **7/7 통과**다. 전체 crawler 감사·PageSpeed/CrUX·실제 색인/순위·Codex adapter는 아직 미검증이다.

## 3. 적용할 범위와 목표

대상은 한국어 개인 개발자 포트폴리오와 기술 블로그다. 이름/역할 검색과 실제 기술 문제의 해결 기록을 연결한다. 우선 주제 후보는 Java/Spring, Redis·Pub/Sub·비동기 처리, 장애 복구, 관측성, 개발 자동화이며 공개 근거가 있는 자료만 사용한다. 검색량·경쟁도·성과를 숫자로 추정해 채우지 않는다.

- **기술 SEO:** canonical·indexability·상태 코드·redirect·sitemap·기본 HTML·구조화 데이터·성능을 확인한다.
- **내용과 탐색:** 근거가 있는 경험, 문제/선택 이유/결과/한계, 관련 글/프로젝트/시리즈의 자연스러운 링크를 다룬다. 한국어 문장을 키워드 반복이나 정해진 글자 수에 맞춰 늘리지 않는다.
- **AI 검색:** 이미 있는 읽을 수 있는 HTML·Markdown·llms, 명확한 출처와 문맥을 점검한다. [Google의 AI 검색 안내](https://developers.google.com/search/docs/appearance/ai-features)는 별도 AI 파일·특수 schema를 요구하지 않는다. GEO 점수·llms 존재를 순위나 인용 보장으로 취급하지 않는다.
- **제외:** LocalBusiness/주소·전화 공개, 쇼핑/상품 schema, hreflang 다국어 확장, 대량 키워드 페이지, backlink 구매/대외 연락, WebMCP 도입, 외부 SEO SaaS·새 분석 tracker, 자동 발행/상시 감사 scheduler. 필요하면 별도 요청에서 다룬다.

schema는 [Google 구조화 데이터 정책](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)에 따라 보이는 사실과 맞춘다. 점수 때문에 임의 리뷰·성과·조직·날짜를 만들거나 FAQ/HowTo 등 지원 여부가 달라진 rich result를 무조건 추가하지 않는다. [JavaScript SEO 안내](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)를 기준으로 원문 HTML과 JS 실행 결과를 모두 확인하되 모든 봇에 별도 내용을 제공하는 우회 렌더링은 만들지 않는다.

## 4. 안전한 감사와 결과 형식

1. 감사 모드를 `source`, `local`, `public`으로 구분한다. source는 현재 공개 selector/route만 조사한다. local은 합성 DB·명시한 loopback public ingress, public은 확정한 실제 공개 origin만 읽는다. 브라우저 인증 저장소나 관리자 Basic header를 재사용하지 않는다.
2. `/admin/**`, `/api/internal/**`, 비공개 Brain 원문/버전, 이력서 PDF 바이트/preview, DB dump, `.env`와 회사 Wiki는 crawler 발견·스크린샷·외부 전송 대상에서 제외한다. 접근 차단 검증만 무인증 음성 fixture로 실행한다. 미래 `/api/resume/pdf`도 의도된 다운로드/noindex 경계를 유지한다.
3. 같은 origin 공개 URL allowlist에서 최대 100개·동시 2개·요청 간격 최소 500ms·요청 timeout 20초를 초기 예산으로 둔다. 초과분은 미검사로 기록하고 임의 확장하지 않는다. 브라우저는 대표 8개 이내로 시작하고 q/tag/page 조합을 무한 생성하지 않는다. 리다이렉트의 목적지·정적 자산도 범위에 맞는지 확인한다.
4. 원본 HTML·스크린샷·Lighthouse JSON·계정 export는 `apps/h-log/private/seo/`에 보관한다. 커밋할 감사 문서에는 공개 경로, 최소 증거, 도구/버전·앱 SHA·환경·시각·재현 명령만 넣고 민감한 원문/키/쿼리는 제외한다. 모델에 제공하는 자료도 공개 가능 범위로 한정한다. 로컬 파일 출력이라는 이유로 모델 전송까지 없다고 설명하지 않는다.
5. 각 발견은 `ID / 확인한 사실 / 후보 원인 / URL·코드 위치 / 재현 / 영향 / 우선순위 / 담당 step / 검증 / 상태`로 기록한다. 미측정은 `not-measured`, 해당 없음은 이유와 `not-applicable`로 둔다. 도구 점수를 검색 순위로 바꾸지 않는다.
6. 결함이 없으면 근거 있는 `clean-no-op`로 끝낸다. 여러 독립 결함이 확인되면 구현 전에 작은 step으로 분리하고 레지스트리를 갱신한다. 서로 다른 페이지/배포 구성을 한 변경으로 묶지 않는다.

## 5. Phase / Step

| Phase | Step | 이름 / 결과 | 상태 |
| --- | --- | --- | --- |
| S1 `seo-codex-foundation` | 0 | Codex용 선별 이식·출처/라이선스·명시 호출 검증 | pending |
| S1 | 1 | 공개 route 표본과 실제 HTTP/HTML·JS/no-JS 감사 기준선, 우선순위 목록 | pending |
| S2 `seo-public-surface-optimization` | 0 | 검색/태그/페이지·canonical·robots·sitemap 정책과 HTTP 검증 | pending |
| S2 | 1 | no-JS 블로그 목록 재현/해결과 공개 콘텐츠 발견 경로 | pending |
| S2 | 2 | 페이지별 metadata·OG·실제 JSON-LD와 보이는 내용 정합성 | pending |
| S2 | 3 | production build의 이미지·폰트·JS 성능 측정과 확인된 병목 개선 | pending |
| S2 | 4 | 기술 글의 검색 의도·근거·내부 링크·AI 읽기 일관성 | pending |
| S3 `seo-release-and-measurement` | 0 | 공개/비공개·철회/오류 회귀와 배포 전 SEO 확인 기록 | pending |
| S3 | 1 | 승인된 실제 도메인·Search Console·sitemap/색인 검증 | blocked |
| S3 | 2 | 데이터가 쌓인 뒤 전후 비교와 다음 개선 선정 | pending |

각 파일은 [S1](../../../phases/seo-codex-foundation/index.json), [S2](../../../phases/seo-public-surface-optimization/index.json), [S3](../../../phases/seo-release-and-measurement/index.json)에 등록한다. S1→S2→S3 순서다. S3 Step 1은 도메인/소유권·OCI 보류·계정 사용 범위가 해결돼야 시작한다. S3 Step 2는 실제 데이터가 있어야 실행하며 예약 작업이나 알림을 지금 만들지 않는다.

## 6. 완료 기준과 측정

| 구분 | 통과/기록 기준 |
| --- | --- |
| Codex 도입 | 고정 upstream·선별 자료·MIT/출처·경로가 확인되고 `$hlog-seo` 명시 호출과 의도하지 않은 작업의 비활성 검증. 외부 extension/자동 발행 없음 |
| HTTP/색인 | 표본의 의도된 200/308/404/503·canonical·robots·sitemap 일치. 일반 page 2+를 page 1 복제로 처리하지 않음. 검색 query 중복 정책을 명시 |
| HTML/데이터 | no-JS 기본 탐색, 파싱 가능한 JSON-LD와 visible content 일치. private/철회 sentinel이 HTML/RSC/Markdown/feed/llms/sitemap에 0건 |
| 로컬 성능 | 같은 빌드·브라우저·조건에서 모바일/데스크톱 대표 route를 3회 측정해 중앙값·편차·LCP/CLS/TBT·JS/이미지 크기 기록. 측정 전 임의 점수 목표나 성과 수치 없음 |
| 실제 CWV | [Core Web Vitals 기준](https://web.dev/articles/vitals)의 p75 LCP ≤2.5초·INP ≤200ms·CLS ≤0.1을 목표로 삼음. 로컬 TBT를 field INP로 표시하지 않으며 CrUX 표본 부족은 미측정 |
| 실제 검색 성과 | 소유한 GSC의 노출·클릭·CTR·평균 위치·색인 상태를 query/page·기기별로 확인. 초기 28일과 다음 비교 기간의 콘텐츠/배포 변경을 기록하고 부족한 표본으로 인과관계를 단정하지 않음 |
| 회귀 | 코드 변경은 focused RED→GREEN 및 test/lint/typecheck/build, DB 경계 변경 시 integration. UI 변경은 1440/390/320px와 키보드/no-JS·기존 레이더/Brain UI 유지 |

### 계획 등록 검증 — 2026-10-26

- 기존 SEO 기준선: `node --no-warnings --test --experimental-strip-types lib/site-seo.test.ts lib/blog-crawler-output.test.ts lib/public-site-origin.test.ts` → 7/7 통과.
- 변경 파일 22개 중 Markdown 18개 파싱, 전체 phase JSON 49개 파싱, 새 상대 링크 11개와 step의 읽을 파일 경로 213개 확인, `git diff --check` 통과.
- 전체 48개 phase / 172개 step 중 이번 SEO 트랙은 3개 / 10개(pending 9·blocked 1). 기존 레지스트리 항목·상태와 관리자 다음 단계 A4 Step 2가 바뀌지 않았음을 대조했다.
- 앱 코드·패키지·배포 설정·스킬 설치 경로의 변경은 없다. 문서/JSON만 바뀌어 전체 build·브라우저 검증은 실행하지 않았다. 원본 조사 자료와 일회성 문서 검증 결과는 Git에서 제외한 `private/seo-plan-check/`에 남겼다.

계획 등록과 검색 순위 개선, 로컬 통과와 실제 배포/색인은 각각 다른 완료 상태다.
