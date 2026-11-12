# 기록·탐색 개선 로컬 통합 검수

2026-11-13(KST), [R5 Step 2](../../../phases/knowledge-review-workflow/step2.md)를 완료했다. R1–R5의 저장·공개 경계와 연결·탐색·수동 재검토를 현재 코드로 함께 검수했다. **R 14개 step 완료**이며 제품 코드, 공개 콘텐츠, 운영 DB는 변경하지 않았다.

## 기준과 실행 범위

| 항목 | 이번 실행 |
| --- | --- |
| 코드 / production build | `a6041b5583dd9a2893464604954f8d6a45453c9b` / `cmICMLHnDDQ9ps3NHIPsH` |
| 환경 | Windows, Node 22.14.0, Next.js 16.4.3, Docker 29.6.1, 기존 Playwright·Edge |
| 앱 | `next start`와 `next dev`, `http://127.0.0.1:3068`; production 관리자만 임시 HTTPS proxy `https://127.0.0.1:3069` |
| 공개 주소 | canonical용 합성 주소 `https://hlog.example.org`; 실제 도메인 검증 아님 |
| DB | 고정 digest의 pgvector PG16, loopback 임의 포트·tmpfs·매 실행 새 암호를 쓰는 전용 합성 DB |
| 자료 | 정적 카탈로그 28개, 합성 공개/비공개/철회 글과 노트, 기존 R2/R3의 검토 후보를 복제한 격리 fixture |
| 화면 | 1440/390/320px, production/dev, JS ON/OFF, 키보드·뒤로가기·독립 상세·canonical·가로 넘침 |
| 기록 | Git/Docker 제외 `private/r5-release-2026-11-13/`의 실행기·로그·JSON·화면 캡처 |

브라우저의 외부 origin 요청은 차단했다. 검수용 명령은 아래 저장소 스크립트를 재사용하며 opt-in과 자격 증명은 임시 프로세스에만 주입했다. 기존 DB나 실제 provider를 사용하지 않았다.

## 결과

| 검사 | 결과 | 확인한 경계 |
| --- | --- | --- |
| migration·Brain·검토·관리자 감사·공개 조회 DB 테스트 | **8/8**, skip 0 | 이전 migration/필드 없는 기록, 기존 fingerprint, 원자적 감사·확인 이력, 공개 사본 불변 |
| `test:seo:http`의 실제 명령과 opt-in | **21/21 × 2모드**, skip 0 | URL/canonical/noindex, 현재 공개 글·crawler, 빈 목록·조회 오류·비공개/누락/철회 상세 |
| `test:brain:http`의 실제 명령과 opt-in | **1/1 × 2모드**, skip 0 | 인증/Origin/no-store, 출처·질문 저장→공개→미선택 수정→재공개→철회, private 원문·검토 메모 제외 |
| 관리자 검토 브라우저 | **12/12** | 버전별 확인·재확인, 미저장 잠금, 유실 응답 재확인, JS OFF 조회와 쓰기 비활성 |
| Brain 기본 발견 | **24/24** | 파일 카탈로그/DB 모드 각각 12표본, 보이는 독립 상세 링크·본문·canonical |
| Blog↔Brain 출처와 실패 | **12/12** + HTML/RSC 검사 | 비공개·누락·철회 출처 제거, 조회 장애 시 연결 안내와 본문 유지, 공개 사본 보존 |
| 태그 별칭 | **12/12** + 두 모드 HTTP | 대표 표기·결과/개수, 검색·태그 조건과 페이지 복원, 철회 재확인, 원래 태그/버전 보존 |
| 태그 배지 | **30/30** | 목록/상세와 JS 검색 결과, native 링크·키보드·새 탭·뒤로가기 |
| 글·소제목 주소 복사 | **24/24** | 성공/권한 거부/미지원/JS OFF, canonical과 heading hash, focus·직접 이동·새로고침 |
| 편집된 읽기 경로 | **12/12** + HTML/RSC 검사 | Portfolio→시리즈→Brain→출처 왕복, 중간 글/노트 철회와 빈 연결 제거 |
| dump/restore | **검토 이력 20건·원문 24버전 동일** | 복원 DB의 모든 해당 행 비교 |
| 현재 production build | **통과** | 기존 썸네일 경로의 동적 filesystem tracing 경고 2개 유지 |

브라우저 표본은 위 묶음 합계 **126개**다. 여러 동작을 포함하는 시나리오 수이며 HTTP 요청 수나 독립 사용자 수가 아니다. Home 레이더와 공개 Brain canvas/모바일 reader도 보조 검사·캡처로 대조했다. 공개 UI 소스는 변경하지 않았다. 전체 성능 벤치마크는 반복하지 않았다.

DB 검사 명령은 `node --no-warnings --experimental-strip-types --test --test-concurrency=1`에 `scripts/blog-migrations.integration.test.mjs`, `lib/brain-postgres-repository.integration.test.ts`, `lib/brain-review.integration.test.ts`, `lib/blog-admin-operations.integration.test.ts`, `lib/blog-public-read-path.integration.test.ts`를 전달했다. `test:brain`과 `test:public-read-path`의 대상도 포함한다. HTTP는 `package.json`의 `test:seo:http`·`test:brain:http`와 같은 Node 명령을 opt-in 상태로 실행했다.

브라우저는 기존 `scripts/brain-review.browser-check.mjs`, `brain-discovery.browser-check.mjs`, `blog-tag-badges.browser-check.mjs`, `blog-link-copy.browser-check.mjs`와 R3/R4의 로컬 실행기를 사용했다. 이번 자료의 `verification-summary.json`은 표본별 수와 복원 결과, `docs-verification.json`은 문서/레지스트리 검증을 담는다.

## 재실행과 자료 보존

첫 sandbox build는 컴파일에서 진행하지 않아 해당 프로세스를 종료했다. 동일 명령을 로컬 권한으로 실행한 build는 통과했다. 직접 `next start`의 기존 standalone 실행 안내는 남아 있으며 배포 이미지·Nginx 전체를 재검증한 결과로 확대하지 않는다.

첫 production 읽기 경로 검사는 화면·철회 검사를 통과한 뒤 과거 manifest의 코드 hash 비교에서 실패했다. 원인은 R4 이후 바뀐 `lib/blog-public.ts`와 `app/blog/[slug]/page.tsx`였다. 22개 입력 중 원고·후보 등을 포함한 20개는 과거 hash와 같고, 이 두 파일은 현재 commit의 기준으로 별도 기록했다. 과거 manifest를 고치지 않고 이번 `baseline-inputs.json`을 만들었다. 연결 검사만 다시 실행해 두 모드의 22개 현재 입력 hash 보존까지 확인했다. 최초 실패 로그도 보관했다.

실행 중 만든 임시 DB 컨테이너 8개(재실행 포함), loopback 앱·HTTPS proxy, 임시 암호/인증서 파일을 정리했다. 각 실행 receipt의 cleanup과 종료 후 컨테이너/3068·3069 listen 부재를 확인했다. 개발 서버가 자동 변경한 `next-env.d.ts`는 작업 시작 상태로 복원했다. 원래 있던 `.tmp/`는 보존했다.

## 현재성·후보·잔여 작업 인계

- [현재 주장 대장](CURRENT_CLAIMS_INVENTORY.md)의 R2-C01–C05 판정을 유지한다. 이번 합성 검수는 실제 운영 성과·회사 지표의 재측정이 아니며 공개 검증일을 갱신하지 않는다.
- [원고 검토본](EVIDENCE_CASE_MANUSCRIPT_REVIEW.md), [Brain 후보 3개](BRAIN_PRINCIPLE_DRAFT_REVIEW.md), [시리즈·읽기 경로 후보](CURATED_READING_PATH_REVIEW.md)는 검수 자료다. 이번 격리 fixture의 공개/철회는 실제 발행이 아니다.
- [수동 재검토 기능](BRAIN_MANUAL_REVIEW_REVIEW.md)은 로컬 구현·검수가 끝났다. migration 013의 운영 적용과 실제 기록 확인/발행은 실행하지 않았다. 이전 버전 확인은 새 버전으로 승계하지 않는다.
- 기존 [SEO 릴리스 한계](SEO_RELEASE_REVIEW.md)의 Home no-JS 최근 글 직접 링크, no-JS DB 오류 안내, 실제 이미지·field 성능과 검색 성과는 이번에 해소했다고 판단하지 않는다. 기존 전체 관리자 목록/원문 history 비용은 F6에 남는다.
- 제품 코드 변경이 없어 새 TDD RED나 전체 unit/lint/typecheck를 반복하지 않았다. 기본 lint의 Git 제외 private helper 오류는 이전 검수에서 확인된 미해결 사항이다. 이번 통과 항목에 lint를 포함하지 않는다.

문서·JSON 파싱, 새 상대 링크 35개, 전체 60 phase/209 step, R 14 completed·F 22 pending, 다른 트랙 상태 보존, private의 Git/Docker 제외와 `git diff --check`를 검사했다. 상위 R5 요약과 이미 완료한 S3 Step 0의 오래된 요약도 실제 하위 index에 맞췄다.

기존 SEO S3 Step 1은 OCI 보류와 실제 도메인·Search Console 계정/범위 미확정으로 blocked이며 Step 2는 pending이다. 모니터링 Step 7→관리자 A3 Step 4→timer의 순서와 보류를 유지한다. **운영 보류 중 다음 독립 로컬 작업은 [F1 Step 0](../../../phases/performance-baseline/step0.md)의 성능 기준선**이다. 이 단계에서 F 작업을 시작하거나 운영 승인을 요청하지 않았다.
