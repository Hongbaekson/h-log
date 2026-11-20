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

## 2026-11-20 검증 결과

A0 커밋 `182af53`의 추적 파일로 16.4.3과 16.4.6 production 이미지를 각각 빌드했다. npm이 제시한 같은 minor의 수정판으로 `next`, `eslint-config-next`, `@next/env`, ESLint 플러그인, 플랫폼별 SWC 8개를 맞췄다. React와 React DOM은 19.2.7이다. [Next.js 16.4.6 릴리스](https://github.com/vercel/next.js/releases/tag/v16.4.6)

- 패치 전 운영 감사에서 `next` 1개 패키지에 moderate 공지 7건이 집계됐다. 16.4.6 lockfile에 대한 `npm audit --omit=dev --package-lock-only`는 0건이었다. [기존 캐시 공지 1](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) · [기존 캐시 공지 2](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8)
- Node 24.19.0·npm 11.17.0에서 `npm ci`, `npm ls`, 첫 production 빌드, typecheck, lint 통과. 단위 테스트 305개 통과·DB opt-in 29개 skip, projector/CLI 6개, 전체 DB 통합 33개, projection DB 33개가 통과했다.
- 각 버전의 runner를 격리 PostgreSQL과 연결했다. 공개·SEO HTTP 21개와 Markdown rewrite HTTP 5개가 양쪽에서 통과했다. 관리자 비활성 404, 다른 Host 403, 미인증 401, 인증 성공 200 모두 `private, no-store`였다.
- 프로필 JPEG(365×469), Next 이미지 최적화 WebP(256×329), OG PNG(1200×630)를 내려받아 디코딩했다. 패치 전후 HTTP 상태·MIME·크기가 같았고 프로필 원본의 SHA-256도 일치했다.

개발 의존성을 포함한 감사는 패키지 기준 12개에서 11개로 줄었다. 남은 11개는 패치 전에도 보고된 개발 도구 의존성이며 별도 의존성 갱신 대상으로 남긴다.

| 심각도 | npm이 보고한 패키지 및 범위 |
| --- | --- |
| high (4) | `brace-expansion` (≤1.1.20 또는 4.0.0–5.0.11), `browserslist` (≤4.28.6), `js-yaml` (4.0.0–4.3.1), `zod` (<4.6.6) |
| moderate (7) | `@typescript-eslint/{eslint-plugin,parser,type-utils,typescript-estree,utils}` (6.16.0–8.72.2), `typescript-eslint` (≤8.72.2), `minimatch` (7.0.0–11.0.0) |

패치된 빌드에서도 동적 파일 접근에 따른 Turbopack 추적 경고 2건이 발생했다. 다음 단계에서 패치된 standalone 산출물의 파일 범위를 검증한다. [A2 검증 범위](step2.md)

## 하지 말 것

일괄 audit fix --force로 업그레이드하지 않는다. 그 방식은 다른 런타임 계약도 바꿀 수 있다.
