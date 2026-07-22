# Step 4: production-activation-and-rollback-smoke

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
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/phases/blog-runtime-integration/index.json`
- correction, unpublish, retract, crawler output, search index 관련 파일

## 작업

사용자 승인 후에만 production provider와 scheduler를 canary로 활성화하고 rollback까지 검증한다.

- 실제 provider credential은 서버/CI secret으로만 주입하고 저장소에는 기록하지 않는다.
- 먼저 dry-run과 단일 수동 run을 확인한 뒤 scheduled run을 활성화한다.
- 첫 canary는 publish 최대 1개, retry 최대 1회로 제한한다.
- public URL, `.md` URL, sitemap, feed, llms, search index, related posts에서 내려간 글이 사라지는지 확인한다.
- rollback 결과는 publish_verifications와 admin_actions에 남긴다.
- 실패 시 Discord/운영 알림은 retryable로 처리한다.
- provider, scheduler, 공개 발행, OCI compose 변경은 각각 승인된 범위 안에서만 실행한다.

## 현재 진행 상태 (2026-07-21)

- 사용자에게 provider/scheduler, OCI, canary 1건, rollback 범위를 알리고 진행 승인을 받았다.
- 철회 전 채운 검색 TTL cache에서 retracted 글이 남는 RED를 확인한 뒤, cached result도 현재 published selector로 다시 거르도록 수정했다.
- `003_publish_rollback_audit` migration으로 `publish_verifications`, `admin_actions`를 실제 PostgreSQL schema에 추가했다.
- PostgreSQL repository의 철회 상태와 `admin_actions` 저장을 한 transaction으로 묶고, rollback surface 8종의 `publish_verifications` 저장을 추가했다.
- local fake-provider 발행 성공 글을 철회한 뒤 public URL, Markdown, sitemap, feed, llms, search index, related posts에서 모두 제거되고 감사/검증 record가 남는 통합 GREEN을 확인했다.
- Provider/model은 Hermes `openai-codex`/`gpt-5.6-sol`로 결정했다. OpenAI Platform API key는 사용하지 않는다.
- Hermes one-shot adapter는 verified input만 JSON prompt로 전달하고, usage report가 요청 provider/model, `cost_status=included`, `estimated_cost_usd=0`, `api_calls=1`과 일치하지 않으면 실패한다. 실제 local OAuth smoke에서 이 계약과 구조화 JSON 응답을 확인했다.
- Daily pipeline의 generation audit는 고정 adapter 이름 대신 실제 model을 기록한다.
- Daily pipeline은 production persistence callback이 있으면 검증된 생성 결과를 비공개 `publishing` aggregate와 queued required jobs로 넘기고, required job adapter나 public 전이를 실행하지 않은 채 종료한다. 같은 day key의 callback과 LLM 중복 실행도 local state에서 차단한다.
- PostgreSQL/Hermes one-shot runner는 서버 로컬 JSON 입력을 fail closed로 검사하고, 서울 날짜별 advisory lock과 `post-YYYY-MM-DD` 존재 여부를 usage/Hermes 호출 전에 확인한다. 통과한 결과는 기존 repository로 비공개 저장하며 required publish job은 실행하지 않는다.
- Published-only public route에서는 `publishing` 글의 `public_url`, `.md`, sitemap 검증이 성공할 수 없다. Required job adapter는 `render`/`privacy_scan` 사전 검증을 먼저 끝내고 제한된 canary를 `published`로 전환한 뒤 public surface와 content hash를 검증하며, 실패 시 즉시 `correction_pending`으로 숨기는 2단계 순서로 packaging했다.
- Adapter focused test 22/22와 격리 PostgreSQL worker 통합 test 6/6이 통과했다. Worker는 여전히 manual `--once`이며 scheduler나 OCI runtime은 활성화하지 않았다.
- Bounded cycle은 deterministic daily post의 required job만 required job 수 + idle probe 1회까지 처리한다. 공식 Hermes image 기반 Compose service와 `Asia/Seoul` 매일 09:00 systemd timer를 packaging했다. Hermes가 logged-out 상태에도 exit 0을 반환하는 RED를 별도 preflight로 차단했고, focused scheduler/auth test 11/11과 scheduler profile Compose config가 통과했다.
- 2026-07-22 OCI read-only preflight 결과, 기준 경로에는 root-level 이전 source artifact와 Docker만 있고 host Node/npm/Hermes, production env, timer는 없었다. Image build, `hermes_data` OAuth, production input mount, timer enable은 수행하지 않았다.
- 다음 순서는 최신 artifact 반영, container-local Hermes OAuth, 배포 전 backup/restore rehearsal, migration, timer 활성화 전 수동 canary 1건과 rollback smoke다.
- 따라서 이 step과 phase 상태는 실제 production canary 및 rollback smoke가 끝날 때까지 `pending`으로 유지한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. local/fake 환경에서 retracted 글이 search/llms에 남는 실패 테스트를 먼저 작성한다.
2. 사용자에게 실제 provider, OCI, scheduler, public publish 변경 범위를 알리고 승인을 받는다.
3. 승인된 canary 1회를 실행하고 public/crawler/search/usage event를 확인한다.
4. canary 정정 또는 retract 후 모든 public surface에서 제거되는지 확인한다.
5. rollback smoke 결과가 publish_verifications와 admin_actions에 기록되는지 확인한다.
6. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
7. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- public URL만 내리고 sitemap/search/llms를 방치하지 말 것.
- 외부 알림 실패를 rollback 실패와 동일하게 취급하지 말 것.
- rollback smoke에 민감 본문을 출력하지 말 것.
- 사용자 승인 없이 provider credential, scheduler, OCI runtime, 실제 공개 발행을 활성화하지 말 것.
