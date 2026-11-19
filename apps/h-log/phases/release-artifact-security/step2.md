# Step 2 bound-standalone-file-tracing

standalone에 필요한 파일만 포함시킨다. A1의 패치된 빌드에서 같은 현상이 남는지 먼저 확인한다.

## 읽을 파일

앱 디렉터리를 기준으로 한다. [검토 근거와 실행 순서](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md), [PRD](../../.codex/docs/harness/PRD.md), [ADR](../../.codex/docs/harness/ADR.md), [아키텍처](../../.codex/docs/harness/ARCHITECTURE.md), [워크플로](../../.codex/docs/harness/WORKFLOW.md), [실행 루프](../../.codex/docs/harness/AGENT_LOOP.md), [구현 계획](../../.codex/docs/harness/IMPLEMENTATION_PLAN.md)을 함께 읽는다.

- `AGENTS.md`
- `../../AGENTS.md`
- `../../.codex/skills/harness/SKILL.md`
- `../../.codex/skills/tdd/SKILL.md`
- `next.config.ts`
- `Dockerfile`
- `.dockerignore`
- `lib/blog-thumbnails.ts`
- `lib/blog-public.test.ts`
- `lib/public-blog-list.ts`
- `package.json`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`

## 작업

깨끗한 임시 checkout에서 가짜 private 파일·배포 env·정상 공개 썸네일을 만들고 standalone과 라우트별 NFT 목록을 집계한다. 두 동적 파일 접근 경고의 실제 입력을 확인해 추적 루트를 좁히거나 필요한 제외 규칙을 둔다. 패치 버전에서 경계가 이미 만족되면 검증만 기록한다.

## 인수 기준

직접 빌드한 standalone과 Docker runner 모두에서 비공개 표식·운영 env·불필요한 phase 문서가 0개다. 파일 수와 바이트를 전후 비교하고 런타임에 필요한 공개 썸네일·static·이미지 처리 및 누락/손상 fallback을 확인한다. 기존 hash/공개 검증을 통과해야 한다.

## 검증

앱 디렉터리에서 실행한다. 동작 변경은 해당 경로의 실패하는 회귀 검사를 먼저 확인한다. Compose 명령은 격리된 로컬 테스트 프로젝트를 지정한 세션에서 수행한다.

```sh
npm run build
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts
# 임시 checkout에서만 runner를 만든다.
docker build --target runner -t hlog-trace-check .
```

검증 결과와 남은 제한을 이 phase의 `index.json`에 기록한다.

## 하지 말 것

실제 비공개 파일 내용이나 이름을 보고서에 복사하지 않는다. 개수·크기와 합성 표식으로 경계를 판정할 수 있다.
