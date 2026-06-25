# H-Log Workflow

이 문서는 H-Log 작업의 상세 실행 규칙이다. 모든 앱 경로는 `apps/h-log/` 기준이다.

## Required Reference Order

구현, 수정, 리팩터링, 버그 수정, phase 작성 전에 아래 순서로 확인한다.

1. `AGENTS.md`
2. `.codex/docs/harness/PRD.md`
3. `.codex/docs/harness/ADR.md`
4. `.codex/docs/harness/ARCHITECTURE.md`
5. `.codex/docs/harness/AGENT_LOOP.md`
6. `.codex/docs/harness/IMPLEMENTATION_PLAN.md`
7. `../../.codex/skills/harness/SKILL.md`
8. `../../.codex/skills/tdd/SKILL.md` production code 구현 또는 수정 시 필수

작업 종류에 따라 아래 문서를 추가로 읽는다.

- UI: `.codex/rules/frontend.md`, `.codex/docs/harness/UI_GUIDE.md`
- 콘텐츠/SEO/프라이버시: `.codex/rules/content-seo-privacy.md`
- 배포: `.codex/docs/deployment-ci-cd.md`
- 자동 블로그 플랫폼: `../../plans/automated-blog-publishing-plan.md`

## Agent Loop

- 반복 가능한 개발 흐름은 `.codex/docs/harness/AGENT_LOOP.md`를 기준으로 한다.
- 한 cycle은 한 Harness step과 한 public behavior를 넘지 않도록 작게 유지한다.
- cycle 결과에는 변경 파일, 검증 command, 다음 step, 사용자 결정이 필요한 항목을 남긴다.

## Harness Workflow

- 구현 계획, phase, step 파일은 `../../.codex/skills/harness/SKILL.md`를 따른다.
- Phase index는 `phases/index.json`에 둔다.
- Task별 step은 `phases/{task-name}/step{N}.md`에 둔다.
- Step 이름은 kebab-case를 사용한다.
- Step마다 읽을 파일, 작업, 인수 기준, 검증, 하지 말 것을 명시한다.
- Production code step의 읽을 파일에는 반드시 `../../.codex/skills/tdd/SKILL.md`를 포함한다.
- Step 완료 시 `phases/{task-name}/index.json`의 status와 summary를 갱신한다.

## TDD Workflow

- Production behavior 변경은 RED -> expected failure 확인 -> GREEN -> REFACTOR 순서로 진행한다.
- 한 번에 하나의 public behavior test를 추가하거나 갱신한다.
- Test가 기대한 이유로 실패하는 것을 확인한 뒤 최소 구현만 작성한다.
- 기존 동작이 이미 있으면 characterization test로 현재 behavior를 먼저 고정한다.
- Failing test를 먼저 확인하지 못한 production code 변경은 완료 처리하지 않는다.

## Verification

가까운 검증부터 실행한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

- UI 변경은 가능하면 브라우저에서 데스크톱/모바일 폭을 확인한다.
- 콘텐츠 변경은 개인정보/고객사/내부 URL 노출 여부를 확인한다.
- DB/worker 전환 작업은 상태 전이, idempotency, retry, public exposure 테스트를 우선한다.
- 검증 실패 시 실패 command와 핵심 error를 기록하고 임의로 범위를 넓히지 않는다.

## Documentation Sync

- 구현 중 PRD, ADR, ARCHITECTURE와 다른 결정이 필요하면 코드를 먼저 바꾸지 말고 결정 지점을 보고한다.
- 확정된 설계 변경은 코드와 함께 `.codex/docs/harness/PRD.md`, `.codex/docs/harness/ADR.md`, `.codex/docs/harness/ARCHITECTURE.md` 중 필요한 문서에 반영한다.
- 문서와 코드가 다르면 문서를 무시하지 말고 어떤 쪽이 최신인지 확인한다.

## Security and Privacy Rules

- 전화번호, 생년월일, 주소, 내부 URL, 서버 IP, API key/token, 비공개 저장소명을 공개하지 않는다.
- 고객사명, 회사명, 정량 성과, 현재 회사 내부 워크플로우는 공개 전 확인한다.
- 자동 글 생성 시 강한 경험 표현은 evidence가 있는 경우에만 허용한다.
- visitor chatbot은 구현하지 않는다.
