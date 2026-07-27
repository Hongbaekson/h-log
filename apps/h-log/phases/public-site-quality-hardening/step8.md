# Step 8: seo-and-crawler-foundation

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/phases/public-site-quality-hardening/step0.md`
- `apps/h-log/app/layout.tsx`
- `apps/h-log/app/page.tsx`
- `apps/h-log/app/resume/page.tsx`
- `apps/h-log/app/portfolio/page.tsx`
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/app/blog/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/app/projects/page.tsx`
- `apps/h-log/app/projects/[slug]/page.tsx`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/lib/blog-crawler-output.ts`
- `apps/h-log/lib/blog-crawler-output.test.ts`
- `apps/h-log/lib/public-site-origin.ts`
- `apps/h-log/lib/public-site-origin.test.ts`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/site.test.ts`

## 작업

도메인 값을 하드코딩하지 않고 모든 공개 페이지의 검색·공유·crawler 기반을 완성한다.

- Root metadata에 `metadataBase`, title template, 공통 description, OG/Twitter 기본값을 둔다.
- Home, Resume, Portfolio 목록/상세, Blog 목록/상세에 page-specific title, description, canonical을 제공한다.
- Root에 Person과 WebSite JSON-LD, Blog detail에 BlogPosting JSON-LD를 안전한 React data로 출력한다.
- 공개 favicon과 기본 OG/Twitter image, `robots.txt`를 제공한다.
- Sitemap에 `/`, `/resume`, `/portfolio`, 공개 Portfolio 상세 전체, `/blog`, published Blog 상세를 포함한다.
- 기존 blog-only crawler manifest는 feed/llms의 published-only source로 유지하고 sitemap route에서 정적/Portfolio entry와 조합한다.
- Step 0 결정대로 `/projects`와 `/projects/[slug]`를 같은 `/portfolio` 경로로 308 영구 redirect한다.
- 절대 URL은 검증된 `HLOG_PUBLIC_BASE_URL` contract를 사용하고 localhost/private host를 production canonical로 허용하지 않는다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 정적 페이지 또는 Portfolio 상세가 sitemap/metadata에 없는 focused RED를 먼저 확인한다.
2. `metadataBase`, canonical, JSON-LD, sitemap entry를 한 behavior씩 GREEN으로 만든다.
3. Published Blog만 crawler output에 포함되고 draft/failed/retracted는 제외되는 기존 테스트를 확인한다.
4. 모든 canonical/OG/sitemap URL이 같은 HTTPS origin을 사용하는지 확인한다.
5. `/projects` redirect가 308이고 redirect destination이 sitemap에 중복되지 않는지 확인한다.
6. Production build에서 metadata route와 공개 페이지를 smoke한다.
7. 성공 시 phase index의 Step 8을 `completed`로 갱신한다.

## 하지 말 것

- 실제 도메인이 정해지기 전에 hostname을 코드에 하드코딩하지 말 것. 이유: preview/local/production origin contract가 갈라진다.
- Sitemap에 preview, failed, unpublished, retracted Blog 글이나 redirect source를 넣지 말 것. 이유: public boundary와 canonical이 깨진다.
- JSON-LD에 전화번호, 이메일, 승인되지 않은 고객사명·수치를 추가하지 말 것. 이유: 검색 엔진에 민감 정보가 영구 노출될 수 있다.
- Feed/llms까지 정적 Portfolio 페이지로 확장하지 말 것. 이유: 이 step의 crawler 변화는 sitemap 완성에 한정한다.
