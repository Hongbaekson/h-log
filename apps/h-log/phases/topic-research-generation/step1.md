# Step 1: research-pack-boundary

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
- topic candidate, post_sources, source_snapshots 관련 파일

## 작업

선정된 topic candidate를 research pack으로 묶는 경계를 만든다.

- source URL, title, publisher, fetched_at, hash, summary, source_role을 저장한다.
- 원문 전체 저장은 기본 금지하고 짧은 excerpt, 요약, claim 연결용 metadata만 둔다.
- official/original source와 discovery/reaction source의 역할을 분리한다.
- research pack은 글 생성 입력이지만 public content는 아니다.

## 인수 기준

```bash
npm run test
npm run typecheck
npm run build
```

## 검증

1. 원문 전체가 snapshot에 저장되는 실패 테스트를 먼저 작성한다.
2. discovery-only pack이 강한 claim 검증을 통과하지 못하는지 확인한다.
3. `npm run test`, `npm run typecheck`, `npm run build`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 외부 문서 전체를 무제한 저장하지 말 것.
- reaction source를 official evidence처럼 사용하지 말 것.
- research pack을 public route에 노출하지 말 것.
