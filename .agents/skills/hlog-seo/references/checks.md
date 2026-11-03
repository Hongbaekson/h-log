# 요청별 검사 기준

claude-seo의 page/technical/schema/sitemap/content/images/GEO에서 아래 항목을 선별하고 H-Log의 공개 계약에 맞췄다. 원본 경로·hash와 제외한 항목은 [출처](upstream.md)에 있다. 소스 검사만으로 실제 HTML·색인·성능을 확인했다고 기록하지 않는다.

## 발견 경로·색인 — S1 Step 1, S2 Steps 0–1

- 표본마다 요청 URL, redirect chain, 최종 status, canonical, robots 응답/메타, 초기 HTML·JS 후 DOM·no-JS의 본문과 `<a href>`를 대조한다. raw HTML에 RSC 문자열이 있다는 사실을 보이는 no-JS 목록으로 판단하지 않는다. React 사용 자체를 결함으로 보지 않는다.
- `/blog` 기본 목록·일반 page 2·검색·태그를 별도로 본다. 일반 페이지 2의 서로 다른 글이 첫 페이지 canonical로 합쳐지는지, 검색/태그 조합의 index 정책이 정해졌는지 확인한다. 이동은 클릭 가능한 기본 링크로 가능해야 한다. 모든 query에 동일한 canonical/noindex 처방을 내리지 않는다.
- Brain 그래프와 독립 상세 route를 구분한다. 그래프를 다시 만들지 않고 공개 노트의 발견 링크와 `?note=`/상세 canonical 관계를 확인한다. 비공개 노트 원문을 새 SEO 본문으로 쓰지 않는다.
- `robots.txt`의 sitemap 선언뿐 아니라 실제 XML 파싱·허용 origin·의도된 200 canonical URL을 확인한다. redirect/noindex/404/철회 URL 포함과 누락을 구분하고 `lastmod`는 내용 변경 근거와 대조한다. 현재 시각을 모든 URL에 넣지 않는다.
- `/projects` → `/portfolio`의 기존 308, 존재하지 않는 글의 404, DB 장애 상태를 확인한다. 인증 경계는 robots/noindex로 대신하지 않는다. crawler·RSS·llms·Markdown은 같은 공개 버전을 가리켜야 한다.

## 페이지 metadata·JSON-LD — S2 Step 2

- 초기 HTML과 최종 head의 title/description/canonical/OG/Twitter URL·이미지를 비교한다. root 상속으로 다른 페이지가 같은 설명이나 URL을 내보내는지 본다. 한국어 제목을 영문 50–60자 규칙에 억지로 맞추지 않는다.
- 주제와 H1·소제목·도입이 일치하는지, 본문을 읽지 않고도 목록/링크로 내용을 구분할 수 있는지 확인한다. 제목을 그대로 반복하는 description과 키워드 반복은 구체적인 표본을 근거로 제안한다.
- 실제 `application/ld+json` 블록을 JSON으로 파싱한다. `@graph`가 있으면 각 노드를 확인하고 Person/WebSite/BlogPosting의 entity·작성자·공개/수정일·절대 URL을 보이는 사실과 대조한다. 소스에 type 문자열이 있다는 검사는 렌더링 증거와 분리한다.
- BreadcrumbList는 실제 보이는 탐색과 함께 검토한다. 리뷰·평점·조직·경력·날짜를 채워 넣지 않는다. Schema.org 문법과 Google rich result 지원은 별개이므로 지원 여부가 필요한 제안은 당시 공식 문서로 확인한다. parser 통과만으로 검색 표시를 보장하지 않는다.

## 이미지·성능 — S2 Step 3

- 의미 있는 이미지의 alt, 장식 이미지의 빈 alt, 고정 크기/aspect ratio, 실제 viewport에 맞는 `srcset/sizes`, 전송 바이트와 캐시를 확인한다. 파일 크기 하나로 임의 Critical 판정을 내리지 않는다.
- 실제 LCP 요소를 먼저 측정한다. 첫 화면 핵심 이미지의 지연 로딩과 화면 밖 이미지의 로딩을 구분하고, `loading` 부재만으로 JS lazy-loader를 오판하지 않는다. 기존 Next Image·폰트를 먼저 사용하며 SVG 레이더를 raster로 바꾸지 않는다.
- 같은 빌드·표본·도구·viewport·throttling 조건으로 3회 측정해 중앙값과 편차를 기록한다. Lighthouse LCP/CLS/TBT는 로컬 진단이며 TBT를 INP로 바꾸어 적지 않는다. CrUX 실사용 p75와 GSC 데이터가 없으면 미측정이다. 느린 원인을 측정하기 전에 새 라이브러리·이미지 변환 파이프라인을 추가하지 않는다.

## 기술 글·내부 링크·AI 읽기 — S2 Step 4

- 누가 작성했고 어떤 공개 근거로 문제를 설명하는지 확인한다. 문제·선택 이유·실제 결과·한계와 출처가 독자가 궁금한 기술 질문을 해결하는지 본다. 영어 Flesch 점수·최소 단어 수·키워드 밀도를 한국어 품질 기준으로 강제하지 않는다.
- 프로젝트/시리즈/관련 글의 연결이 맥락에 맞는지 확인한다. 고립된 공개 글은 실제 링크로 연결하되 비공개 slug를 링크 후보로 내보내지 않는다. 사용자 경험이나 수치는 확인된 공개 근거가 있을 때만 쓴다. 불확실한 회고를 사실처럼 확장하지 않는다.
- 섹션은 문맥을 이해할 수 있는 문제와 답, 비교 조건과 출처를 담게 제안한다. AI 인용용 고정 글자 수로 쪼개거나 같은 주제의 대량 페이지를 만들지 않는다. HTML/Markdown/llms의 내용·공개 버전 일관성을 확인하고 파일 존재나 GEO 점수를 검색 순위/인용 효과로 해석하지 않는다.
- 주소·전화·리뷰·LocalBusiness·상업용 조직 schema, 외부 멘션 확보 활동은 이 개인 포트폴리오 감사에 자동 추가하지 않는다.

## 공식 기준 확인

검색 지원·crawler 정책·성능 기준을 구체적으로 단정할 때는 현재 공식 문서를 열고 확인 날짜를 남긴다. 2026-11-03 이식 시 확인한 주요 기준:

- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): 초기 응답과 렌더링을 구분하고 URL·링크·metadata를 대조한다.
- [Google 구조화 데이터 정책](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): 실제 내용과 일치해야 하며 형식 준수만으로 rich result를 보장하지 않는다.
- [Google AI 기능 안내](https://developers.google.com/search/docs/appearance/ai-features): 별도 AI 파일이나 특수 schema를 필수 조건으로 추가하지 않는다.
