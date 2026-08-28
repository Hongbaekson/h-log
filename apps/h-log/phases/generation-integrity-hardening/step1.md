# Step 1: hermes-no-tool-enforcement

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
- `apps/h-log/lib/blog-hermes-article-provider.ts`
- `apps/h-log/lib/blog-hermes-article-provider.test.ts`
- `apps/h-log/scripts/blog-auto-publish.mjs`
- `apps/h-log/lib/blog-hermes-auth-preflight.ts`

## 작업

검증된 research input만 사용해야 하는 article writer invocation에서 Hermes tool 실행 가능성을 제거한다.

- 현재 `--toolsets web` 전달과 "Do not call tools" prompt의 모순을 RED로 고정한다.
- 설치된 Hermes가 공식적으로 지원하는 명시적 no-tool invocation/config를 확인하고 그 최소 경로만 사용한다.
- 단순히 `--toolsets`를 생략했을 때 기본 tool이 다시 로드된다면 그 방식은 채택하지 않는다.
- 명시적 no-tool 보장이 불가능하면 provider를 fail closed 상태로 유지하고 phase를 완료 처리하지 않는다.

## 인수 기준

- 실제 child process args/config에 web 또는 다른 tool capability가 없다.
- prompt 문구가 아니라 invocation 자체가 no-tool을 강제한다.
- `openai-codex`, `gpt-5.6-sol`, OAuth preflight, `cost_status=included`, `estimated_cost_usd=0`, 단일 API call gate는 유지된다.
- 외부 research/fetch 책임은 이 writer step으로 이동하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-hermes-article-provider.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. 기존 invocation이 web toolset을 활성화하는 focused RED를 남긴다.
2. 현재 Hermes의 `--help`와 repository-owned packaging을 기준으로 no-tool 경로를 확인한다.
3. 최소 invocation 변경 후 focused GREEN과 network-free local smoke를 확인한다.
4. ADR/ARCHITECTURE/provider runbook의 tool 책임을 실제 동작과 동기화한다.

## 하지 말 것

- prompt 지시만으로 tool 사용을 막았다고 간주하지 말 것. Reason: capability 자체가 남는다.
- provider/model/API-key fallback을 추가하지 말 것. Reason: 승인된 OAuth와 included-cost 경계를 유지해야 한다.
- 실제 유료 호출이나 OCI Hermes 설정을 바꾸지 말 것. Reason: production activation은 별도 승인 대상이다.
