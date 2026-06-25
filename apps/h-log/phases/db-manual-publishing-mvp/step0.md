# Step 0: db-content-model-contract

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
- `apps/h-log/package.json`
- 현재 파일 기반 blog loader와 route 구현
- DB, migration, ORM 또는 query layer 후보 파일

## 작업

DB 기반 수동 발행 MVP의 첫 단위로 콘텐츠 모델 contract를 고정한다.

- `posts`, `post_versions`, `post_sources`, `publish_jobs`의 최소 필드를 코드 contract로 정의한다.
- `content_markdown`, `content_html`, `content_hash`, `version_no`, `current_version_id`의 책임을 분리한다.
- `PostgreSQL + pgvector` 전환을 전제로 하되, 실제 외부 DB 접속이 필요하면 local/test double부터 둔다.
- 마이그레이션 도구, ORM, query layer가 기존 repo 결정과 충돌하면 구현하지 말고 결정 지점을 기록한다.
- 글 생성 자동화는 포함하지 않는다.

## 인수 기준

```bash
npm run test
npm run typecheck
```

## 검증

1. model contract 테스트를 RED -> GREEN 순서로 작성한다.
2. content version과 hash가 분리되는지 확인한다.
3. `npm run test`, `npm run typecheck`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 자동 글 생성부터 구현하지 말 것. 이유: DB 수동 발행 경계가 먼저 안정돼야 한다.
- content를 `posts`에 직접 저장하지 말 것. 이유: version, correction, rollback 이력을 보존해야 한다.
- 실제 운영 DB나 외부 서비스에 연결하지 말 것. 이유: 이 step은 model contract 확정 단계다.
- 방문자 챗봇을 추가하지 말 것.
