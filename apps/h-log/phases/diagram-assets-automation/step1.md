# Step 1: diagram-asset-storage

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
- post_assets, storage, publish jobs 관련 파일

## 작업

생성된 diagram SVG 또는 image asset을 post_assets로 관리한다.

- asset path, alt text, generated_by, post_id, version 기준을 저장한다.
- 공개 asset은 민감정보와 내부 URL을 포함하지 않게 scan한다.
- asset이 특정 post_version에 종속되는지 정책을 정한다.
- asset 삭제/교체 시 audit 가능한 기록을 남긴다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. alt text 없는 diagram asset이 통과하는 실패 테스트를 먼저 작성한다.
2. asset path가 public-safe 경로인지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- private workspace path를 public asset URL로 노출하지 말 것.
- 민감값이 들어간 diagram을 공개하지 말 것.
- generated asset을 DB content와 분리 없이 문자열로만 묻어두지 말 것.
