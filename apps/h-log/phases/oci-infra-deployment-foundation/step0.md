# Step 0: oci-runtime-topology-contract

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `.codex/skills/harness/SKILL.md`
- `plans/automated-blog-publishing-plan.md`

## 작업

OCI production runtime topology를 문서와 config contract로 고정한다.

- OCI Compute 단일 host 기준의 initial topology를 확정한다.
- web, worker, PostgreSQL + pgvector, Redis, Nginx의 책임과 network boundary를 분리한다.
- public ingress는 Nginx 80/443으로 제한하고 DB/Redis는 private compose network에 둔다.
- server IP, SSH key, DB password, API key가 문서나 fixture에 들어가지 않도록 검토한다.
- managed DB/runtime으로 바꾸는 결정이 필요하면 구현하지 말고 ADR decision point로 남긴다.

## 인수 기준

```bash
git diff --check
```

## 검증

1. PRD, ADR, ARCHITECTURE, deployment 문서가 같은 OCI topology를 말하는지 확인한다.
2. phase index와 step 파일 JSON/Markdown 구조를 확인한다.
3. `git diff --check`를 실행한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 실제 OCI 서버에 접속하지 말 것. 이유: 이 step은 topology contract 확정 단계다.
- 서버 IP, SSH key, DB password, API key를 기록하지 말 것. 이유: 공개 저장소에 남으면 안 된다.
- managed DB나 Vercel/Neon/Supabase 전환을 임의로 결정하지 말 것. 이유: 현재 기본값은 OCI self-hosted다.
