# H-Log SEO 개선과 claude-seo의 Codex 도입 계획

등록일: 2026-10-26. 2026-11-03 S1 스킬 이식과 [공개 페이지 감사 기준선](SEO_AUDIT_BASELINE.md)을 완료했다. Brain 발견 경로를 독립 S2 Step 5로 추가해 **3개 phase / 11개 step 중 completed 9·pending 1·blocked 1**이다. 2026-11-04 S2 Step 0의 Blog canonical·색인·DB 오류 응답을 개선했다. 실제 도메인 제출은 수행하지 않았다.

관리자 로컬 단계와 모니터링 로컬 검수는 완료했고 운영 적용은 기존 OCI 보류를 유지한다. S2 Step 1의 일반 목록 발견 검수를 앱 코드 추가 변경 없이 완료했다. 2026-11-05 S2 Step 2의 페이지별 공유 정보 수정과 실제 JSON-LD 검수를 완료했다. S2 Step 3에서 24회 성능 기준선을 남기고 앱 코드 변경 없이 완료했다. 당시 실제 이미지/field 지표와 Brain 상호작용은 미측정이었다. S3 Step 0에서 Brain 상호작용과 모바일 3회를 확인했으며 실제 이미지/field는 여전히 미측정이다. S2 Step 4에서 대표 원고의 비공개 수정 후보와 공개 연결 검수를 완료했다. 실제 발행은 하지 않았다. S2 Step 5에서 승인된 그래프 UI를 유지하면서 기본 공개 목록·상세 링크와 공개 경계를 검수했다. S3 Step 0의 [로컬 SEO 릴리스 검수](SEO_RELEASE_REVIEW.md)를 완료했다. 다음 로컬 작업은 **R1 Step 0 `provenance-contract`**다. 운영 SEO 확인은 OCI 보류 해제·공개 도메인 확정 뒤에만 가능하며 기존 모니터링 → 관리자 → timer 운영 순서는 바꾸지 않는다.

## 1. 검토한 원본과 도입 결론

기준은 [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo)의 **2.5.0 / commit `6be93f45064ffbadced572b5d5c95f55fd263af0`**다. GitHub main의 commit 시각은 2026-10-22T16:47:38Z이고 2026-10-26에 API와 고정 commit의 소스를 확인했다. H-Log 비교 기준은 `4682e30`이다. 이후 도입할 때 변경된 main을 자동 설치하지 말고 이 기준과 차이를 먼저 확인한다.

Codex용으로 **필요한 SEO 지침을 선별해 저장소 스킬 `hlog-seo`로 이식하는 방식**을 권한다. 원본의 설치 명령을 Codex 명령처럼 실행하지 않는다. [Codex 공식 문서](https://learn.chatgpt.com/docs/build-skills)는 `name`·`description`이 있는 SKILL.md와 저장소 `.agents/skills/` 검색을 설명한다. 실제 경로는 루트 [.agents/skills/hlog-seo/SKILL.md](../../../../../.agents/skills/hlog-seo/SKILL.md)이며 S1 Step 0에서 Codex 검색과 수동 호출 범위를 확인했다. 기존 `.codex/skills` 전체를 이동하거나 같은 스킬을 양쪽에 중복 설치하지 않는다.

| 원본에서 확인한 항목 | H-Log의 적용 방식 |
| --- | --- |
| [메인 스킬](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/skills/seo/SKILL.md)의 `/seo`, Claude 도구·agent 호출 | `$hlog-seo` 명시 호출과 현재 Codex 도구에 맞춘 지침으로 변환. 이식 전 원본 스킬이 Codex에 설치됐다고 표현하지 않음 |
| [아키텍처](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/docs/ARCHITECTURE.md)의 skill/reference 분리 | page·technical·schema·sitemap·content·images·GEO의 필요한 참고 자료만 읽음. 전체 agent/extension 복제나 상시 다중 agent 실행은 기본값으로 두지 않음 |
| [Windows installer](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/install.ps1)의 `.claude` 설치와 경로 치환 | 전역 installer·사용자 Claude 설정을 변경하지 않고 repo 안의 명시적 adapter로 관리 |
| [runtime.py](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/scripts/runtime.py)의 launcher, Python 환경과 별도 데이터 위치 | 초기 adapter는 지침 중심. 기존 HTTP/브라우저/Node 검증을 우선 사용. Python helper가 꼭 필요할 때만 격리 환경·고정 의존성·doctor 결과를 별도 기록하고 web/worker image에는 넣지 않음 |
| [schema hook](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/hooks/hooks.json)의 PostToolUse | Codex에서 자동 실행된다고 가정하지 않음. H-Log의 실제 HTML에 있는 JSON-LD를 명시적으로 파싱하는 테스트로 검증 |
| [URL 안전 검사](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/scripts/url_safety.py) | 사설 주소 차단을 유지. `CLAUDE_SEO_LOCAL_TARGETS`는 첫 URL의 host:port 예외일 뿐 redirect·subresource·브라우저 요청 전체 허용이 아님. 로컬 화면은 별도 loopback 검증으로 읽고 차단을 해제해 해결하지 않음 |
| [MIT LICENSE](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/LICENSE) | 이식한 자료에 LICENSE·원저작자·원본 경로/commit·변경점을 보존. FLOW 등 별도 라이선스 자료와 상용 extension은 이번 기본 범위에서 제외 |

위 표는 계획 당시의 이식 방향이다. 2026-11-03 S1 Step 0에서 필요한 지침만 옮기고 실제 Codex 검색·수동 source 적용·비선택/범위 거부를 확인했다. 원본 실행 도구와 launcher는 포함하지 않았다. 원본의 AGENTS/설치 지침은 분석 자료이며 H-Log 지침을 대체하지 않는다.

## 2. H-Log에서 이미 있는 것과 확인할 것

SEO 기반을 다시 만드는 대신 아래 차이를 실제 응답으로 확인한다. 이 표의 후보는 영향이나 검색 순위를 측정한 결론이 아니다.

| 현재 근거 | 확인한 사실 | 다음 검증/개선 |
| --- | --- | --- |
| `app/layout.tsx`, `lib/public-site-origin.ts` | 한국어 lang, title template, OG/Twitter, Person/WebSite, 명시적 production HTTPS origin | 각 페이지의 최종 head/본문과 public/admin origin 분리, title·description·OG URL 상속 확인 |
| `app/blog/(index)/page.tsx` | S2 Step 0에서 표시 페이지별 canonical, 검색/태그 noindex·canonical 생략 구현 | 일반 페이지 2+의 self canonical, 검색/태그 조합의 index 정책을 구분. 전부 첫 페이지로 합치거나 전부 색인시키지 않음 |
| `PUBLIC_EXPERIENCE_PLAN.md`, `backend-operations-lab/step1.md` | 2026-10-22 no-JS `/blog` 목록이 loading 안내에 머무른 기록 | S1에서 재현했고 S2 Step 0 오류 응답 수정으로 일반/2페이지/태그의 no-JS 읽기도 복구. S2 Step 1에서 상세/페이지 이동·빈 목록·JS 오류 재시도 확인. no-JS DB 장애의 빈 500 본문은 S3 Step 0에 기록 |
| `app/brain/page.tsx`, `app/brain/[slug]/page.tsx` | 그래프 화면과 독립 상세 route·canonical·404가 존재 | JS 없이 공개 목록→상세 발견, 그래프의 `?note=`와 상세 주소 관계 확인. 기존 Memory UI는 보존 |
| `app/robots.txt/route.ts`, `app/sitemap.xml/route.ts` | 관리자/API Disallow, 정적·Portfolio·공개 Blog/Brain sitemap | 정상 200 canonical URL만 포함, 철회/404/장애·query 중복·lastmod 검증. robots는 인증 대체 수단이 아님 |
| `app/blog/[slug]/page.tsx`, `components/seo/JsonLd.tsx` | BlogPosting·실제 공개일·명시적 수정일·안전한 직렬화 | 렌더된 JSON-LD의 파싱·본문/작성자/날짜/URL 정합성. 필요한 BreadcrumbList는 보이는 탐색과 함께 검토 |
| `lib/blog-crawler-output.ts`, Markdown route | published-current 기반 RSS·llms·Markdown 존재 | HTML과 같은 공개 버전/hash·철회 반영 확인. 기존 Blog-only RSS/llms 범위를 임의 확장하지 않음 |
| 공개 관련 글·프로젝트·시리즈와 한국어 작성 가이드 | 근거·읽기 순서·내부 연결이 존재 | 고립된 공개 글, 애매한 제목/도입·출처/한계·실제 문제 해결 검색 의도 보완 |
| `lib/site-seo.test.ts` | metadata 일부는 소스 정규식 검사 | 소스에 문자열이 있다는 검사와 실제 HTTP/DOM/JSON-LD 결과를 구분해 보강 |
| PDF Step 1의 audit 기록 | 기존 Next.js 16.2.11 포함 production dependencies에 critical 경고 | 기존 보안 패치 작업의 완료 확인을 배포 전 필수 조건으로 유지. 이 계획 등록으로 패치했다고 표시하지 않음 |

현 상태에서 실행한 가까운 기준선은 `site-seo.test.ts`, `blog-crawler-output.test.ts`, `public-site-origin.test.ts`의 **7/7 통과**다. 2026-11-03 adapter와 공개 감사에서도 7/7을 확인했다. HTTP·JS/no-JS·사이트맵의 실제 결과는 [감사 기준선](SEO_AUDIT_BASELINE.md)에 기록했다. PageSpeed/CrUX·실제 색인/순위는 미검증이다.

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
| S1 `seo-codex-foundation` | 0 | Codex용 선별 이식·출처/라이선스·실제 검색/수동 호출 검수 | completed |
| S1 | 1 | 공개 route 표본과 실제 HTTP/HTML·JS/no-JS 감사 기준선, 우선순위 목록 | completed |
| S2 `seo-public-surface-optimization` | 0 | 검색/태그/페이지·canonical·robots·sitemap 정책과 HTTP 검증 | completed |
| S2 | 1 | 기존 수정의 no-JS 목록→상세/페이지와 JS 재시도 검수, 앱 구현 추가 없음 | completed |
| S2 | 2 | 페이지별 OG/Twitter 상속 수정, 실제 JSON-LD·특수문자·날짜 정합성 검수 | completed |
| S2 | 3 | production 24회 성능 기준선·편차/전송량 기록, 앱 변경 없음·실제 이미지/field 미측정 | completed |
| S2 | 4 | 대표 원고 수정 후보·사실 보존, 기존 링크/철회·공개 버전 일관성 검수; 실제 미발행 | completed |
| S2 | 5 | 공개 기본 목록·독립 상세 anchor, 승인된 그래프 UI·선택/공개 경계 검수 | completed |
| S3 `seo-release-and-measurement` | 0 | 공개/비공개·철회/오류·이미지 실패와 Brain 상호작용/모바일 재검수, 운영 전 한계 기록 | completed |
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

### S1 Step 0 완료 — 2026-11-03

2026-11-03 SEO S1 Step 0 완료: claude-seo 2.5.0 고정 commit의 지침 7개를 `.agents/skills/hlog-seo`로 선별 이식하고 MIT·출처·원본 hash를 보존했다. Codex의 실제 repo skill 검색(루트/앱), frontmatter/링크·입력별 수동 검수와 기존 SEO 7개 테스트를 통과했다. 전체 HTTP/렌더링 감사·앱 최적화는 아직 진행하지 않았다. SEO completed 1·pending 8·blocked 1, **다음 로컬 작업은 seo-codex-foundation / S1 Step 1: public-audit-baseline**이다. 관리자 로컬 완료와 OCI 운영 보류는 유지한다. 상세 입력별 검수와 측정 한계는 [Step 0](../../../phases/seo-codex-foundation/step0.md), 이식 경로/hash와 변경점은 [출처](../../../../../.agents/skills/hlog-seo/references/upstream.md)에 기록했다.

### S1 Step 1 완료 — 2026-11-03

2026-11-03 SEO S1 Step 1 완료: 현재 production 이미지와 합성 DB에서 HTTP 70응답, JS/no-JS 144화면, 사이트맵 52주소의 반복 검수를 마쳤다. Blog page 2 canonical·no-JS Blog/Brain 발견·공유 metadata 상속·DB 오류 시 Blog 200 등을 확인하고 후속 단계에 연결했다. Brain 발견 문제는 UI를 보존하는 독립 S2 Step 5로 추가했다. SEO 3개 phase / 11개 step 중 completed 2·pending 8·blocked 1이며 **다음 로컬 작업은 seo-public-surface-optimization / S2 Step 0: crawl-and-index-policy**다. 감사 완료이며 앱 수정·운영 적용은 아직이다. 관리자/모니터링·OCI 보류는 유지한다.

[감사 기준선](SEO_AUDIT_BASELINE.md)에 실행 SHA·이미지·도구, 표본별 결과, 7개 발견, 반복 검증과 미측정 항목을 기록했다. 비공개 원자료는 `private/seo-audit/`에 보관한다.

### S2 Step 0 완료 — 2026-11-04

2026-11-04 SEO S2 Step 0 완료: 일반 Blog 목록의 표시 페이지에 맞춘 canonical과 검색/태그 noindex 정책을 구현했다. 선행 로딩 경계를 제거해 DB 읽기 오류는 500, 정상 빈 목록은 200으로 구분한다. 일반 no-JS 목록 읽기도 함께 복구됐다. 실제 HTTP RED→GREEN, production/dev 각 6/6과 36화면·검색/태그/뒤로가기, 단위 277 pass/26 DB skip, source lint/typecheck/build·production audit 0을 확인했다. 기본 lint의 기존 private 오류 10건은 별도 기록했다. SEO completed 3·pending 7·blocked 1, **다음은 S2 Step 1: server-rendered-blog-discovery**다. OCI·공개 발행·timer 보류는 유지한다. URL별 계약·재현 환경과 검증 한계는 [Step 0](../../../phases/seo-public-surface-optimization/step0.md)에 기록했다.

### S2 Step 1 완료 — 2026-11-04

2026-11-04 SEO S2 Step 1 완료: Step 0에서 복구한 일반 Blog의 no-JS 발견 경로를 검수했다. production HTTP 6/6, 공개 읽기·검색·crawler/SEO 테스트 61/61, 1440/390/320px의 JS ON/OFF 42표본과 탐색·검색 재시도를 확인했다. 정상 목록→상세→페이지 이동, 빈 목록/태그, JS 장애 안내·복구는 정상이다. no-JS DB 장애는 500이지만 화면이 비는 한계를 S3 Step 0에 남겼다. 앱 코드는 추가 변경하지 않았다. SEO completed 4·pending 6·blocked 1, **다음은 S2 Step 2: metadata-and-structured-data**다. OCI·공개 발행·timer 보류는 유지한다.

[Step 1 검수 기록](../../../phases/seo-public-surface-optimization/step1.md)에 환경·42표본의 정상/제한 구분·명령·비공개 근거 위치를 남겼다. no-JS DB 오류의 빈 화면은 해결했다고 표현하지 않는다.

### S2 Step 2 완료 — 2026-11-05

2026-11-05 SEO S2 Step 2 완료: Resume·Portfolio·Blog·Brain이 홈의 공유 정보를 상속하던 문제를 수정했다. 공통 함수가 페이지 제목/설명·OG URL·Twitter 카드를 설정하며 기존 canonical/noindex·대표 이미지·JSON-LD는 유지한다. 실제 HTTP RED→GREEN, production/dev 각 21/21과 JS ON/OFF 120화면에서 특수문자·작성자·공개/수정일·공개 origin을 확인했다. 단위 277 pass/26 DB skip, source lint/typecheck/build 통과. 기본 lint의 기존 private 오류 10건은 남아 있다. SEO completed 5·pending 5·blocked 1, **다음은 S2 Step 3: measured-page-performance**다. OCI·실제 공개 발행·timer 보류는 유지한다.

[Step 2](../../../phases/seo-public-surface-optimization/step2.md)에 RED→GREEN·실행 이미지·dev 전용 OG 이미지 차이·lint 제한·실제 검색 미측정을 기록했다.

### S2 Step 3 완료 — 2026-11-05

2026-11-05 SEO S2 Step 3 완료: 같은 production 빌드의 Home·Blog 목록·긴 글·Brain을 모바일/데스크톱 각 3회, 총 24회 측정했다. 모바일 LCP 중앙값은 730–909ms, 전체 CLS 0이며 Brain LCP의 798–2,409ms 편차도 보존했다. 이번 표본에서 단독 수정할 병목을 특정하지 못해 앱 코드는 변경하지 않았다. 이미지/폰트 전송 0B와 그래프 상호작용·field 지표 미측정의 한계를 기록했다. HTTP 21/21과 문서·phase 검증을 통과했고 전용 측정 자원을 정리했다. SEO completed 6·pending 4·blocked 1, **다음은 S2 Step 4: evidence-based-content-and-links**다. OCI·실제 공개 발행·timer 보류는 유지한다. 아래 날짜별 기록은 당시 상태다.

환경·수치·판단과 재현 조건은 [Step 3 완료 기록](../../../phases/seo-public-surface-optimization/step3.md)에 둔다.

### S2 Step 4 완료 — 2026-11-05

2026-11-05 SEO S2 Step 4 완료: 최근 글 조회 원고 1편의 Next.js/Suspense 제목·도입·no-JS 한계와 프로젝트/목록 링크 후보를 준비했다. 원고·diff는 비공개로 보관하고 실제 발행이나 앱 변경은 하지 않았다. 기존 프로젝트·시리즈 연결을 재사용해 현재 제목과 철회 후 제외를 확인했다. Unit 66/66, production HTTP 21/21과 추가 24응답, JS ON/OFF 24화면·6탐색, 원문/hash 보존을 통과했다. SEO-07은 Home 직접 링크의 알려진 제한으로 유지하고 Blog 대체 경로를 확인했다. SEO completed 7·pending 3·blocked 1, **다음은 S2 Step 5: server-rendered-brain-discovery**다. OCI·공개 발행·timer 보류는 유지한다.

[원고·링크 검수](SEO_CONTENT_LINK_REVIEW.md)에 구체적인 후보와 승인 상태·검증 범위를 기록했다.

### S2 Step 5 완료 — 2026-11-05

2026-11-05 SEO S2 Step 5 완료: 기존 공개 graph로 서버 기본 목록과 독립 상세 링크를 제공한다. JS 목록의 일반 클릭은 기존 기록 선택을 유지하며 새 탭으로 상세를 열 수 있다. 승인된 그래프 UI와 Home 레이더는 유지했다. Production RED 6표본 실패 후 DB/파일 카탈로그·개발 서버의 1440/390/320px JS ON/OFF 검수 18표본, 검색·Enter·뒤로가기·새 탭·배치 전환 9표본을 통과했다. HTML/RSC/sitemap에서 비공개 원문·미선택 수정·철회 기록 제외와 404/no-store를 확인했다. 단위 277 pass/26 DB skip, source lint/typecheck/production build 통과. 기본 lint의 기존 private helper 오류는 별도 기록했다. SEO completed 8·pending 2·blocked 1, **다음은 S3 Step 0: local-seo-release-rehearsal**이다. OCI·실제 발행·timer 보류는 유지한다.

### S3 Step 0 완료 — 2026-11-05

2026-11-05 SEO S3 Step 0 완료: 같은 production 이미지의 격리 합성 DB·공개/관리자 ingress에서 SEO HTTP 21/21, 관리자·Brain·PDF HTTP 7/7, 관련 DB integration 4/4를 통과했다. S1의 HTTP 70응답·144화면과 사이트맵 52 URL × 2회, 기본 읽기·검색·철회·오류·이미지 실패를 확인했다. Brain 검색/필터/드래그 trace와 모바일 성능 3회도 기록했다. 앱 코드·승인된 Brain UI·Home 레이더는 변경하지 않았다. 단위 277 pass/26 DB skip, source lint/typecheck/production build 통과, 운영 의존성 취약점 0건이다. 기본 lint의 기존 private helper 오류와 Home no-JS 최근 글 직접 링크·no-JS DB 장애의 빈 500 화면은 남은 한계로 구분했다. SEO completed 9·pending 1·blocked 1이며 **다음 로컬 작업은 R1 Step 0 `provenance-contract`**다. S3 Step 1과 OCI·실제 발행·timer 보류는 유지한다.

[로컬 SEO 릴리스 검수](SEO_RELEASE_REVIEW.md)에 S1 대비 판정·no-JS 장애 안내의 판단·실제 출력 회귀 명령·운영 gate를 정리했다.
