# Step 1: private-upload-preview-and-versions

## 상태와 선행 조건

pending — 계획이며 미구현. A4 Step 0 및 A1 공통 인증/관리 shell 완료.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step에서 만든 실제 auth/파일/검증/다운로드/migration 파일도 완료 기록을 따라 읽는다. 아래 경로는 계획 등록 시 존재한다.

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
- `apps/h-log/.codex/docs/harness/RESUME_PDF_CONTRACT.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `plans/automated-blog-publishing-plan.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/admin-resume-pdf/index.json`
- `apps/h-log/phases/admin-console-foundation/index.json`
- `apps/h-log/phases/admin-resume-pdf/step0.md`
- `apps/h-log/app/admin/brain/page.tsx`
- `apps/h-log/app/admin/brain/records/route.ts`
- `apps/h-log/lib/brain-owner.ts`
- `apps/h-log/lib/brain-capture-http.ts`
- `apps/h-log/migrations/004_brain_capture.sql`
- `apps/h-log/scripts/blog-migrations.mjs`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/compose.yaml`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`

## 작업

A4 Step 0의 [확정 계약](../../.codex/docs/harness/RESUME_PDF_CONTRACT.md)을 구현 기준으로 사용한다. 예정 파일/명령은 live code와 대조해 추가하고 문서만으로 구현된 것으로 취급하지 않는다.

1. 확정한 private PDF 저장 schema와 /admin/resume 업로드·버전 목록을 구현한다. 서버가 생성한 식별자와 내용 hash를 쓰고 원본 파일명을 경로/공개 이름에 사용하지 않는다. 메모·바이트 크기·페이지 수·검증 상태·등록 시각을 인증 후 조회한다. 제한된 양의 메타데이터 목록만 읽고 모든 PDF 바이트를 한꺼번에 로드하지 않는다.
2. 인증·정확한 Origin·크기 상한을 확인한 뒤 실제 PDF 형식/파싱/지원 가능성을 검증한다. 선언한 Content-Length를 신뢰하지 않고 실제 수신량도 제한한다. 파서 실패·시간 초과·암호화·손상·활성 내용 등 확정된 거부 조건에서는 공개 가능한 버전을 만들지 않는다.
3. 인증된 경로에서 전 페이지를 제한된 renderer로 미리 본다. 공개 static path/공유 URL/원격 변환 API 없이 같은 hash의 파일을 검토하고 외부 네트워크/실행 동작을 허용하지 않는다. 모바일에서는 읽기/확대/페이지 이동을 제공한다.
4. 새 파일 업로드는 새 비공개 버전이며 기존 바이트/공개 포인터를 보존한다. 관리자용 버전 메모 수정은 감사로 남기되 PDF 본문 수정으로 표시하지 않는다. 같은 요청의 중복 업로드·저장 실패·재시작/보관량 초과에서 부분 데이터·자동 삭제가 없는지 확인한다.

## 인수 기준

소유자가 PDF를 등록·미리보기·수정본 재등록할 수 있고 전부 비공개로 남는다. 기존 공개 포인터는 변하지 않으며 버전/hash와 바이트가 일치하고 모든 미리보기/파일 API가 인증된다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 기본 gate를 실행한다. DB/repository/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가하고 parser/HTTP 검증 명령은 실제 구현에 맞춰 기록한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. 합성 PDF만 사용해 정상 다중 페이지, 가짜 MIME/확장자, 잘린 파일, 암호화/첨부/실행 동작, 크기/페이지/보관량 초과와 parser timeout을 검사한다.
2. 중복 업로드·감사 저장 실패·DB 재시작, 익명/잘못된 origin/직접 API/RSC·미리보기 외부 요청·1440/390/320px를 검증한다.
3. 실제 command·결과·한계·다음 작업을 step과 index에 기록한다. 계획만으로 completed를 표시하지 않는다.

## 하지 말 것

- 업로드만으로 공개하거나 기존 파일 바이트를 덮어쓰지 말 것. 새 버전 검토와 공개 의사가 분리돼야 한다.
- public 폴더/공개 bucket/원격 변환 서비스에 개인 PDF를 복사하지 말 것. 인증·파일 검수·공개 current 판정을 우회할 수 있다.
- MIME/확장자만으로 파일을 신뢰하거나 검증 불가능한 PDF를 공개하지 말 것. 업로드와 parser는 외부 입력 경계다.
- 파일 교체를 범용 PDF 본문 편집이나 온라인 Resume 자동 동기화로 설명하지 말 것. 이번 구현 범위가 다르다.
- 실제 이력서·비공개 과거 파일·metadata/본문·키를 fixture/로그/커밋에 넣지 말 것. 검증은 합성 자료로 수행한다.
- OCI/DNS/TLS/운영 migration·실제 PDF 공개·provider/timer를 실행하지 말 것. 로컬 phase 완료와 운영 승인은 별개다.

## 다음 단계

A4 Step 2 published-resume-download. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
