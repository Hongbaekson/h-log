# Step 1: approved-domain-and-search-console

## 상태와 선행 조건

blocked — 사용자 OCI 보류가 유지되고 실제 공개 도메인/소유권·Search Console 계정 및 사용 범위가 아직 확정되지 않았다. 계획/커밋 요청은 운영 배포·DNS/계정 변경 승인이 아니다.

S3 Step 0 로컬 검증, 보안 패치와 실제 콘텐츠 검수, 사용자 운영 승인·공개 HTTPS 도메인·GSC 소유권이 필요하다.

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
- `apps/h-log/phases/seo-release-and-measurement/index.json`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/lib/public-site-origin.ts`
- `apps/h-log/app/robots.txt/route.ts`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/phases/terraform-infrastructure-adoption/index.json`
- `apps/h-log/phases/admin-operations-control/step4.md`
- `apps/h-log/phases/operations-observability/step7.md`

## 작업

1. 실제 공개 origin·HTTPS·redirect·HLOG_PUBLIC_BASE_URL의 승인된 구성을 확인한다. 필요 DNS/배포 변경은 기존 운영 phase가 소유하며 SEO 명령으로 우회하지 않는다.
2. 소유한 GSC property와 접근 범위를 확인한다. 검증 방식·sitemap 제출 등 쓰기 행동은 구체적 결과가 준비된 후 해당 승인 범위로만 수행한다. 키/계정 export는 private 저장소 밖 공개 commit에 넣지 않는다.
3. 실제 공개 대표 URL의 status/canonical/rendered content·robots/sitemap과 URL Inspection 결과를 비교한다. 임의 URL을 검색 서비스에 제출하거나 IndexNow/Indexing API를 자동 호출하지 않는다.
4. PageSpeed/CrUX는 공개 URL만 사용하고 lab/field를 분리한다. Search Console/Google API의 읽기 연결이 불가능하면 사용자 export 또는 미측정 상태로 남긴다. GA4/tracker 설치를 필수화하지 않는다.
5. 등록 요청 성공과 실제 색인/검색 노출을 분리해 기록한다. 도메인·인증·비공개 데이터 보호를 풀어서 crawler 점수를 높이지 않는다.

## 인수 기준

승인된 실제 origin의 제출/검증 결과와 사용한 계정 범위가 기록되고, 아직 색인되지 않았거나 field 데이터가 부족하면 그 상태가 명확하다. 승인/환경 부재 시 blocked 유지.

## 검증

1. 실제 robots/sitemap/canonical·HTTP·public/private smoke와 승인 기록 대조.
2. 소유 GSC property와 표본 URL Inspection, 공개 field/lab 자료의 날짜·수집 범위 확인.
3. 운영 결과와 계획/로컬 결과를 구분하고 secret 없는 receipt만 커밋한다.

문서/JSON은 관련 파서·링크 검사와 `git diff --check`를 실행한다. 실행 도구를 새로 만들면 실제 smoke 결과와 실패 경계를 기록한다.

## 하지 말 것

- SEO 점수 때문에 비공개 데이터·관리 경로를 공개하지 말 것. 인증/공개 사본 정책이 SEO보다 우선한다.
- 근거 없는 경험·성과·검색량·구조화 데이터를 만들지 말 것. 기존 공개 근거와 한국어 작성 기준을 보존한다.
- 원격 installer·extension·새 provider·전체 upstream agent 실행을 자동 적용하지 말 것. 이 단계에서 필요한 자료와 도구만 사용한다.
- 운영 보류를 해제하거나 DNS/TLS·GSC 제출·실제 글/PDF 발행을 계획 승인만으로 수행하지 말 것. 로컬 변경과 외부 상태 변경은 별도 범위다.
- Home 레이더·승인된 Brain UI·DB published-current/hash를 SEO 작업에 섞어 전면 변경하지 말 것.

## 다음 단계

S3 Step 2는 데이터 축적 후 명시적으로 실행한다. 예약 작업을 자동 생성하지 않는다.
