# Step 1 patch-next-runtime

Next.js 보안 수정판으로 올린다. A0 뒤에 실행한다. 공식 공지와 registry 결과는 실행일에 다시 확인한다.

## 읽을 파일

앱 디렉터리를 기준으로 한다. [검토 근거와 실행 순서](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md), [PRD](../../.codex/docs/harness/PRD.md), [ADR](../../.codex/docs/harness/ADR.md), [아키텍처](../../.codex/docs/harness/ARCHITECTURE.md), [워크플로](../../.codex/docs/harness/WORKFLOW.md), [실행 루프](../../.codex/docs/harness/AGENT_LOOP.md), [구현 계획](../../.codex/docs/harness/IMPLEMENTATION_PLAN.md)을 함께 읽는다.

- `AGENTS.md`
- `../../AGENTS.md`
- `../../.codex/skills/harness/SKILL.md`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `proxy.ts`
- `Dockerfile`
- `../../.github/workflows/h-log.yml`
- `lib/admin-owner.test.ts`
- `scripts/blog-index-seo.http.test.mjs`

## 작업

현재 운영 의존성 감사 결과를 기록한다. 더 최신 공지가 없으면 같은 minor의 16.4.6을 우선 검토한다. next와 현재 함께 고정한 eslint-config-next, lockfile의 플랫폼별 Next 패키지를 맞추고 npm ci로 재현한다. 타 패키지는 호환을 위해 필요한 경우만 변경한다.

## 인수 기준

CI와 같은 Node 24에서 두 기존 GHSA가 운영 트리에서 해소되고 새 경고가 있으면 패키지·범위·남은 이유를 기록한다. 공개 페이지/Markdown rewrite, 관리자 인증·404/no-store, 실제 이미지 응답을 합성 DB와 로컬 production 빌드에서 비교한다. Next 보안 경고로 첫 빌드가 중단되지 않아야 한다.

## 검증

앱 디렉터리에서 실행한다.

```sh
npm ci
npm audit --omit=dev --package-lock-only
npm ls next eslint-config-next react react-dom
npm run test && npm run typecheck && npm run lint && npm run build
```

검증 결과와 남은 제한을 이 phase의 `index.json`에 기록한다.

## 하지 말 것

일괄 audit fix --force로 업그레이드하지 않는다. 그 방식은 다른 런타임 계약도 바꿀 수 있다.
