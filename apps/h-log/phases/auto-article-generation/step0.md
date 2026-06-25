# Step 0: article-output-schema

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
- topic research, claim verification, post version 관련 파일

## 작업

LLM writer가 자유 텍스트가 아니라 검증 가능한 구조화 결과를 반환하도록 schema를 만든다.

- title, slug, description, tags, article_mode, content_markdown, claims, sources, evidence_paths, personal_context_ids, publish_decision, block_reason을 포함한다.
- slug와 tags는 public route 규칙과 호환되게 검증한다.
- `publish_decision=block`은 post를 public으로 전환하지 않는다.
- schema validation 실패는 `failed_generation` 또는 quality gate failure로 남긴다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. 필수 field 누락 output이 통과하는 실패 테스트를 먼저 작성한다.
2. invalid slug나 source 없는 claim이 block되는지 확인한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- LLM 자유 텍스트를 바로 post_version으로 저장하지 말 것.
- publish_decision 없이 자동 발행하지 말 것.
- source/evidence 없는 claim을 silently drop하지 말 것.
