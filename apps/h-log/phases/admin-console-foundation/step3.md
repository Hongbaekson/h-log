# Step 3: second-brain-admin-integration

## 상태와 선행 조건

완료: 2026-10-26. A1 Steps 0–3의 로컬 구현·검증을 완료했다. 운영 적용은 별도 보류 상태다.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step에서 추가한 실제 인증/정책/요청/조회 파일도 그 완료 기록을 따라 읽는다. 아래 목록은 등록 시 존재하는 파일이다.

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
- `apps/h-log/.codex/docs/harness/ADMIN_CONSOLE_PLAN.md`
- `apps/h-log/.codex/docs/harness/ADMIN_ACCESS_CONTRACT.md`
- `plans/automated-blog-publishing-plan.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/admin-console-foundation/index.json`
- `apps/h-log/phases/admin-console-foundation/step2.md`
- `apps/h-log/app/admin/brain/page.tsx`
- `apps/h-log/app/admin/brain/records/route.ts`
- `apps/h-log/components/brain/BrainCapture.tsx`
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/lib/brain-capture-http.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/lib/brain-postgres-repository.integration.test.ts`
- `apps/h-log/scripts/brain-capture.http.test.mjs`
- `apps/h-log/migrations/004_brain_capture.sql`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`

## 작업

1. 기존 /admin/brain 작성·검색·회고·연결·후보·미리보기를 공통 관리자 탐색에서 사용한다. 현재 URL과 원본/수정 이력을 보존하고 별도 Brain 관리 도구를 만들지 않는다. 정적 28개 노드/42개 연결은 코드로 관리됨을 구분하고 이 편입에서 자동 DB 이관이나 전체 카탈로그 웹 편집을 구현하지 않는다.
2. 기록 저장·공개용 사본 확인·공개·해제를 명확히 구분한다. 비공개 수정과 연결 후보 선택으로 기존 공개 사본이 자동 갱신되지 않게 한다.
3. 공통 인증 전환 후 records endpoint·동시 revision 충돌·DB 오류·기능 비활성 상태를 검증한다. 공개 /brain 그래프의 기존 Memory UI와 카탈로그는 변경하지 않는다.
4. Step 0 계약에 따라 내용 revision을 보존하면서 모든 변경에 증가하는 명령 revision과 commandId를 UI/API/DB에 함께 적용한다. 같은 내용의 공개/해제 경합과 중복 신규 저장을 구분하고 `admin_actions`를 Brain 대상·중복 receipt에 필요한 만큼만 확장한다. 상태 변경과 감사/receipt는 같은 transaction이며 감사 실패는 rollback한다. 기존 원문 버전·공개 snapshot은 재작성하지 않는다.

## 인수 기준

관리자에서 기존 Brain 기능을 동일하게 사용할 수 있고 원문·과거 버전은 비공개로 보존된다. 명시적으로 선택한 공개 사본만 기존 그래프/검색/사이트맵에 반영된다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 합성 메모로 저장→수정→충돌→공개→비공개 수정→공개 해제를 확인하고 원문이 public 응답에 없는지 검사한다.
   동일 commandId 재전송/다른 입력 충돌, 동시 공개·해제의 오래된 명령 revision 거부, 감사 실패 rollback을 추가로 재현한다. 예전 client의 누락 필드는 400과 새로고침 안내로 처리한다.
2. npm run test:brain:http 및 필요한 격리 DB 통합 테스트, 1440/390/320px의 작성/검색/오류를 검증한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 완료 기록 — 2026-10-26

- `006_brain_admin_commands.sql`: 기존 notes에 명령 revision 0을 추가하고 `admin_actions`를 Brain target·nullable UUID/fingerprint/receipt·owner+key 고유 제약으로 확장했다. 기존 원문/버전/공개 snapshot/감사 row는 보존했다.
- `brain-capture.ts`·`brain-capture-http.ts`·`brain-postgres-repository.ts`: 모든 변경에서 UUID와 예상 명령 revision을 검사한다. 내용 revision은 저장에만 증가한다. 고유 키 예약과 상태/버전 변경·안전한 감사 receipt를 같은 transaction에서 commit하며 실패하면 모두 rollback한다. 재전송은 원래 receipt를 반환하고 다른 입력의 키 재사용/오래된 revision은 409, 누락은 400과 새로고침 안내다.
- `BrainCapture.tsx`: 기존 작성/검색/회고/연결/후보/미리보기를 유지하며 처리 결과가 불명확하면 같은 요청을 재시도한다. 재확인 전에는 다른 변경을 잠그고 확정된 거부에는 초안을 보존한다. 최근 20개 저장·공개 변경 이력과 정적 28개 노드/42개 연결의 코드 관리 안내를 표시한다.

### 검증 결과

앱 디렉터리에서 실행했으며 DB·HTTP·브라우저 자료는 모두 격리된 로컬 합성 자료다.

- RED: 동시 신규 저장 재전송이 서로 다른 ID 2개를 만들었고, 명령 필드 없는 구 client가 DB에 접근해 503을 받았다. 브라우저에서는 503 후 동일 요청 재확인 버튼이 없었다. 수정 후 같은 검증이 통과했다.
- `node --no-warnings --test --experimental-strip-types lib/brain-capture-http.test.ts`: 5/5. 인증·origin·입력 크기·명령 필드·기능 OFF·안전한 오류를 검사했다.
- `npm run test:integration`: 16/16. 중복 신규 저장/입력 키 순서/다른 입력 충돌/이후 변경 뒤 이전 receipt 재전송, 동시 저장과 공개·해제 충돌, commit 시점 감사 실패에 대한 내용/상태/이력 rollback, 005→006 원문·공개 snapshot·과거 감사 보존과 재실행을 확인했다. 기존 블로그 repository·공개 조회·worker·dry-run도 통과했다.
- `npm run test`: 234 pass, DB 전용 14 skip, 실패 0. `npm run lint`, `npm run typecheck`, `npm run build` 통과.
- `npm run test:brain:http`: 1/1. 저장→공개→비공개 수정→해제, 요청 중복/충돌, 원문 비노출과 그래프·sitemap을 확인했다. `test:admin:http`와 같은 실행 파일로 공통 인증/두 ingress HTTP 4/4를 확인했다.
- `node private/admin-brain-check/browser.mjs`: 1440/390/320px 작성·검색·이력, 성공 응답 유실 뒤 같은 payload/key 재시도, 두 창의 공개 상태 변경 후 초안 충돌 보존, 검토 사본의 공개/해제를 확인했다. 가로 넘침 0, pageerror 0.
- `node private/admin-brain-check/lifecycle.mjs`: 기능 OFF와 DB 연결 오류를 별도 재시작으로 확인했다. 세 viewport에서 안내를 표시하고 records는 각각 404/503, 원시 DB 오류는 노출하지 않았다. 재현 도구/키/화면은 `private/`에만 보관한다.
- `node private/admin-brain-check/verify-docs.mjs`로 변경 21개(Markdown 10개/JSON 2개), 전체 phase JSON 46개·162개 step, 추가 상대 링크 10개·읽을 파일 26개와 다른 phase 상태 보존을 확인했다. `git diff --check`를 통과했다. 공개 Brain UI/카탈로그·Home/레이더·운영 배포 설정은 변경하지 않았다.

### 남은 경계

요청 재확인 정보는 현재 화면 메모리에만 있고 새로고침 후에는 유지되지 않는다. 브라우저 원문 영구 저장과 범용 감사 페이지는 추가하지 않았다. 변경 이력은 도입 후 완료된 명령만 표시한다. 새 schema와 앱의 동시 적용/rollback 시 관리자 쓰기 차단 절차는 배포 문서에 기록했으며 운영 migration·실제 자료 공개·OCI·DNS/TLS·provider·timer는 실행하지 않았다.

## 다음 단계

A4 admin-resume-pdf Step 0, 이후 operations-observability Step 0과 A2 Step 0. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
