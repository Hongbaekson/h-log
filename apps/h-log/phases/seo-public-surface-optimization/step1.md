# Step 1: server-rendered-blog-discovery

## 상태와 선행 조건

pending — 계획 등록이며 미구현/미실행.

S1의 no-JS 재현 결과와 S2 Step 0 URL 정책을 읽는다.

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
- `apps/h-log/app/blog/(index)/loading.tsx`
- `apps/h-log/components/blog/BlogSearchPanel.tsx`
- `apps/h-log/components/blog/BlogPagination.tsx`
- `apps/h-log/app/brain/page.tsx`
- `apps/h-log/app/brain/[slug]/page.tsx`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`
- `apps/h-log/phases/backend-operations-lab/step1.md`

## 작업

1. production build에서 JS OFF의 일반 `/blog`가 loading 안내에 머무는 기존 현상을 먼저 재현한다. 소스만 보고 고치지 않으며 재현되지 않으면 환경 차이와 정상 증거를 기록한다.
2. 확인된 경우 공개 목록·일반 페이지 이동·글 href를 서버 HTML에서 읽게 하는 최소 변경을 한다. 검색 API와 client 필터·서버 loading/error 경계를 함께 보존하고 별도 블로그 데이터 복사본을 만들지 않는다.
3. JS ON/OFF의 공개 제목·링크·본문이 같은 published-current 정책을 따르는지 확인한다. 숨겨진 SEO 전용 글 목록이나 봇 전용 다른 본문을 추가하지 않는다.
4. 공개 Brain의 독립 상세/목록 링크도 감사 표본으로 확인하되 이 단계의 구현은 Blog 발견 문제에 한정한다. Brain에 별도 결함이 확인되면 UI 보존 조건을 포함한 후속 step으로 분리한다.

## 인수 기준

인증 없는 no-JS 방문자가 일반 Blog 목록에서 공개 글과 다음 페이지로 이동하고, JS 검색·필터/오류 재시도도 유지된다. 이미 해결돼 있다면 근거 있는 no-op로 기록한다.

## 검증

1. 실제 브라우저 JS OFF 또는 HTTP HTML에서 공개 글 anchor를 확인하는 RED→GREEN.
2. JS ON/OFF·키보드·1440/390/320px·빈 목록·DB 오류의 기본 읽기를 검증한다.
3. site/crawler/public-read 회귀와 기본 gate. 공개 데이터/hash·Home 레이더·Memory UI가 바뀌지 않았는지 diff 확인.

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

S2 Step 2 `metadata-and-structured-data`.
