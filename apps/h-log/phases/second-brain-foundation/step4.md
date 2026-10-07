# Step 4: revisit-and-curation

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
- `lib/brain-capture.ts`
- `lib/brain-postgres-repository.ts`
- `lib/brain-server.ts`
- `migrations/004_brain_capture.sql`
- `app/admin/brain/`
- `app/brain/`
- `components/brain/`

## 작업

Step 3의 비공개 원문·추가만 가능한 수정 이력·별도 공개 사본 계약 위에서 원래 기록과 나중의 회고를 분리한다. 사건 시점과 기록 시점, 생각을 수정한 관계와 다시 읽기 탐색을 추가한다. 새 DB 메모와 기존 공개 카탈로그 사이의 관계를 소유자가 편집하고 공개할 수 있게 하되 비공개 대상이나 제목이 공개 관계에 섞이지 않게 한다. 날짜를 추정해 사실처럼 채우지 않는다.

## 인수 기준

원문은 보존되고 이전/이후 생각과 시간순 흐름을 확인할 수 있다. 실제 데이터로 검색/모바일 읽기를 검증한다.

## 검증

1. 변경의 focused RED를 확인한 뒤 최소 구현으로 같은 GREEN을 확인한다.
2. 가까운 focused test와 npm run test/lint/typecheck/build
3. 코드 변경 시 앱의 전체 필수 gate를 통과한다. UI 변경은 데스크톱/모바일에서 직접 확인한다.
4. 완료한 실제 범위와 미구현 범위를 phase index에 기록한다.

## 완료 결과 — 2026-10-07

- `BrainDraft`의 사건 날짜·공개 동의·연결은 선택 필드다. 과거 JSONB 원문/버전을 다시 쓰지 않는다. 잘못된 날짜·중복/자기 자신/없는 대상·빈 이유를 거부한다.
- 회고 이어 쓰기는 새 비공개 메모를 만든다. `revises`는 새 생각에서 이전 생각을 가리키며, 양쪽 공개 화면에서 이전 생각/이후 회고를 구분한다. 공개 사본의 연결은 명시적 공개 시 고정되고 양쪽 공개 상태를 읽을 때 다시 확인한다.
- 소유자 목록은 제목·태그 검색과 정리일/사건일 정렬을 제공한다. 공개 목록 정렬은 URL에 보존하며 모르는 사건 날짜는 맨 뒤에 둔다. 기존 그래프 배치는 유지한다.
- RED: 새 필드 거부, 관계·시간 정렬 부재, DB graph 조회 부재, 브라우저 사건 날짜 입력 부재를 재현했다. 같은 검증의 GREEN 후 unit 190 pass/13 DB skip, PostgreSQL integration 14/14, typecheck/lint/build를 통과했다.
- 1440/390/320px에서 회고 작성 전후 원문과 이력이 그대로임을 확인했다. 날짜 비공개/공개, 양방향 읽기, 철회 후 관계 제거, 검색/정렬/URL, 실제 카탈로그 Redis 검색·모바일 읽기와 overflow/pageerror 0을 검증했다.
- 다음은 Step 5의 로컬 후보 제안이다. 운영 적용과 영구 저장소 구성은 기존 보류 범위다.

## 하지 말 것

- 회사 원문·내부 식별자·비공개 근거 경로를 공개 카탈로그나 fixture에 넣지 않는다. 이유: 개인 기술 기록으로 일반화하는 범위만 승인됐다.
- 추측한 당시 감정·개인 기여·성과·도입 이력을 경험으로 확정하지 않는다. 이유: 코드 조사로는 증명할 수 없다.
- Home 레이더 전체, Blog DB source, OCI·timer·배포 상태를 변경하지 않는다. 이유: 이번 기능의 범위 밖이다.
- 방문자 챗봇이나 자동 기억 공개를 추가하지 않는다. 이유: 개인 기록과 읽기 기능이 우선이다.
