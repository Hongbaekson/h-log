# Step 2: private-queue-lab

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. A1 Step 1 완료. 공통 인증 뒤 실험을 이동한다.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step에서 추가한 실제 인증/정책/요청/조회 파일도 그 완료 기록을 따라 읽는다. 아래 목록은 등록 시 존재하는 파일이다.

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
- `apps/h-log/.codex/docs/harness/ADMIN_CONSOLE_PLAN.md`
- `apps/h-log/.codex/docs/harness/ADMIN_ACCESS_CONTRACT.md`
- `apps/h-log/lib/admin-owner.ts`
- `apps/h-log/lib/admin-server.ts`
- `apps/h-log/app/admin/layout.tsx`
- `apps/h-log/app/admin/page.tsx`
- `apps/h-log/components/admin/AdminNavigation.tsx`
- `apps/h-log/scripts/admin-owner.http.test.mjs`
- `plans/automated-blog-publishing-plan.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/admin-console-foundation/index.json`
- `apps/h-log/phases/admin-console-foundation/step1.md`
- `apps/h-log/app/lab/queue/page.tsx`
- `apps/h-log/components/lab/QueueReplay.tsx`
- `apps/h-log/lib/queue-lab.ts`
- `apps/h-log/lib/queue-lab.test.ts`
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/lib/blog-crawler-output.ts`
- `apps/h-log/lib/site-seo.test.ts`

## 작업

1. 기존 재생 계산·가상 데이터·한계 설명을 재사용해 /admin/lab/queue로 옮긴다. 실제 운영 작업 제어와 혼동되지 않게 가상 실험임을 유지한다.
2. 공개 /lab/queue를 404로 종료하고 Portfolio의 진입 링크와 sitemap 항목을 제거한다. 공개 경로에서 관리자 주소로 redirect하거나 관리자 링크를 새로 만들지 않는다.
3. 관리자 실험에서 공개 프로젝트로 나가는 읽기 링크는 허용하되 비공개 관리자 정보/credential을 URL에 넣지 않는다. 메타데이터·검색·feed/llms·prefetch에도 관리자 경로/본문이 노출되지 않는지 검증한다.

## 인수 기준

익명/공개 host의 기존 실험 URL은 404이고 새 실험은 인증된 관리자만 읽는다. 공개 링크·sitemap에 실험이 없으며 가상 재생 동작은 동일하다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 공개 실험 URL·sitemap·프로젝트 링크의 노출 RED를 먼저 재현하고 비공개 전환 GREEN을 확인한다.
2. 기존 queue-lab 계산 테스트와 1440/390/320px·키보드·재생/초기화·로그인 유무를 확인한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

A1 Step 3 second-brain-admin-integration. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
