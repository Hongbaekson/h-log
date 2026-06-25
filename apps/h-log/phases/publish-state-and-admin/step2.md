# Step 2: admin-actions-audit-log

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
- publish state machine, admin surface, publish job 관련 파일

## 작업

관리자/Discord/CLI 운영 명령을 audit 가능한 `admin_actions`로 남긴다.

- retry, unpublish, retract, correct, block_topic, approve_preview의 기록 contract를 만든다.
- 누가, 언제, 무엇을, 왜 조작했는지 추적한다.
- public route에서 audit log가 노출되지 않게 한다.
- 관리자 UI는 상태 확인과 명령 실행에 필요한 최소 필드만 보여준다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. admin action이 누락되는 실패 테스트를 먼저 작성한다.
2. public route가 audit log를 노출하지 않는지 확인한다.
3. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 민감한 운영 로그나 내부 URL을 audit payload에 그대로 저장하지 말 것.
- 관리자 화면을 공개 블로그 navigation에 연결하지 말 것.
- 접근 제어 방식을 임의로 확정하지 말 것.
