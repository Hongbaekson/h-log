# Step 3: private-capture

## 읽을 파일

- `AGENTS.md`
- `.codex/docs/harness/PRD.md`
- `.codex/docs/harness/ADR.md`
- `.codex/docs/harness/ARCHITECTURE.md`
- `.codex/docs/harness/WORKFLOW.md`
- `.codex/docs/harness/AGENT_LOOP.md`
- `.codex/docs/harness/SECOND_BRAIN_PLAN.md`
- `../../.codex/skills/harness/SKILL.md`
- `../../.codex/skills/tdd/SKILL.md`
- `lib/brain.ts`
- `lib/brain-catalog.ts`
- `lib/blog-postgres-repository.ts`
- `migrations/`

## 작업

현재 카탈로그와 별개로 인증된 소유자 입력의 위협 경계를 정한다. 최소 PostgreSQL 원본·수정 이력·선택 공개를 TDD로 구현하고 필요한 카탈로그 전환을 명시한다.

## 인수 기준

타인은 원본/작성 화면에 접근할 수 없고, 저장/수정/공개 해제/공개 투영을 DB integration과 HTTP에서 검증한다.

## 검증

1. 변경의 focused RED를 확인한 뒤 최소 구현으로 같은 GREEN을 확인한다.
2. 관련 DB integration과 npm run test/lint/typecheck/build
3. 코드 변경 시 앱의 전체 필수 gate를 통과한다. UI 변경은 데스크톱/모바일에서 직접 확인한다.
4. 완료한 실제 범위와 미구현 범위를 phase index에 기록한다.

## 완료 결과 — 2026-10-07

- ADR-022로 단일 소유자 인증과 공개 사본 경계를 정했다. `/admin/brain`과 `/admin/brain/records`는 Proxy/page/handler에서 각각 인증하며, 다른 Origin의 쓰기를 거부한다. 서버 설정이 없으면 404, 인증이 없으면 401이고 비공개 응답은 no-store/noindex다.
- `004_brain_capture.sql`, `brain-postgres-repository.ts`가 원문·수정 이력과 선택 공개를 저장한다. row lock과 예상 revision 검사로 동시 수정 유실을 막고, 과거 버전의 UPDATE/DELETE는 DB에서 거부한다. 저장 실패 시 transaction을 되돌린다.
- 공개용 제목·요약·본문을 따로 작성하고 확인한 사본만 공개한다. `brain-server.ts`의 공통 공개 조회가 그래프·검색·상세·사이트맵에 사본만 더한다. 수정만으로 공개 사본이 바뀌지 않고 공개 해제 후 원문·이력은 남는다. 공개 SQL은 원문을 조회하지 않는다.
- 기존 카탈로그 28개/42개는 편집형 자료로 유지하며 자동 이관하지 않는다. 기능은 `HLOG_BRAIN_DATABASE_ENABLED=1`로만 켠다. [설정과 로컬 실행](../../.codex/docs/harness/SECOND_BRAIN_PLAN.md#로컬-작성-화면-실행)을 기록했다.
- 작성 UI는 별도 Discord 스타일 화면이다. 기존 Memory UI와 Home/레이더는 수정하지 않았다. 새 메모의 관계 편집·사건 시점·이후 회고는 Step 4에 남긴다.

## 검증 기록

- RED: 인증·공개 필드 선택·HTTP 입력·DB 저장의 미구현 경계, migration 004 누락, NextURL loopback 정규화에 따른 정상 요청 403을 각각 재현했다. 구현과 Host 검증 수정 후 같은 테스트를 GREEN으로 통과했다.
- `npm run test`: 200개 중 **187 pass / 13 DB skip**. `npm run test:integration`: 격리 PostgreSQL에서 **14/14**, skip 0.
- `scripts/brain-capture.http.test.mjs`: 격리 preview와 `HLOG_BRAIN_HTTP_TEST=1`로 **1/1**. 익명/RSC/다른 Origin 차단, private 원문 비노출, 공개·수정·충돌·해제와 전체 sitemap HTTP를 확인했다. 재실행 명령은 `npm run test:brain:http`다.
- `npm run lint`, `npm run typecheck`, `npm run build` 통과. DB 검증은 immutable history, rollback, 두 동시 수정 중 하나만 성공, 공개 시점과 조회 시점의 privacy 재검사를 포함한다.
- 브라우저 1440/390/320px에서 비공개 저장, 빈 공개 초안, 미리보기/확인 후 공개, 저장 전 기록 닫기 취소, 수정 이력, 공개 해제와 가로 넘침 0, pageerror 0을 확인했다. 스크린샷은 로컬 ignored 검증 디렉터리에 보존했다.
- 모든 데이터는 합성 기록이며 운영 DB·OCI·Nginx·timer는 변경하지 않았다. 현재 preview DB는 임시 검증용이다.

## 하지 말 것

- 회사 원문·내부 식별자·비공개 근거 경로를 공개 카탈로그나 fixture에 넣지 않는다. 이유: 개인 기술 기록으로 일반화하는 범위만 승인됐다.
- 추측한 당시 감정·개인 기여·성과·도입 이력을 경험으로 확정하지 않는다. 이유: 코드 조사로는 증명할 수 없다.
- Home 레이더 전체, Blog DB source, OCI·timer·배포 상태를 변경하지 않는다. 이유: 이번 기능의 범위 밖이다.
- 방문자 챗봇이나 자동 기억 공개를 추가하지 않는다. 이유: 개인 기록과 읽기 기능이 우선이다.
