# Step 3: second-brain-admin-integration

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. A1 Steps 0–2 완료.

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

## 작업

1. 기존 /admin/brain 작성·검색·회고·연결·후보·미리보기를 공통 관리자 탐색에서 사용한다. 현재 URL과 원본/수정 이력을 보존하고 별도 Brain 관리 도구를 만들지 않는다. 정적 28개 노드/42개 연결은 코드로 관리됨을 구분하고 이 편입에서 자동 DB 이관이나 전체 카탈로그 웹 편집을 구현하지 않는다.
2. 기록 저장·공개용 사본 확인·공개·해제를 명확히 구분한다. 비공개 수정과 연결 후보 선택으로 기존 공개 사본이 자동 갱신되지 않게 한다.
3. 공통 인증 전환 후 records endpoint·동시 revision 충돌·DB 오류·기능 비활성 상태를 검증한다. 공개 /brain 그래프의 기존 Memory UI와 카탈로그는 변경하지 않는다.

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
2. npm run test:brain:http 및 필요한 격리 DB 통합 테스트, 1440/390/320px의 작성/검색/오류를 검증한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A4 admin-resume-pdf Step 0, 이후 operations-observability Step 0과 A2 Step 0. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
