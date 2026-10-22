# Step 0: admin-access-and-command-contract

## 상태와 선행 조건

상태: completed — 2026-10-23 접근·명령 계약 확정. 선행 조건 없음. 문서 단계이며 인증/화면/DB/배포 구현은 아직 변경하지 않았다.

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
- `apps/h-log/phases/admin-console-foundation/index.json`
- `apps/h-log/proxy.ts`
- `apps/h-log/lib/brain-owner.ts`
- `apps/h-log/lib/brain-owner.test.ts`
- `apps/h-log/app/admin/brain/page.tsx`
- `apps/h-log/app/admin/brain/records/route.ts`
- `apps/h-log/lib/brain-capture-http.ts`
- `apps/h-log/lib/brain-capture-http.test.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/lib/blog-admin.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/compose.yaml`

## 작업

1. 현재 page/API/worker/배포 경로를 대조해 읽기·저장·공개·철회·초안 요청·정책 변경·단건 재시도·PDF 등록/교체/공개/해제의 권한/부작용 표를 확정한다. 원문과 비공개 설정을 공개 DTO와 분리한다.
2. 기존 Basic/Host/Origin 계약을 출발점으로 공통 소유자 인증, Brain 기능 flag 분리, 환경값 이전·키 회전·분실 복구·운영 추가 인증 방식을 정한다. 세션을 선택한다면 기존 검증된 구현/라이브러리와 만료·로그아웃·host 전용 쿠키·CSRF를 먼저 확정하고 자체 암호 체계를 만들지 않는다.
3. 공개 host /admin 거부, 관리자 host 허용 경로, upstream Host와 proxy header 신뢰 경계를 정한다. 실제 도메인 없이 로컬 두 host로 검증 가능하도록 한다.
4. 각 후속 명령의 예상 revision/state·중복 요청·감사 transaction·중지 선형화 기준을 정의한다. 설정 저장과 실제 timer/worker 동작의 차이를 화면 상태로 명시한다. 새 추상 계층이나 schema를 아직 구현하지 않는다.

## 인수 기준

인증/host/Origin 행렬, 설정 이전·복구, 명령별 원본 데이터·허용 전이·감사·미설정/실패 의미가 문서와 실제 caller에 대응한다. 후속 구현 파일·가장 가까운 테스트 명령이 정해져 있다.

## 검증

Markdown/JSON 파싱·읽을 파일/상대 링크 검사와 `git diff --check`를 실행한다.

1. 익명/잘못된 키/잘못된 host/형제 subdomain/누락 Origin/직접 upstream/RSC 요청의 예상 거부 결과를 표로 검토한다.
2. 현재 Brain 기능을 끄면 인증도 닫히는 결합과 기존 Nginx Host 재작성의 이전 계획이 빠지지 않았는지 확인한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A1 Step 1 shared-owner-auth-and-shell. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## 완료 기록 — 2026-10-23

[관리자 접근·명령 계약](../../.codex/docs/harness/ADMIN_ACCESS_CONTRACT.md)에 실제 caller와 목표 동작을 구분해 기록했다. 공통 Basic 설정 세 값, Brain DB flag 분리, 구 환경값의 명시적 이전·키 폐기/복구, SSH 터널 안의 운영 HTTPS 기본안을 확정했다. Host/Origin·HTML/API/RSC·직접 upstream 행렬, 명령별 원본/전이/중복/감사와 중지 admission 기준 및 후속 구현 파일/검증 명령을 포함한다.

Brain 공개/해제는 현재 내용 revision을 증가시키지 않으므로 같은 내용의 동시 공개 상태 변경을 따로 검증해야 함을 확인했다. A1 Step 3에 명령 revision·중복 receipt·transaction 감사를 인계했다. A1 Step 1은 인증 추출과 shell에 한정한다.

앱 디렉터리에서 실행:

```bash
node --no-warnings --test --experimental-strip-types lib/brain-owner.test.ts lib/brain-capture-http.test.ts
node private/admin-access-check/verify-docs.mjs
git diff --check
```

기존 인증/HTTP 기준선 6/6을 통과했다. 변경 13개(Markdown 11개/JSON 2개), 전체 phase JSON 46개·162개 step, 새 상대 링크 13개와 읽을 파일 84개를 검증했다. 관리자 상태는 completed 1개·pending 15개·blocked 1개이며 다른 phase/step 상태는 보존했다. Markdown/JSON 파싱과 `git diff --check`를 통과했다. 문서 검사 도구/결과는 Git에서 제외한 `private/admin-access-check/`에 보관했다.

기준선 테스트는 새 공통 인증이 구현됐다는 증거가 아니다. production code/UI/schema/env 변경이 없어 RED/GREEN·build·브라우저 검수는 다음 구현 단계에서 실행한다. `/lab/queue`는 여전히 공개이고 이력서 PDF 다운로드도 아직 없다. 실제 키/도메인/DB·OCI·provider·timer는 변경하지 않았다.
