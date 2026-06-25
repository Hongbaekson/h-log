# Harness Phase Template

이 문서는 `apps/h-log/phases/` 아래 phase 파일을 만들 때 사용한다.

## `phases/index.json`

```json
{
  "phases": [
    {
      "dir": "blog-content-mvp",
      "status": "pending"
    }
  ]
}
```

규칙:

- `dir`: task directory 이름.
- `status`: `pending`, `completed`, `error`, `blocked` 중 하나.
- timestamp는 수동으로 넣지 않는다.

## `phases/{task-name}/index.json`

```json
{
  "project": "h-log",
  "phase": "blog-content-mvp",
  "steps": [
    { "step": 0, "name": "content-model", "status": "pending" },
    { "step": 1, "name": "blog-loader", "status": "pending" },
    { "step": 2, "name": "blog-list", "status": "pending" }
  ]
}
```

규칙:

- `project`: `h-log`.
- `phase`: directory name과 일치한다.
- `steps[].step`: 0부터 시작한다.
- `steps[].name`: kebab-case.
- `steps[].status`: 초기값은 `pending`.
- 완료 시 `summary`를 한 줄로 추가한다.
- 실패 시 `error_message`, 차단 시 `blocked_reason`을 구체적으로 남긴다.

## `phases/{task-name}/step{N}.md`

````markdown
# Step {N}: {name}

## 읽을 파일

먼저 아래 파일을 읽고 product, architecture, design intent를 이해한다:

- `AGENTS.md`
- `.codex/docs/harness/PRD.md`
- `.codex/docs/harness/ADR.md`
- `.codex/docs/harness/ARCHITECTURE.md`
- `.codex/docs/harness/WORKFLOW.md`
- `.codex/docs/harness/AGENT_LOOP.md`
- `../../.codex/skills/harness/SKILL.md`
- `../../.codex/skills/tdd/SKILL.md` (production code 구현/수정 step인 경우)
- {이전 step에서 생성 또는 변경한 파일}

수정하기 전에 이전 step에서 작성된 code와 tests를 주의 깊게 읽는다.

## 작업

{구체적인 구현 지시사항. 파일 경로, function signature, 동작 제약을 포함한다. 특정 구현이 꼭 필요한 경우가 아니라면 snippet은 interface/signature 수준으로 유지한다.}

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 인수 기준 command 또는 가장 가까운 focused command를 실행한다.
2. Production code 구현/수정 step이면 TDD checklist를 확인한다:
   - public behavior test를 먼저 작성했는가?
   - test가 기대한 이유로 실패하는 것을 확인했는가?
   - 최소 구현으로 green을 만들었는가?
   - refactor 후에도 focused test가 green인가?
3. Architecture checklist를 확인한다:
   - 작업이 `ARCHITECTURE.md`의 directory structure를 따르는가?
   - `ADR.md`의 stack decision 안에 머무르는가?
   - `AGENTS.md`의 guardrail을 위반하지 않는가?
4. 이 step에 대해 `phases/{task-name}/index.json`을 업데이트한다:
   - 성공: `status`를 `completed`로 설정하고 `summary`를 추가한다.
   - 실패: `status`를 `error`로 설정하고 `error_message`를 추가한다.
   - 사용자 입력 필요: `status`를 `blocked`로 설정하고 `blocked_reason`을 추가한 뒤 중단한다.

## 하지 말 것

- Production code를 failing test 확인 없이 먼저 수정하지 말 것. 이유: Harness step은 TDD와 함께 실행되어야 한다.
- 요청과 무관한 페이지, 스타일, 파일 이동을 하지 말 것. 이유: 작은 단위 검증이 깨진다.
- 개인정보, 내부 URL, API key, 비공개 저장소명을 fixture나 문서 예시에 넣지 말 것.
````
