# Step 5: minimal-admin-preview-save-publish

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
- `apps/h-log/.codex/rules/frontend.md`
- `plans/automated-blog-publishing-plan.md`
- DB content model, renderer, published route 관련 파일

## 작업

자동 작성 전 수동 발행을 위한 최소 관리자 표면을 만든다.

- preview, save, publish만 포함한다.
- 글 상태, 발행 실패 사유, 임베딩 상태, 검색/SEO 반영 상태를 읽을 수 있게 준비한다.
- admin 조작은 `admin_actions` audit log로 남긴다.
- 접근 제어 방식이 미정이면 production route 공개 전에 멈추고 결정 요청을 남긴다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. publish 조작이 public route 노출 경계를 깨지 않는 테스트를 먼저 작성한다.
2. admin action 기록 테스트를 작성한다.
3. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- full CMS, 로그인, 권한 정책을 임의로 확장하지 말 것. 이유: 최소 운영 화면이 목표다.
- 접근 제어 없이 admin route를 공개하지 말 것.
- 자동 생성 writer를 이 step에 섞지 말 것.
