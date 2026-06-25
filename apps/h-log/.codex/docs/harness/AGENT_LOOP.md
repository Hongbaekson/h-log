# H-Log TDD + Harness Agent Loop

H-Log 작업은 이 루프를 기본 실행 단위로 사용한다. 목적은 큰 기능을 한 번에 구현하지 않고, 문서 확인 -> Harness step 선택 -> TDD 검증 -> 문서 동기화까지 반복 가능한 단위로 고정하는 것이다.

## Loop

Prompt:

> H-Log 작업을 시작하기 전에 `apps/h-log/AGENTS.md`, `apps/h-log/.codex/docs/harness/PRD.md`, `apps/h-log/.codex/docs/harness/ADR.md`, `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`, `apps/h-log/.codex/docs/harness/WORKFLOW.md`, `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`, `.codex/skills/harness/SKILL.md`를 읽어라. production code를 바꾸는 step이면 `.codex/skills/tdd/SKILL.md`도 읽어라. Harness에서 한 step만 선택하거나 제안하고, failing test를 먼저 확인한 뒤 최소 구현과 가까운 검증을 수행해라. 문서가 템플릿이거나 코드와 충돌하면 구현하지 말고 문서 갱신 또는 결정 요청으로 멈춰라.

## When To Run

- H-Log 구현 계획을 만들 때
- `apps/h-log/phases/` 아래 Harness phase 또는 step을 작성할 때
- production code를 추가, 수정, 리팩터링, 버그 수정할 때
- PRD, ADR, ARCHITECTURE와 구현 방향이 달라질 때
- 자동 블로그 DB/worker/public route 상태 전이 기준을 바꿀 때
- 콘텐츠/SEO/프라이버시 기준이 바뀔 때

## One Cycle

1. 현재 상태를 읽는다.
   - `apps/h-log/AGENTS.md`
   - `apps/h-log/.codex/docs/harness/PRD.md`
   - `apps/h-log/.codex/docs/harness/ADR.md`
   - `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
   - `apps/h-log/.codex/docs/harness/WORKFLOW.md`
   - `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
   - 관련 Harness phase/step
2. 이번에 실행할 한 step만 고른다.
   - phase가 없으면 step 초안을 먼저 제시한다.
   - phase 파일 생성 전에는 사용자 확인이 필요한지 판단한다. 사용자가 "만들어줘"라고 명시하면 바로 생성한다.
3. production code 변경이면 TDD를 강제한다.
   - RED: 실패해야 하는 테스트를 먼저 작성한다.
   - RED 확인: 기대한 이유로 실패하는지 확인한다.
   - GREEN: 통과에 필요한 최소 구현만 한다.
   - REFACTOR: 테스트가 통과하는 범위에서만 정리한다.
4. 가까운 검증을 실행한다.
   - focused test를 먼저 실행한다.
   - 필요한 경우 `npm run lint`, `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
5. 기록한다.
   - 완료한 step의 결과와 검증 command를 남긴다.
   - 설계가 바뀌면 `PRD.md`, `ADR.md`, `ARCHITECTURE.md` 중 필요한 문서를 갱신한다.
   - Harness step을 완료했다면 해당 phase index의 status와 summary를 갱신한다.

## Stop Rules

- PRD, ADR, ARCHITECTURE가 템플릿 상태라 구현 판단을 할 수 없으면 멈춘다.
- 문서와 코드가 충돌하면 어떤 쪽을 기준으로 할지 확인한다.
- failing test를 먼저 만들 수 없는 production change는 완료 처리하지 않는다.
- 공개 금지 정보가 UI, content, fixture, log, markdown에 들어갈 위험이 있으면 멈춘다.
- 자동 블로그 전환 작업에서 public route가 `published`가 아닌 글을 노출할 가능성이 있으면 멈춘다.
- "직접 해봤다" 표현을 증거 없이 생성하거나 fixture에 넣으려 하면 멈춘다.
- 검증 실패가 현재 step 범위를 벗어나면 실패 command와 핵심 error를 기록하고 다음 범위를 확인한다.

## Terminal States

- `done`: step의 인수 기준과 검증이 통과했다. phase step은 `completed`로 기록한다.
- `clean-no-op`: 최신 코드/문서가 이미 요구사항을 만족한다. 변경 파일 없이 근거와 확인 command를 남긴다.
- `blocked`: 사용자 결정, 비공개 정보 확인, 외부 계정/secret/환경 접근이 필요하다. phase step은 `blocked`로 기록한다.
- `approval-required`: DB 전환, 배포, 외부 알림, 공개 발행처럼 영향이 큰 행동 전에 명시 승인이 필요하다.
- `error`: 현재 step 범위 안에서 검증이 실패했고 수정 시도 후에도 해결하지 못했다. phase step은 `error`로 기록한다.
- `no-progress`: 같은 실패가 반복되고 새로운 관찰이 다음 행동을 바꾸지 못한다. 실패 command와 마지막 관찰을 남기고 멈춘다.

## Handoff

각 cycle 종료 시 아래만 남긴다.

- 변경한 파일
- 통과한 검증 command
- 실패한 검증 command와 핵심 error
- 다음에 이어갈 Harness step
- 사용자 결정이 필요한 항목
