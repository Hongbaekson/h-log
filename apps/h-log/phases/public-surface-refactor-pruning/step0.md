# Step 0: move-legacy-project-redirects-to-next-config

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
- `apps/h-log/next.config.ts`
- `apps/h-log/app/projects/page.tsx`
- `apps/h-log/app/projects/[slug]/page.tsx`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/lib/site-seo.test.ts`

## 작업

redirect-only legacy project route의 현재 HTTP와 SEO 계약을 characterization test로 먼저 고정한 뒤 Next.js native redirect 설정으로 옮긴다.

- `/projects`는 `/portfolio`로 영구 리디렉션한다.
- `/projects/:slug`는 같은 slug의 `/portfolio/:slug`로 영구 리디렉션한다.
- 두 규칙은 `next.config.ts`의 `redirects()`와 `permanent: true`로 표현한다.
- config 기반 계약이 확인되면 redirect만 수행하던 두 page 파일을 삭제한다.
- `site-seo.test.ts`는 삭제될 page source 문자열이 아니라 config 또는 production-like HTTP 동작을 검증한다.
- 기존 sitemap, canonical destination, public portfolio URL은 바꾸지 않는다.

## 인수 기준

- `/projects`와 `/projects/:slug`가 각각 기존 destination으로 HTTP 308과 정확한 `Location`을 반환한다.
- redirect-only page 파일과 그 source-shape assertion이 남아 있지 않다.
- sitemap에는 legacy `/projects` URL이 포함되지 않는다.
- redirect middleware, wrapper component, compatibility route 또는 새 dependency를 추가하지 않는다.
- `next.config.ts`의 기존 설정과 build 동작은 유지된다.

```bash
node --no-warnings --test --experimental-strip-types lib/site-seo.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. repository-wide caller와 link를 검색하고 두 legacy route가 redirect 전용인지 다시 확인한다.
2. 현재 destination, permanent status, sitemap 제외 계약을 focused test로 고정한다.
3. Next.js config rule로 옮긴 뒤 두 page 파일과 구현 형태에 묶인 assertion만 제거한다.
4. production-like server에서 정적 경로와 동적 slug 경로의 308 및 `Location`을 확인한다.
5. 기본 앱 gate와 phase 상태 문서를 동기화한다.

## 하지 말 것

- middleware나 custom redirect component를 만들지 말 것. Reason: Next.js config가 이미 필요한 native contract를 제공한다.
- redirect destination, slug 전달 방식, canonical URL을 바꾸지 말 것. Reason: 이 step은 동작 변경이 아니라 redirect 구현 축소다.
- `next.config.ts`의 무관한 설정을 재구성하지 말 것. Reason: legacy route 두 개만 최소 범위로 옮긴다.
- redirect 또는 URL 처리를 위한 dependency를 추가하지 말 것. Reason: platform 기능만으로 충분하다.
