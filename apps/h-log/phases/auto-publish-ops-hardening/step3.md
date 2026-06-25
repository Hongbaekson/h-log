# Step 3: privacy-scanner-and-redaction

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
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `plans/automated-blog-publishing-plan.md`
- generation input, public renderer, publish verification 관련 파일

## 작업

LLM 입력 전과 공개 전 privacy scanner를 적용한다.

- 회사/고객사명, 내부 URL/IP, token/API key, 비공개 저장소명, 개인 연락처를 탐지한다.
- 로그와 evidence는 필요한 최소 부분만 남기고 `[REDACTED]` 처리한다.
- 감지 시 `privacy_risk` 또는 `failed_generation`으로 남기고 public route에 노출하지 않는다.
- scanner 결과에는 민감 원문을 그대로 저장하지 않는다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 내부 URL 또는 token-like value가 public content로 통과하는 실패 테스트를 먼저 작성한다.
2. redaction 결과와 failure reason이 audit 가능한지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 민감 원문을 scanner log에 그대로 저장하지 말 것.
- privacy scanner 실패를 무시하고 발행하지 말 것.
- 회사 업무 사례를 구체 고객사명으로 자동 작성하지 말 것.
