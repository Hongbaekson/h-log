# Step 1: public-catalog-contract

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
- `lib/public-source-url.ts`
- `lib/brain.ts`
- `lib/brain-catalog.ts`

## 작업

초기 카탈로그와 명시적 공개 DTO, 검색/필터/상세 조회를 구현한다. 비공개 노드와 관계 및 내부 경로가 public payload에 포함되지 않는 테스트를 먼저 실패시킨다.

2026-10-06 완료: 사용자가 `private/second-brain-review.md`의 추가 18개 노드를 명시적으로 공개 승인했다. 일반화된 편집본만 카탈로그에 반영해 28개 노드/42개 연결을 공개하며, 원문과 근거 대장은 계속 비공개로 보존한다. 신규 상세 경로의 404 RED 후 전체 28개 상세 200, 검색·목록·관계·출처·공개 경계를 검증했다. 늘어난 노드 수에서 발견한 그래프 겹침과 탐색 문제도 재현·수정했다. 다음은 Step 3의 소유자 전용 비공개 작성/저장이다.

## 인수 기준

공개 항목만 검색·연결·상세에서 반환되고, 모든 관계가 존재하는 노드를 가리키며, 출처 링크가 안전하다.

## 검증

1. 변경의 focused RED를 확인한 뒤 최소 구현으로 같은 GREEN을 확인한다.
2. node --no-warnings --test --experimental-strip-types lib/brain.test.ts
3. 코드 변경 시 앱의 전체 필수 gate를 통과한다. UI 변경은 데스크톱/모바일에서 직접 확인한다.
4. 완료한 실제 범위와 미구현 범위를 phase index에 기록한다.

## 하지 말 것

- 회사 원문·내부 식별자·비공개 근거 경로를 공개 카탈로그나 fixture에 넣지 않는다. 이유: 개인 기술 기록으로 일반화하는 범위만 승인됐다.
- 추측한 당시 감정·개인 기여·성과·도입 이력을 경험으로 확정하지 않는다. 이유: 코드 조사로는 증명할 수 없다.
- Home 레이더 전체, Blog DB source, OCI·timer·배포 상태를 변경하지 않는다. 이유: 이번 기능의 범위 밖이다.
- 방문자 챗봇이나 자동 기억 공개를 추가하지 않는다. 이유: 개인 기록과 읽기 기능이 우선이다.
