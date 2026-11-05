# H-Log 기술 원고와 내부 링크 검수

검수일: 2026-11-05. [S2 Step 4](../../../phases/seo-public-surface-optimization/step4.md)의 원고 준비·로컬 검수를 완료했다. **실제 글 발행과 공개 버전 교체는 하지 않았다.** 앱 코드·UI·DB schema도 변경하지 않았다.

## 대상과 공개 상태

대표 원고는 [2026-10-21 사례 검수](BLOG_CASE_STUDY_REVIEW.md)의 최근 글 조회 초안이다. H-Log 자체의 공개 코드와 설계·검증 기록을 다룬 `project_record`이며 회사 문서를 새로 가져오지 않았다. 운영 DB와 확정된 공개 origin을 조회하지 않아 실제 사이트의 현재 발행 목록·고립된 글 수는 미확인이다. 기존 검토 원고 1편과 공개 프로젝트·시리즈 정의를 대상으로 준비하고 별도 합성 DB에서 공개 조건을 검증했다.

수정 후보 전체, 이전 원고 사본, 사실 보완본, 한국어 교정본, 변경 diff와 출처 hash는 Git/Docker 제외 `private/seo-content/`에 보관한다. 이전 원고 파일은 그대로다. 커밋에는 이 검수 요약과 계획 상태만 포함한다.

## 독자의 질문과 원고 변경

| 항목 | 검토·변경 후보 | 근거와 범위 |
| --- | --- | --- |
| 기술 질문 | Next.js에서 최근 글의 DB 조회를 기다리면서 홈 소개를 먼저 보여주려면 어디를 나눌까? | 실제 Home 서버 컴포넌트와 ADR-032의 선택. 검색량·순위 데이터는 없음 |
| 이름/경력 검색과 분리 | 작성자와 역할은 기존 Home/Resume/Portfolio에서 설명하고, 이 글은 조회 대기·공개 읽기 문제에 집중 | 이름·경력 키워드를 본문에 반복해서 넣지 않음 |
| 제목 | `최근 글 조회가 늦어져도 홈은 먼저 보여주기` → `Next.js Suspense로 최근 글 조회와 홈 렌더링 분리하기` | 기존 구현에 쓰인 기술과 다루는 문제를 명시. 속도 향상이나 모든 환경 지원을 약속하지 않음 |
| 요약 | 최근 글의 DB 조회를 기다리는 영역을 Next.js 서버 컴포넌트와 Suspense로 나눴습니다. 빈 목록과 조회 실패, 전체 조회 비용, JavaScript 없는 읽기의 한계를 살펴봅니다. | 제목 반복 대신 읽고 판단할 조건을 안내 |
| 첫 문단 | DB 조회를 기다리는 영역을 나눴다는 설명에서 시작해 소개·프로젝트와 최근 글의 표시 시점을 연결 | 과거 동기나 장애 경험을 새로 만들지 않음 |
| 확인 범위 추가 | JavaScript OFF에서 Home 최근 글은 보이지 않는다는 2026-11-03 관측과, 2026-11-04 Blog 목록 발견 복구를 별도 절로 추가 | 서버가 보낸 HTML과 no-JS 가시성을 구분. 원고의 10월 검증을 새 실행으로 바꾸지 않음 |
| 출처 | 본문의 Suspense 설명 옆에 기존 React 공식 링크 유지 | 2026-11-05 fallback/지원되는 대기 조건만 재확인. 새 실험 API나 운영 성과를 도입하지 않음 |
| 다음 읽기 | 본문 말미에 `/portfolio/h-log-public-reading`, `/blog` 연결. 개별 다음 편은 기존 공개 시리즈 선택기가 표시 | 아직 공개하지 않은 편의 링크를 본문에 고정하지 않음 |

이 글의 질문에 필요한 구현·대안·한계를 먼저 설명하고, 글자 수·키워드 밀도를 채우기 위해 문단을 늘리지 않았다. [한국어 작성 기준](BLOG_WRITING_GUIDE.md)에 따라 사실 보완 후 `espada:humanize-korean`의 SKILL.md/quick rules로 산문 2곳을 교정했다. 문체 교정 전후의 제목·표·코드·inline code·URL·숫자·날짜는 동일하며 의미·범위도 수동 대조했다.

## 사실 보존과 증거

| 확인한 주장 | 근거 | 이번 판단 |
| --- | --- | --- |
| 소개·레이더는 최근 글 Suspense 밖에 있음 | [Home](../../../app/page.tsx), [HomeRecentPosts](../../../components/blog/HomeRecentPosts.tsx), ADR-032 | 현재 코드와 기존 선택 이유가 일치. 배치·레이더 변경 없음 |
| 지원되는 자식의 대기 동안 fallback 표시 | [React Suspense](https://react.dev/reference/react/Suspense) | 2026-11-05 공식 문서 재확인. 임의 Effect 요청 전체를 감지한다는 주장 없음 |
| 빈 결과 생략·조회 실패 안내·전체 GET 재시도·고정 로그 | HomeRecentPosts | 기존 설명 보존. 이번 검수는 장애/지연 주입을 새로 하지 않았음 |
| 3개 표시와 전체 공개 글 조회 비용은 다름 | [공개 loader](../../../lib/blog-public-source.ts), [목록 모델](../../../lib/blog-public.ts) | 조회 후 모델 생성·slice 구현 확인. 쿼리 최적화나 운영 지연 개선을 주장하지 않음 |
| 현재 버전의 제목·본문/hash만 공개 | [공개 repository](../../../lib/blog-postgres-repository.ts), [공개 판정](../../../lib/blog-content-model.ts) | 이전 비공개 버전과 오래된 post 제목을 넣은 로컬 fixture에서 현재 제목만 출력됨 |
| 과거 35개/44개 테스트와 당시 브라우저 검수 | 이전 원고·사례 기록 | 숫자·날짜·코드 블록을 그대로 보존. 이번 66개 테스트와 별도로 취급 |
| no-JS Home 직접 링크 제한과 Blog 우회 경로 | [S1 감사](SEO_AUDIT_BASELINE.md), S2 Step 1, 이번 24화면/6탐색 | Home 직접 링크는 여전히 0개. Blog 목록을 통한 실제 탐색은 JS ON/OFF 모두 성공 |

기존 원고의 11개 claim을 현재 코드 또는 당시 기록과 대조했다. 사실 보완은 제목/도입의 기술 명시, no-JS 관측/복구 시점, 다음 읽기 경로이며 문체 교정과 분리했다. 회사명·내부 URL·연락처·자격 증명은 없으며 기본 privacy scanner와 수동 검토를 통과했다. 운영용 조직명 정책·실제 발행 freshness/claim gate 검수까지 완료한 것은 아니다.

최종 원고 SHA-256은 `40cb9b4991fdd9e1429907cb9b5a0cd97268bdbc92057d6f583e76dcb628dd0b`, 기존 변환 함수로 만든 content hash는 `932188a374a4fa3d658ef63cc8f48b30283498d73225fdef1edcbce458a0b7db`다. 실제 발행 전에 내용이 달라지면 이 검수 결과를 새 버전의 승인으로 사용하지 않는다.

## 프로젝트·시리즈 연결과 SEO-07

기존 [프로젝트 연결](../../../lib/portfolio-posts.ts)의 `h-log-public-reading` ↔ `home-recent-posts`와 [시리즈](../../../lib/blog-series.ts)의 세 편 순서를 재사용한다. 사례 검수 당시 별도 slug 후보도 있었지만 이번에는 기존 연결을 활용하는 `home-recent-posts`를 제안한다. 운영 slug 확정·이동·redirect는 수행하지 않았다.

| 연결/상태 | 로컬 관측 | 처리 |
| --- | --- | --- |
| Blog 목록 → 첫 글·시리즈 3편 | 현재 공개 버전 제목과 정상 200 경로, no-JS 발견 확인 | 연결 추가 불필요. 실제 공개된 편만 기존 selector가 포함 |
| 첫 글 → H-Log 프로젝트, 프로젝트 → 첫 글 | JS 양방향 정상. no-JS 프로젝트의 관련 글은 기존 Blog 대체 링크로 탐색 | 기존 연결 이유를 유지. 관계없는 Redis/경력 글을 관련 글로 묶지 않음 |
| 시리즈 중간 편 철회 | 번호 1·3 유지, 다음 공개 편으로 연결; 목록·상세·crawler에서 철회 링크 제외, HTML/Markdown 404 | 새 정적 개별 글 링크를 원고에 넣지 않는 이유 |
| 프로젝트에 연결된 첫 편 공개 해제 | 프로젝트·목록·feed·llms·sitemap에서 제목/링크 제외, HTML/Markdown 404 | 기존 공개 경계 유지, 모든 version 본문/HTML/hash 불변 |
| SEO-07: Home 최근 글 직접 링크 | JS ON 3개, OFF 0개. Home → Blog → 상세 클릭은 양쪽 모두 성공 | **알려진 제한 유지, 수정하지 않음.** 고립된 표본은 아니며 ADR-032의 비차단 소개를 보존 |

SEO-07을 해결 완료로 닫지 않는다. 정상적인 Blog 발견 경로가 복구되어 이번에는 Home 조회를 앞당기거나 중복 링크 목록을 만들 필요가 없다고 판단했다. S3 로컬 회귀에서 대체 경로를 유지하는지 확인한다. 이 판단은 실제 색인·검색 노출이나 JS OFF의 최근 글 표시가 개선됐다는 뜻이 아니다.

## 실행 환경과 결과

- 앱 SHA `92544585d7842422ec7963f26f25487321e7f9eb`. 앱 소스는 Step 2의 `42eb458` 이후 변경되지 않아 동일 production 이미지 `hlog-web:seo-metadata` / `sha256:8dff41b05f9347cd2c8a43a26beb16cd9dbf9248fcdecbc44dc53daf0734453f`를 재사용했다.
- Node `24.22.1`, Edge headless, 전용 합성 PostgreSQL/Nginx. 전송 origin `http://127.0.0.1:3048`, canonical origin `https://hlog.example.org`. 인증 없는 context와 같은 origin의 공개 경로/정적 자산만 허용했다. 외부 React 문서는 별도 공식 자료 확인이며 로컬 브라우저에서 외부 요청은 실행하지 않았다.
- 별도 DB의 공개 fixture는 검토 원고 3편과 합성 계약 표본이다. 날짜는 화면 검사용이며 실제 발행일이 아니다. 실제 DB·provider·공개 발행·timer는 호출하지 않았다.

| 검증 | 결과 |
| --- | --- |
| 공개 읽기·시리즈·프로젝트·crawler·editorial·content model unit | 66/66, 실패/skip 0 |
| 기존 production HTTP 회귀 | 21/21 |
| 추가 HTTP | 24응답: 현재 제목, HTML/Markdown, feed/llms 및 철회·공개 해제 경계 확인 |
| 동일 공개 버전 | raw Markdown은 후보와 동일. feed/llms 출력은 같은 store/version의 생성 결과와 byte 일치, title/hash 확인. feed/llms.txt는 요약·링크 형식이며 본문 전체와 같다고 표현하지 않음 |
| JS ON/OFF 화면 | 1440/390/320px × Home/Blog/첫 글/프로젝트 × 2 = 24표본. 가로 넘침·pageerror·허용 범위 밖 요청 0건 |
| 실제 클릭 탐색 | Home → Blog → 첫 글 6회 성공. 상세의 native 시리즈 펼침과 현재 제목 확인 |
| 원고/공개 경계 | 이전 원고 불변, Korean 보호 항목 동일, 파싱·privacy 통과. drafted 후보 공개 선택 0건, 이전 비공개 version/오래된 제목 미노출 |
| 철회 후 보존 | 시리즈/프로젝트/crawler 제외, 404, DB 모든 version 본문·HTML·hash 불변, publish jobs 0건 |
| 정리 | 실행별 전용 컨테이너 3개·network·임시 credential 정리 |

처음 검수에서 정상 공개 메뉴 prefetch를 helper allowlist가 차단했다. 해당 공개 경로를 반영한 뒤 전체 검수를 다시 통과했다. 앱 결함이나 성능 개선으로 계산하지 않았다. 최종 receipt와 캡처는 `private/seo-content/review-final/`에 보관한다.

앱 디렉터리에서 실행한 명령:

```powershell
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-series.test.ts lib/portfolio-posts.test.ts lib/blog-crawler-output.test.ts lib/blog-editorial.test.ts lib/blog-content-model.test.ts
$env:HLOG_SEO_LOCAL_AUDIT='1'
$env:HLOG_SEO_BROWSER='1'
$env:HLOG_SEO_RUN_LABEL='review-final'
node --no-warnings --experimental-strip-types private/seo-content/run.mjs
node private/seo-content/validate-docs.mjs
git diff --check
```

비공개 검수 helper가 있는 로컬 환경용 명령이다. 앱 동작을 바꾸지 않아 RED→GREEN과 전체 lint/typecheck/build·개발 서버 UI gate는 추가 실행하지 않았다. 문서/JSON·링크·phase·변경 범위를 검사했다.

## 인계

원고는 **검토용 후보**다. 실제 발행 때 기존 관리자 검토에서 slug/중복 글 유무, 최신 코드·공식 자료·claim/privacy, 공개할 검증/수정 기록과 날짜를 확인한 뒤 새 불변 버전으로 등록한다. 본문에 실제 운영 성과가 추가되면 별도 근거가 필요하다. SQL로 운영 published 본문/hash를 덮어쓰지 않는다.

다음 로컬 작업은 **S2 Step 5 `server-rendered-brain-discovery`**다. 승인된 Brain 화면을 유지하며 기본 읽기와 독립 상세 링크를 다룬다. S3 운영 단계의 OCI·도메인·계정 보류는 그대로다.
