# Step 0: create-phase-registry

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/PHASE_TEMPLATE.md`
- `.codex/skills/harness/SKILL.md`
- `plans/automated-blog-publishing-plan.md`

## 작업

H-Log 블로그와 자동 발행 플랫폼 개발을 작은 Harness phase로 나눈다.

- `apps/h-log/phases/index.json`에 phase registry를 작성한다.
- 각 phase 디렉터리에 `index.json`과 실행 가능한 첫 `step0.md`를 만든다.
- Phase 0은 문서/registry 작업이므로 production code를 수정하지 않는다.
- MVP 파일 기반 블로그와 DB 기반 자동 블로그 전환을 별도 phase로 분리한다.
- 방문자 챗봇은 어떤 phase에도 포함하지 않는다.

## 인수 기준

```bash
node -e "const fs=require('fs'); for (const f of ['apps/h-log/phases/index.json','apps/h-log/phases/phase-registry-bootstrap/index.json']) JSON.parse(fs.readFileSync(f,'utf8'));"
git diff --check -- apps/h-log/phases
```

## 검증

1. `apps/h-log/phases/index.json`이 모든 phase를 포함하는지 확인한다.
2. 각 phase 디렉터리에 `index.json`과 `step0.md`가 있는지 확인한다.
3. JSON parse 검증을 실행한다.
4. `git diff --check -- apps/h-log/phases`를 실행한다.

## 하지 말 것

- Production code를 수정하지 말 것. 이유: Phase 0은 실행 registry 생성 단계다.
- DB, 관리자, worker, 검색 기능을 구현하지 말 것. 이유: 이후 phase에서 독립 검증해야 한다.
- 방문자 챗봇, SSE 대화 UI, 방문자 세션 메모리를 추가하지 말 것. 이유: 제품 범위에서 제외됐다.
