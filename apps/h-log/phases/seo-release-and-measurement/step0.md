# Step 0: local-seo-release-rehearsal

## 상태와 선행 조건

pending — 계획 등록이며 미구현/미실행.

S1 baseline과 S2 각 step의 결과/no-op 기록이 있어야 한다.

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
- `apps/h-log/phases/seo-release-and-measurement/index.json`
- `apps/h-log/lib/site-seo.test.ts`
- `apps/h-log/lib/blog-crawler-output.test.ts`
- `apps/h-log/lib/blog-public-read-path.integration.test.ts`
- `apps/h-log/scripts/admin-owner.http.test.mjs`
- `apps/h-log/scripts/resume-pdf.http.test.mjs`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/harness/ADMIN_ACCESS_CONTRACT.md`
- `apps/h-log/.codex/docs/harness/RESUME_PDF_CONTRACT.md`

## 작업

1. local production build·두 ingress·합성 공개/초안/철회 데이터로 S1 표본을 다시 실행한다. URL·head·schema·기본 HTML·crawler·실패 경계를 한 receipt에 연결한다.
2. draft/withdrawn/private Brain·PDF sentinel이 HTML/RSC/검색/Markdown/feed/llms/sitemap에 없는지 검사한다. 관리자 페이지 404/401은 SEO 결함으로 바꾸지 않는다.
3. 정상·빈 목록·404·DB 실패·철회 후 재요청·이미지 실패에서 과거/비공개 데이터 fallback이 없는지 확인한다. 미래 PDF current 다운로드는 PDF phase의 공개 검토/noindex 계약을 따른다.
4. 원본의 자동 schema hook을 대체할 실제 출력 검증과 최소 회귀 명령을 저장소 방식으로 정리한다. CI에 외부 크롤링/키/비용 작업을 자동 추가하지 않는다.
5. 배포 전 남은 gate를 기록한다: 기존 Next.js critical 패치/재검증, 실제 origin/privacy 설정, 실제 콘텐츠 검수, OCI/도메인/운영 승인. 로컬 완료를 배포 준비 전체 완료로 부르지 않는다.

## 인수 기준

S1 대비 해결/남은/미측정 항목과 전후 증거가 정리되고 public/private 회귀가 통과한다. 실제 배포 조건은 별도로 남는다.

## 검증

1. focused SEO·crawler·HTTP, npm run test/lint/typecheck/build, 격리 DB 관련 integration.
2. 1440/390/320px·키보드·no-JS·오류/철회·레이더/Brain UI 보존 확인.
3. 기존 관리자/모니터링/운영 보류 상태와 비공개 원자료 제외, git diff --check.

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

S3 Step 1. OCI/도메인/계정 사용 조건이 없으면 blocked를 유지한다.
