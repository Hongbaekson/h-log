# Step 0: crawl-and-index-policy

## 상태와 선행 조건

pending — 계획 등록이며 미구현/미실행.

S1 감사 기준선과 공개 URL 표본이 있어야 한다.

## 읽을 파일

경로는 저장소 루트 기준이다. S1 이후 생성된 adapter·감사 보고서와 앞 단계의 완료 기록도 먼저 읽는다. 아래 목록은 계획 등록 시 존재하는 파일이다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/SEO_OPTIMIZATION_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/seo-public-surface-optimization/index.json`
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/lib/blog-search-ui.ts`
- `apps/h-log/components/blog/BlogPagination.tsx`
- `apps/h-log/app/robots.txt/route.ts`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/lib/blog-crawler-output.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/public-site-origin.ts`
- `apps/h-log/next.config.ts`

## 작업

1. S1 발견을 근거로 route별 index/canonical/status 계약을 표로 확정한다. 일반 `/blog?page=N`은 서로 다른 글 목록이므로 유효한 page 2+ self canonical을 기본안으로 삼는다. `q`와 조합 필터는 초기 noindex·정규화 정책, tag 전용 색인은 별도 고유 내용이 준비된 경우에만 검토한다.
2. page=1·잘못된 page·빈 결과·추적 query·중복 query의 의미를 구분하고 기존 URL 검색/뒤로가기 동작을 보존한다. canonical/noindex를 상충되게 겹쳐 검색 결과가 다른 문서의 복제본인 것처럼 표시하지 않는다.
3. robots·sitemap은 같은 public origin과 승인된 공개 selector를 사용한다. sitemap에는 200 canonical URL만 포함하고 lastmod는 실제 내용 변경 근거가 있을 때만 넣는다.
4. 공개 /admin·internal API 차단, PDF 다운로드 noindex, /projects 308·없는 slug 404를 유지한다. robots Disallow를 삭제해 관리자 내용을 검사하거나 crawler에게 별도 우회 응답을 만들지 않는다.
5. 확인한 독립 결함이 여러 페이지에 걸치면 작은 step으로 분리한다. 이 단계에서 실제 DNS/production robots 제출이나 운영 sitemap ping을 하지 않는다.

## 인수 기준

페이지·검색·태그·정적/상세 주소의 canonical/index 정책이 HTTP 응답에서 일치하고 private·철회·오류 URL이 sitemap에 포함되지 않는다.

## 검증

1. canonical/robots/meta·상태/redirect·query normalization focused RED→GREEN.
2. 합성 published/withdrawn/없는 slug·page 2·빈 결과·DB 실패의 실제 HTTP와 sitemap을 비교한다.
3. 코드 기본 gate와 변경 UI의 데스크톱/모바일·뒤로가기 회귀. DB selector를 바꾸면 관련 integration도 실행한다.

Production code를 바꾸면 focused RED→GREEN 뒤 다음 기본 gate를 실행한다. 문서/콘텐츠만 바꾼 경우 관련 파서·형식 검사로 범위를 좁힌다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 하지 말 것

- SEO 점수 때문에 비공개 데이터·관리 경로를 공개하지 말 것. 인증/공개 사본 정책이 SEO보다 우선한다.
- 근거 없는 경험·성과·검색량·구조화 데이터를 만들지 말 것. 기존 공개 근거와 한국어 작성 기준을 보존한다.
- 원격 installer·extension·새 provider·전체 upstream agent 실행을 자동 적용하지 말 것. 이 단계에서 필요한 자료와 도구만 사용한다.
- 운영 보류를 해제하거나 DNS/TLS·GSC 제출·실제 글/PDF 발행을 계획 승인만으로 수행하지 말 것. 로컬 변경과 외부 상태 변경은 별도 범위다.
- Home 레이더·승인된 Brain UI·DB published-current/hash를 SEO 작업에 섞어 전면 변경하지 말 것.

## 다음 단계

S2 Step 1 `server-rendered-blog-discovery`.
