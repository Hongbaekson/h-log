# Step 0: canonical-public-origin-validation

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
- `apps/h-log/lib/public-site-origin.ts`
- `apps/h-log/lib/public-site-origin.test.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.test.ts`
- `apps/h-log/scripts/blog-worker.mjs`

## 작업

canonical public origin은 metadata/crawler와 required publish verification이 하나의 production validation rule을 사용하게 정리한다.

- production canonical origin은 explicit public HTTPS, credential 없음, private/internal host 거부 규칙을 공통화한다.
- `HLOG_WORKER_PUBLIC_BASE_URL=http://hlog-nginx` 같은 internal fetch origin은 canonical public origin과 분리된 채 허용한다.
- special-use/private address 검증을 확장해야 하면 해당 주소군을 보여 주는 test를 먼저 추가한다.

## 인수 기준

- production canonical origin이 HTTP, credential 포함, localhost, private/internal host면 fetch 전에 fail closed한다.
- internal worker fetch origin은 공개 canonical origin 검증으로 오인해 차단하지 않는다.
- public URL, Markdown, sitemap, content hash required verification의 기존 canary 순서와 결과는 유지된다.

```bash
node --no-warnings --test --experimental-strip-types lib/public-site-origin.test.ts lib/blog-required-publish-job-adapter.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
```

## 검증

1. canonical origin 검증 분기가 달라지는 RED를 focused test로 만든다.
2. 공통 validator를 재사용하는 최소 변경으로 GREEN을 확인한다.
3. internal fetch origin과 canonical origin을 분리한 기존 production canary regression을 다시 확인한다.
4. phase index status와 summary를 갱신한다.

## 하지 말 것

- internal Docker DNS host를 public origin으로 강제하지 말 것. Reason: worker는 내부 HTTP fetch와 외부 canonical URL 검증을 의도적으로 분리한다.
- 실제 domain, DNS, TLS, timer를 활성화하지 말 것. Reason: 이 step은 local validation contract만 바꾼다.
