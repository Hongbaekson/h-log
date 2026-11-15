# F2 Step 1 Markdown 개별 조회 검수

2026-11-16 [F2 Step 1](../../../phases/blog-read-efficiency/step1.md)의 완료 기록이다. 비교 기준은 변경 전 `b96a472228af2b536689536255f0d939bb21d145`, [F1 측정 예산](PERFORMANCE_BASELINE_REVIEW.md)과 [F2 Step 0 결과](BLOG_LIST_EFFICIENCY_REVIEW.md)다.

## 변경과 읽기 계약

`app/blog-markdown/[slug]/route.ts`의 전체 store 조회를 기존 `loadPublicBlogContentStoreBySlug(slug)`로 교체했다. 기존 repository의 매개변수 SQL로 대상 published/current 글과 현재 버전만 읽고, 해당 글의 태그·출처·현재 자산에 privacy 검증을 적용한다. loader의 썸네일 파일 검증과 Markdown 반환 전 Markdown+HTML content hash 검증을 유지했다. 신규 SQL/schema/의존성/요청 간 캐시와 공개 UI 변경은 없다.

실제 HTTP에서는 기존 `public, max-age=300`이 `force-dynamic` 상태에서도 남아 있었다. 단계의 private/no-store 기준에 맞춰 성공·404에 `Cache-Control: private, no-store`를 명시했다. `/blog/:slug.md` rewrite와 `/blog-markdown/:slug`는 같은 동작을 제공한다. 해시 불일치와 DB 장애는 기존 Next 500이며 404로 숨기지 않는다. 500의 헤더와 오류 생성은 프레임워크에 맡긴다.

새 요청은 바뀐 현재 버전과 비공개/철회 상태를 다시 확인한다. 기존 loader의 React cache를 요청 간 보존으로 확대하지 않았다. 이미 내려받은 사본이나 배포 전에 캐시된 응답을 회수하는 기능은 아니다. 기존 300초 캐시가 만료되기 전의 사본과 여러 query 도중의 동시 변경을 포함한 snapshot 계약은 F3에서 따로 다룬다.

## RED/GREEN과 공개 경계

- `scripts/blog-markdown-read.integration.test.mjs`는 실제 route를 TypeScript로 변환하고 Next import alias만 파일 URL로 해석한다. 실제 repository/loader/PG를 실행하며 Pool 경계에서 반환된 행을 관찰한다. SQL 결과를 mock하지 않는다. 수정 전 RED는 본문 `10 !== 1`, `1000 !== 1`로 실패했고 GREEN 3/3을 확인했다.
- 10/1,000글 모두 5 query에서 글 1·현재 버전 1·태그 3·출처 1, 총 6행을 반환했다. 대상 밖의 글/버전 행을 반환하지 않았고 응답 bytes와 원본 버전 테이블 fingerprint를 보존했다. DB 내부의 모든 scan 행 수가 상수라는 주장은 아니다. 새 index는 추가하지 않았다.
- `scripts/blog-markdown.http.test.mjs`의 캐시 RED는 production/dev 모두 `public, max-age=300`, 404는 헤더 없음이었다. 수정 후 각각 5/5(상위 테스트 1개와 시나리오 4개)를 통과했다. 초기 실행에서 버전 변경 시나리오가 캐시 검사로 중단되어 다음 시나리오에 영향을 준 기록도 보존했다. 해당 시나리오는 `finally`에서 원래 선택을 복구하도록 보완했다.
- rewrite/직접 URL의 정확한 본문, draft/retracted/없는/인코딩·SQL 형태 slug의 404, v1→v3 선택·비공개/철회→v1 복구, 원문 이력 보존을 확인했다. 환경 privacy 정책이 태그·출처·현재 자산에도 적용됨을 확인했다. 원문 해시 불일치·DB 장애의 500과 새 요청에서의 복구를 검증했다.

검수 DB는 소유 label이 있는 tmpfs PostgreSQL이고 Next 서버는 loopback 임시 포트다. 실제 콘텐츠나 운영 DB는 사용하지 않았다. 검수 후 DB·서버·임시 인증 파일을 정리했다.

## 기본 검증과 재현

- `npm run test`: 301 pass / DB opt-in 29 skip.
- repository/public-read-path 통합: 7/7 pass, 독립 slug/실제 DB 테스트 3/3 pass.
- 소스 lint, `npm run typecheck`, `npm run build` 통과. 기존 `blog-thumbnails.ts` tracing 경고 2개는 남아 있다.
- 전체 `npm run lint`는 Git 제외 `private/observe-step4`, `private/observe-step5`의 기존 CommonJS 오류 10개로 실패했다. 다른 private helper 경고도 있으며 이번 제품 소스의 lint 오류는 없다. 무관한 private 파일을 수정하지 않았다.
- UI와 스타일을 바꾸지 않았으므로 별도 화면 검수는 하지 않았다. 두 Next 실행 모드의 실제 HTTP를 검수했다.

실행 위치는 `apps/h-log`다. 새 검수 스크립트는 명시 opt-in 없이는 skip한다. integration은 migration된 빈 loopback `hlog_markdown_*` DB가 필요하다. HTTP 검수도 별도 빈 DB와 해당 DB를 사용하는 loopback Next 서버가 필요하며 서버의 `HLOG_PRIVACY_ORGANIZATION_NAMES`를 합성 값 `["Restricted Fixture Org"]`로 둔다. 두 스크립트는 같은 DB를 동시에 사용하지 않는다. `DATABASE_URL`과 `HLOG_MARKDOWN_HTTP_ORIGIN`은 생성한 로컬 자원으로만 지정한다.

```bash
# HLOG_MARKDOWN_READ_TEST=1
node --no-warnings --experimental-strip-types --test scripts/blog-markdown-read.integration.test.mjs
# HLOG_MARKDOWN_HTTP_TEST=1
node --no-warnings --experimental-strip-types --test scripts/blog-markdown.http.test.mjs
npm run test:repository
npm run test:public-read-path
npm run test
npm run lint
node node_modules/eslint/bin/eslint.js app components lib scripts next.config.ts
npm run typecheck
npm run build
git diff --check
```

## 부하 비교

F1의 fixture·HTTP 경로 순서·warmup·조건별 32요청·동시성 1/8·통계 산식·예산을 유지했다. 첫 실행 `hlog-perf-4aa4acf7`은 2026-11-16 08:12:44–08:15:08 KST에 10/100/500/1,000글 1,024요청을 완료했다. 추가 실행 `hlog-perf-b6452c67`은 08:15:30–08:16:56 KST에 1,000글 256요청을 완료했다. 두 실행의 모든 HTTP p50/p95 비교가 예산 이내였고 자원 정리를 확인했다.

호스트 Node 22.14.0, 앱 Node 24.19.0, Next 16.4.3, Docker 29.6.1, i7-13700K와 앱 CPU 2/2GB·DB CPU 1/1GB 제한은 F1과 같다. 앱 source hash는 `44d4d9ec1db723e8c1926f44ab9ab071a2bdf5b355b8de613bde7ec093922132`다. F1 도구 파일은 수정하지 않았고 HTTP 구간을 재사용한 private 실행기의 hash와 이미지 ID를 [비교 JSON](blog-markdown-performance-2026-11-16.json)에 남겼다. 브라우저·그래프 성능을 재측정한 실행은 아니다.

아래는 Markdown 원문 응답의 ms다. F1 범위는 두 실행의 값이며 표본을 합친 percentile이 아니다.

| 글 수 | 단일 요청 p50 F1 → 이번 전체 실행 | 동시 8요청 p95 F1 → 이번 전체 실행 |
| --- | --- | --- |
| 10 | 4.51–4.93 → 3.69 | 32.88–33.74 → 20.49 |
| 100 | 20.86–21.08 → 3.27 | 161.37–164.17 → 19.18 |
| 500 | 94.21–96.87 → 4.04 | 841.73–903.96 → 22.88 |
| 1,000 | 192.86–193.61 → 3.29 | 1,877.42–1,879.95 → 23.35 |

추가 1,000글 실행은 단일 요청 p50 3.33ms, 동시 8요청 p95 17.84ms였다. 이전 Step 0의 Markdown p95 2,597.60ms 초과(예산 2,399.94ms)는 두 실행에서 재현되지 않았다. 종료 139도 재현되지 않았으나 이전 종료의 원인을 규명하거나 해결했다고 주장하지 않는다. F1의 편차가 큰 그래프 조건과 영속 rebuild 미측정(null)도 유지한다. 수치는 로컬 합성 조건이며 운영 SLO나 사용자 체감 성능으로 일반화하지 않는다.

원자료·RED/GREEN·빌드·HTTP 로그는 Git/Docker 제외 `private/f2-step1-2026-11-16/`와 해당 `private/performance-baseline/` 실행 폴더에 보존했다. 이번 단계는 runtime 파일 1개를 수정했다.

최종 검수에서 Markdown 11개·JSON을 파싱하고 추가 링크 38개, 60개 phase/209개 step의 상태와 `git diff --check`를 확인했다. 소유 label로 재조회한 검수 컨테이너·네트워크·이미지는 남지 않았다. 기존 `.tmp/`와 비공개 증거는 커밋에서 제외한다.

## 인계

F2의 두 step을 완료했으며 F 트랙은 3 completed/19 pending이다. 다음은 [F3 Step 0 `source-and-projection-contract`](../../../phases/rebuildable-public-read-models/step0.md)다. 현재 여러 DB query의 읽기 snapshot, 다른 표면의 캐시·공개 최신성, 원본과 projection의 소유권을 계약으로 정한다. 운영 배포·OCI/DNS/TLS·provider·timer·실제 발행은 수행하지 않았다.
