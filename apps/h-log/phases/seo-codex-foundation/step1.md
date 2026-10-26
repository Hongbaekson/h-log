# Step 1: public-audit-baseline

## 상태와 선행 조건

pending — 계획 등록이며 미구현/미실행.

S1 Step 0의 Codex adapter가 호출 검증을 통과해야 한다.

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
- `apps/h-log/phases/seo-codex-foundation/index.json`
- `apps/h-log/app/layout.tsx`
- `apps/h-log/app/robots.txt/route.ts`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/app/brain/page.tsx`
- `apps/h-log/app/brain/[slug]/page.tsx`
- `apps/h-log/lib/public-site-origin.ts`
- `apps/h-log/lib/site-seo.test.ts`
- `apps/h-log/lib/blog-crawler-output.test.ts`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`

## 작업

1. S1 Step 0에서 만든 실제 adapter/참고 파일을 읽고 `$hlog-seo`로 H-Log의 개인 포트폴리오·기술 블로그 유형을 지정한다. 원본의 상업 사이트 체크를 전부 적용하지 않는다.
2. Home/Resume/Portfolio 목록·상세/Blog 기본 목록·page 2·검색·태그·상세/Brain 목록·상세와 crawler 출력을 표본으로 선정한다. private/철회/없는 slug는 합성 자료의 음성 사례만 사용한다.
3. 별도 localhost public ingress와 합성 DB에서 production build를 사용한다. 정상 HTTP의 초기 HTML·최종 DOM·no-JS를 비교하고 status/head/JSON-LD/link/sitemap을 수집한다. proxy origin과 canonical용 합성 HTTPS origin을 구분한다.
4. 기존 no-JS Blog 목록 기록, 페이지 canonical, Brain의 그래프/상세 링크, metadata 상속을 재현하고 확인/미재현/미측정으로 구분한다. baseline 점수는 코드 문자열 검사만으로 계산하지 않는다.
5. 산출물은 private 원자료와 공개 가능한 `SEO_AUDIT_BASELINE.md`(예정)로 나눈다. 발견마다 최소 증거·신뢰도·P0/P1/P2·담당 S2 step·검증 방법을 연결한다. 실제 GSC/CrUX 데이터가 없으면 미측정으로 남긴다.

## 인수 기준

공개 표본·실행 환경·앱 SHA·도구 버전·확인된 결함과 미측정 항목이 재현 가능한 목록으로 남고, S2에서 고칠 항목의 근거와 우선순위가 명확하다.

## 검증

1. 기존 site-seo/crawler/origin 단위 기준선을 실행하고 HTTP 및 1440/390/320px 표본과 비교한다.
2. 관리자 credential 없는 crawler가 제한 밖 경로로 이동하지 않는지 확인한다. private/철회 sentinel을 보고서에서 제외한다.
3. 같은 표본의 재실행으로 관측된 결함과 도구 오류를 구분한다. 운영 사이트의 색인/트래픽을 로컬 결과에서 추정하지 않는다.

문서/JSON은 관련 파서·링크 검사와 `git diff --check`를 실행한다. 실행 도구를 새로 만들면 실제 smoke 결과와 실패 경계를 기록한다.

## 하지 말 것

- SEO 점수 때문에 비공개 데이터·관리 경로를 공개하지 말 것. 인증/공개 사본 정책이 SEO보다 우선한다.
- 근거 없는 경험·성과·검색량·구조화 데이터를 만들지 말 것. 기존 공개 근거와 한국어 작성 기준을 보존한다.
- 원격 installer·extension·새 provider·전체 upstream agent 실행을 자동 적용하지 말 것. 이 단계에서 필요한 자료와 도구만 사용한다.
- 운영 보류를 해제하거나 DNS/TLS·GSC 제출·실제 글/PDF 발행을 계획 승인만으로 수행하지 말 것. 로컬 변경과 외부 상태 변경은 별도 범위다.
- Home 레이더·승인된 Brain UI·DB published-current/hash를 SEO 작업에 섞어 전면 변경하지 말 것.

## 다음 단계

S2 Step 0. 기존 관리자 일반 다음 작업과 운영 보류는 유지한다.
