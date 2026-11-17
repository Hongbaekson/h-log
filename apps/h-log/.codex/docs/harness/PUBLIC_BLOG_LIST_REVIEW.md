# 공개 Blog 목록 projection 검수

2026-11-17 F3 Step 3 `projected-blog-list`. 기준 commit은 `980f5b3d49f9887a95c6108439935c7c04c04d77`다. 목록과 Home 최근 글에 작은 조회용 데이터를 연결했다. `HLOG_PUBLIC_READ_MODEL` 기본값은 `source`이며 운영 설정·migration·배포·실제 콘텐츠는 변경하지 않았다.

## 구현과 읽기 경계

[Migration 016](../../../migrations/016_public_blog_lists.sql)은 `public_read_entries`에 `list_payload/list_hash`를 추가한다. 전체 detail/search JSON을 읽지 않고 작은 list/result의 SHA-256과 DTO 형태를 검사한다. hash는 PostgreSQL JSONB text 인코딩이며 기존 JS canonical payload/input hash와 별개다. schema manifest 2로 올려 이전 generation은 hit로 인정하지 않는다. 기존 행의 자동 backfill 대신 명시 rebuild가 필요하다.

[목록 reader](../../../lib/public-blog-list.ts)는 repeatable-read/read-only의 같은 client로 현재 published/current-version, epoch, active generation, manifest/privacy policy, source revision과 목록 artifact를 읽는다. off-page 누락·손상도 먼저 확인하고 동일 결과 집합에서 태그 개수·필터·정렬·전체 개수·페이지 상한·시리즈를 계산한다. 반환은 표시할 DTO와 작은 집계다. 첫 페이지 시리즈 때문에 전체 원문을 다시 읽던 호출을 제거했다. metadata/page의 React 요청 cache, 공개 URL/canonical, 화면 문구와 Home 3개 제한은 유지했다.

- `source`: 기존 원본 reader로 같은 snapshot의 목록과 시리즈를 생성한다.
- `shadow`: 같은 snapshot의 두 결과를 비교하고 원본 결과를 반환한다. 불일치는 고정 로그 코드만 남긴다.
- `projected`: hit를 사용하고 누락·stale·손상은 제한 계산한다. DB/표식 장애를 전체 원본 조회로 숨기지 않는다.

fallback은 최대 10개, 원본 입력당 1MiB·합계 8MiB, 계산 deadline 2초다. 프로세스 동시 계산 2개, 공유 결과 최대 64개를 두고 입력 fingerprint가 같은 겹치는 요청은 결과를 공유한다. 마지막 reader 종료 시 공유 결과를 해제한다. 별도 인스턴스가 PG transaction advisory lock을 보유하면 즉시 `projection_busy`로 종료한다. SQL 2초/lock 250ms는 기존 snapshot helper가 적용한다. 단일 동기 parser를 강제 중단하는 기능은 없다.

요청은 파생 데이터를 쓰지 않는다. 영속 repair는 별도 명시 CLI가 담당한다. 따라서 10개보다 큰 cold catalog는 source 모드에서 rebuild 후 전환해야 하며 누락 항목은 repair 전까지 다음 독립 요청에서 다시 계산될 수 있다. 현재 파일은 DB snapshot 밖에서 바뀌므로 승인된 thumbnail 후보를 저장하고 표시할 항목의 파일 bytes/hash를 매 응답 확인한다. 파일이 나중에 생성되거나 삭제·손상되는 경우도 처리한다.

## 검증

[DB 회귀](../../../scripts/public-blog-list.integration.test.mjs)는 자체 UUID DB·소유 marker·합성 글을 만들고 정상 DROP으로 정리한다. 기본 CI의 `test:projection:db`에 포함했다.

| 검증 | 결과 |
| --- | --- |
| RED | 기존 공개 loader가 원문 본문 10행을 전송해 0행 assertion 실패. rebuild 뒤 생성된 thumbnail이 표시되지 않는 실패도 확인 |
| 새 목록 DB | 9/9: 필터/태그 별칭/페이지 상한, source/shadow 동등성, 조회 중 철회·시리즈 snapshot, off-page 누락/손상, 8 cold miss의 1회 계산, 다른 PG session의 lock 충돌, 파일 변경, 정책/표식/DB 장애와 상한, 1,000개 부하 |
| projection 전체 DB | 24/24, 기존 원본 보존·복구·writer 현재성 포함 |
| projector/CLI | 6/6 |
| 전체 integration | 33/33: migration·repository·공개 경로·worker·Brain·편집/초안·자동화·관측 등 |
| unit | 305 pass / DB opt-in 29 skip / 실패 0 |
| SEO HTTP | production/development 각각 21/21, 합계 42/42. canonical/noindex, JSON-LD escaping, DB 실패 500과 복구 포함 |
| 브라우저 | 각 모드에서 목록 42표본·상호작용 9개, 1440/390/320px·JS ON/OFF·키보드·URL/history·빈 목록·검색/DB 오류 복구. Home 스트리밍/복구·레이더, Brain 발견 6표본·다섯 배치·reader/history 검수 |
| source lint·typecheck·build | 통과. 기본 Windows build와 Docker runner build 모두 확인 |
| 전체 lint | 기존 Git 제외 private helper의 오류 10개·경고 27개로 실패. source lint는 별도 통과 |
| 문서/JSON/경로/phase/diff | 파서·링크·읽을 파일·60 phases/209 steps·F 7/15·R 14와 `git diff --check` 확인 |

최초 build/dev 실행은 기존 Next.js 16.4.3 보안 권고로 종료했다. 보안 업그레이드를 권고하며 이번 기능 범위에서 의존성을 변경하지 않았다. Windows Turbopack 캐시 오류는 생성된 `.next` 캐시를 정리한 뒤 기본 build가 통과했다. 샌드박스가 차단한 loopback 테스트는 로컬 접근 권한으로 통과했다. 전체 integration의 마지막 관측 테스트는 기존 FORCE DROP과 종료 중 연결의 경쟁으로 한 번 실패했으며 단독/전체 재실행은 모두 성공했다. 해당 무관한 테스트는 수정하지 않았다.

개발 UI 검수 중 기존 Brain 검증기가 Next dev의 같은 origin `/__nextjs_font/`를 차단했다. [검증기](../../../scripts/brain-discovery.browser-check.mjs)에 이 로컬 자산 경로만 허용해 재검수했다. 외부 origin 차단은 유지했다.

## 성능과 SQL

[수치·환경 기록](public-blog-list-performance-2026-11-17.json)은 F1과 동일 SHA의 합성 공개 글 1,000개·비공개/철회 각 1개·글당 2버전, app CPU 2/2GiB·PG CPU 1/1GiB 조건이다. Windows i7-13700K, 호스트 Node 22.14.0, 컨테이너 Node 24.19.0, Next 16.4.3, Docker 29.6.1을 사용했다. 각 조건은 별도 첫 요청·준비 요청 후 warm 32개다. OS/DB cache를 비운 cold나 운영 p95가 아니다.

| 경로 | 동시 요청 | source p50/p95 ms | projected p50/p95 ms |
| --- | --- | --- | --- |
| `/blog` | 1 | 277.60 / 295.24 | 39.62 / 43.06 |
| `/blog` | 8 | 2,105.76 / 2,244.54 | 217.57 / 301.46 |
| `/` | 1 | 266.35 / 278.20 | 37.66 / 42.84 |
| `/` | 8 | 2,074.73 / 2,117.88 | 204.03 / 299.69 |

F1 `/blog` 예산은 동시성 1에서 p50 917.35ms/p95 1,016.73ms, 동시성 8에서 6,868.08ms/9,253.38ms이며 모두 통과했다. Home은 F1 별도 기준선이 없으므로 같은 후보의 source 모드와만 비교했다. 새로운 전체 상태 관리 없이 warm 목록은 데이터 SELECT 3회, 원문 본문 0행·평균 2,499 bytes를 전송한다. 데이터 크기는 실제 DB 결과 행을 JSON 직렬화한 값이며 PG wire protocol 크기가 아니다.

동시성 8의 `/blog` 앱 CPU는 요청당 294.42→11.90ms, 마지막 표본군 뒤 앱 RSS는 419.25→177.51MiB였다. cgroup CPU와 프로세스 RSS이며 F1 순수 함수 CPU/브라우저 GC heap과 섞어 비교하지 않는다. 전체 HTML 응답 크기는 58,282 bytes로 두 모드가 같다. 재생성은 원본 조회 시작부터 검증·active 전환까지 8,847ms, batch 최대 463,775 bytes로 60초/8MiB 기준 안이다.

`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`은 ANALYZE 후 기존 계획과 published partial covering index 후보를 각 5회 확인한다. source/entry PK가 사용되고 후보 index는 선택되지 않았다. 기존/후보 실행 중앙값은 16.24/15.28ms, shared hit 6,869 blocks·temporary spill 0이며 후보가 계획에 사용되지 않아 새 index를 추가하지 않았다. 후보 생성과 통계 변경은 실험 transaction rollback으로 정리한다. 실행 계획·요청 SQL/전송량 기록은 위 성능 JSON에 함께 남긴다.

## 재현과 인계

`apps/h-log`에서 소유 확인된 loopback `hlog_projection_*` DB에 아래 검증을 실행한다. 원격 DB나 실제 발행은 사용하지 않는다.

```powershell
$env:HLOG_PROJECTION_TEST='1'
$env:DATABASE_URL='<owned loopback hlog_projection_* database>'
npm run test:projection:db
npm run test:integration
npm run test:projection
npm run test
npx eslint . --ignore-pattern 'private/**'
npm run typecheck
npm run build
```

HTTP 재현은 [F1 실행기](../../../scripts/performance-baseline.mjs)의 같은 fixture·Docker 자원 상한·32개/동시성 1·8 측정법으로 source/projected 각각 `/blog`와 `/`를 실행한다. projection은 소유 marker DB에서 migration 016과 `projection:local rebuild` 후 활성화한다. 이번 실행의 script SHA, app source SHA, fixture SHA, image ID와 모든 조건별 표본 요약은 성능 JSON에 보관한다. HTTP/브라우저 원본 로그·스크린샷은 Git/Docker 제외 `private/f3-list-2026-11-17/`에 둔다. 소유한 실험 컨테이너/네트워크·앱 프로세스·DB와 thumbnail만 정리한다.

**F completed 7·pending 15**, R 14 completed. 다음은 [F3 Step 4 projected-detail-navigation](../../../phases/rebuildable-public-read-models/step4.md)다. 상세·이전/다음·관련/프로젝트 탐색의 전체 원문 조회, Blog/Brain 복합 snapshot은 후속 범위다. 크롤러/HTTP cache는 Step 5, 검색은 F4에 남는다. 운영 적용은 별도 승인 대상으로 유지한다.
