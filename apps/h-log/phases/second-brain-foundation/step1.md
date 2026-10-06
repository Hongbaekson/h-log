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

2026-10-06 진행 상태: 기존 공개 자료에서 작성한 10개 노드/8개 연결과 DTO는 구현·검증됐다. 추가 18개는 `private/second-brain-review.md`의 구체적인 공개 내용에 대한 승인 대기다. 자동 승인 검토의 거절을 `visibility` 변경이나 다른 실행 도구로 우회하지 않는다. 승인받은 경우에만 해당 본문·관계를 편집형 카탈로그에 반영하고, 늘어난 노드 수로 그래프 겹침·목록·상세·공개 경계를 다시 검증한다. 비공개 유지 결정을 받으면 이 공개 범위를 최종 카탈로그로 기록한다.

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
