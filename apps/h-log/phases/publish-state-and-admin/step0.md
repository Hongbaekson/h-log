# Step 0: publish-state-machine

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- DB 수동 발행 phase에서 생성된 model, route, tests

## 작업

발행 상태와 최소 운영 명령을 테스트 가능한 상태 전이로 고정한다.

- publish, retry, unpublish, retract, correct의 허용 범위를 결정한다.
- required publish job 실패 시 공개 전환을 막는다.
- retryable job 실패는 published 상태를 유지하되 실패 사유를 기록한다.
- 최소 관리자 화면은 상태 확인과 명시된 운영 명령만 포함한다.
- 모든 운영 조작은 audit 가능한 action 기록을 남긴다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 상태 전이 실패 테스트를 먼저 작성한다.
2. 관리자 UI가 public route와 분리되는지 확인한다.
3. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 관리자 기능을 CMS 전체 기능으로 확장하지 말 것. 이유: 이 phase의 목표는 운영 상태 확인과 최소 명령이다.
- 로그인/권한 정책을 임의로 확정하지 말 것. 이유: 접근 제어 결정은 별도 보안 결정이 필요하다.
- 비공개 실패 글을 public route에서 볼 수 있게 하지 말 것.
