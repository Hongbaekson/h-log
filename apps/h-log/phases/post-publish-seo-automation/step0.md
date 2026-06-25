# Step 0: post-publish-verification-jobs

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
- publish state machine과 search 관련 파일

## 작업

발행 후 공개 표면과 SEO/AI crawler 산출물을 검증하는 job contract를 만든다.

- 공개 URL과 `.md` URL의 content hash 검증을 테스트한다.
- `sitemap.xml`, `feed.xml`, `llms.txt`, `llms-full.txt` 갱신 기준을 고정한다.
- IndexNow와 Discord 알림은 retryable job으로 분리한다.
- 실패 시 공개 상태를 유지할지, rollback할지 상태별로 테스트한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. content hash mismatch 실패 테스트를 먼저 작성한다.
2. 비공개 상태 글이 SEO/AI crawler 산출물에 들어가지 않는지 확인한다.
3. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 외부 IndexNow 제출이나 Discord 알림을 실환경으로 보내지 말 것. 이유: public side effect는 명시 승인이 필요하다.
- 실패 job을 무한 재시도하지 말 것. 이유: 비용과 알림 폭주를 막아야 한다.
- private/internal source raw text를 공개 산출물에 포함하지 말 것.
