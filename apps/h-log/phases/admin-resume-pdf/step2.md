# Step 2: published-resume-download

## 상태와 선행 조건

pending — 계획이며 미구현. A4 Step 1의 private 저장/미리보기와 A1 인증 완료.

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
- `apps/h-log/phases/admin-resume-pdf/step1.md`
- `apps/h-log/lib/resume-pdf.ts`
- `apps/h-log/lib/resume-pdf-http.ts`
- `apps/h-log/lib/resume-pdf-processor.ts`
- `apps/h-log/lib/resume-pdf-repository.ts`
- `apps/h-log/lib/resume-pdf-server.ts`
- `apps/h-log/components/admin/ResumeManager.tsx`
- `apps/h-log/migrations/007_resume_pdf_storage.sql`
- `apps/h-log/scripts/resume-pdf.http.test.mjs`
- `apps/h-log/app/resume/page.tsx`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/public-site-origin.ts`
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/phases/public-site-quality-hardening/step5.md`

## 작업

A4 Step 0의 [확정 계약](../../.codex/docs/harness/RESUME_PDF_CONTRACT.md)을 구현 기준으로 사용한다. 예정 파일/명령은 live code와 대조해 추가하고 문서만으로 구현된 것으로 취급하지 않는다.

1. 특정 버전/hash의 전 페이지·메타데이터·공개 정책 검토 확인을 거쳐 공개본 지정·교체·해제·이전 버전 재선택 명령을 구현한다. 예상 revision/중복 요청 키를 확인하고 공개 포인터/감사를 원자적으로 변경한다. 과거 검토를 새 파일 승인으로 재사용하지 않는다.
2. 인증 없는 /api/resume/pdf는 승인된 current PDF만 반환하도록 구현한다. 공개 query에 임의 version ID/과거 파일 선택을 허용하지 않는다. private/없음/해제는 404, DB/파일 무결성 실패는 일반 오류이며 과거 파일로 fallback하지 않는다.
3. application/pdf, attachment, 한글 이력서.pdf·ASCII fallback과 no-store를 적용한다. 조건부/HEAD/Range도 현재 공개 판정을 먼저 거친다. bytea/hash·공개 포인터의 일관된 조회로 잘못된 버전을 반환하지 않는다.
4. Resume에 실제 공개본이 있을 때 이력서 다운로드 링크를 표시한다. 정보 조회는 바이트 전체를 읽지 않고 공개 여부/허용 메타데이터만 사용하며 DB 장애는 다운로드 영역에 한정한다. 이전 정적 PDF URL·sitemap/feed/llms에 private 파일을 추가하지 않는다.
5. 업로드 A→공개 A→업로드 B→공개 B→해제→재검토한 이전 버전 선택을 검증한다. 이미 전송 중/방문자가 저장한 사본을 회수할 수 없다는 설명과 실제 새 요청 차단 결과를 구분한다.

## 인수 기준

방문자는 Resume에서 지정된 공개본만 내려받고 새 비공개 업로드로 파일이 바뀌지 않는다. 교체/해제 후 새 요청에 이전 파일이 나오지 않으며 버전 충돌·감사 실패 시 기존 상태가 보존된다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 기본 gate를 실행한다. DB/repository/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가하고 parser/HTTP 검증 명령은 실제 구현에 맞춰 기록한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. GET/HEAD/조건부/Range·공개→교체→해제·부정한 version ID·DB 장애·늦은 응답·동시 공개와 다운로드 hash를 확인한다.
2. 브라우저/Next/로컬 reverse proxy 캐시를 채운 뒤 해제하여 새 요청 404를 확인한다. 파일명/Content-Disposition·1440/390/320px·키보드·기존 Resume 본문과 레이더도 점검한다.
3. 실제 command·결과·한계·다음 작업을 step과 index에 기록한다. 계획만으로 completed를 표시하지 않는다.

## 하지 말 것

- 업로드만으로 공개하거나 기존 파일 바이트를 덮어쓰지 말 것. 새 버전 검토와 공개 의사가 분리돼야 한다.
- public 폴더/공개 bucket/원격 변환 서비스에 개인 PDF를 복사하지 말 것. 인증·파일 검수·공개 current 판정을 우회할 수 있다.
- MIME/확장자만으로 파일을 신뢰하거나 검증 불가능한 PDF를 공개하지 말 것. 업로드와 parser는 외부 입력 경계다.
- 파일 교체를 범용 PDF 본문 편집이나 온라인 Resume 자동 동기화로 설명하지 말 것. 이번 구현 범위가 다르다.
- 실제 이력서·비공개 과거 파일·metadata/본문·키를 fixture/로그/커밋에 넣지 말 것. 검증은 합성 자료로 수행한다.
- OCI/DNS/TLS/운영 migration·실제 PDF 공개·provider/timer를 실행하지 말 것. 로컬 phase 완료와 운영 승인은 별개다.

## 다음 단계

A4 Step 3 resume-privacy-and-recovery-rehearsal. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
