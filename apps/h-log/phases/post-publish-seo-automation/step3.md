# Step 3: content-hash-reconciliation

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
- post_versions, public route, crawler output, publish_verifications 관련 파일

## 작업

DB version hash와 공개 HTML/Markdown 출력물이 계속 일치하는지 검증한다.

- 발행 직후 `/blog/:slug`, `/blog/:slug.md`, sitemap/feed/llms 반영을 확인한다.
- content_hash mismatch는 required verification failure로 기록한다.
- 정기 비교 job은 published 글만 대상으로 한다.
- mismatch 발생 시 correction 또는 retraction flow로 넘길 수 있게 결과를 남긴다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 공개 본문과 DB hash가 다른 실패 테스트를 먼저 작성한다.
2. mismatch가 `publish_verifications`에 기록되는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- hash mismatch를 단순 warning으로 무시하지 말 것.
- failed/unpublished 글을 verification 대상에 포함하지 말 것.
- 공개 검증 로그에 민감한 본문 excerpt를 저장하지 말 것.
