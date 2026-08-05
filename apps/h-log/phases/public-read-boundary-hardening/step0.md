# Step 0: published-current-sql-boundary

## 읽을 파일

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-postgres-repository.integration.test.ts`

## 작업

aggregate public read가 SQL 단계부터 `status=published`인 post와 그 `current_version_id` version만 읽도록 최소 변경한다.

- 공개 목록, crawler, search가 기존과 같은 published-current 결과만 받게 유지한다.
- 관련 tag/source/asset 조회와 privacy scanner는 SQL 후보가 좁아진 뒤에도 유지한다.
- slug 단건 조회도 private post/version 본문을 먼저 읽지 않도록 같은 경계를 적용한다.
- 데이터가 충분히 커질 때까지 추측성 index migration은 추가하지 않는다. 필요하면 대표 DB의 `EXPLAIN` 근거를 먼저 기록한다.

## 인수 기준

- draft, failed, corrected, unpublished, retracted post/version은 aggregate public query의 후보가 아니다.
- published current version의 public route, crawler, search 결과와 privacy scanner 차단 동작은 유지된다.
- query parameter는 계속 사용하며, user input으로 SQL 문자열을 조합하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-postgres-repository.integration.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
```

## 검증

1. SQL 후보가 private draft/version을 읽는 현재 경계를 보여 주는 focused RED를 먼저 만든다.
2. published-current query로 최소 수정해 GREEN을 확인한다.
3. PostgreSQL integration 환경이 있으면 공개 결과와 private 제외를 재확인한다. 없으면 environment skip을 완료 근거로 쓰지 않는다.
4. phase index status와 summary를 갱신한다.

## 하지 말 것

- privacy scanner를 SQL filter로 대체하지 말 것. Reason: 공개 가능한 aggregate의 민감정보 재검사는 별도 fail-closed 경계다.
- pagination, 검색 ranking, schema migration을 함께 바꾸지 말 것. Reason: 이번 step은 private read 축소와 query scope만 검증한다.
