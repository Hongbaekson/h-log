# Step 0: resume-file-and-visibility-contract

## 상태와 선행 조건

pending — 계획이며 미구현. A1 admin-console-foundation 전체 완료. Blog 자동화/모니터링 구현을 기다릴 필요는 없다.

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
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/phases/admin-resume-pdf/index.json`
- `apps/h-log/phases/admin-console-foundation/index.json`
- `apps/h-log/app/resume/page.tsx`
- `apps/h-log/lib/brain-owner.ts`
- `apps/h-log/migrations/003_publish_rollback_audit.sql`
- `apps/h-log/migrations/004_brain_capture.sql`
- `apps/h-log/compose.yaml`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/phases/public-site-quality-hardening/step5.md`

## 작업

1. 현재 PDF asset/CTA/API가 제거된 상태와 공통 관리자 인증을 확인한다. 관리자 등록·미리보기·버전 메모·파일 교체·공개/해제·이전 버전 선택의 대상/권한/감사와 공개 current 포인터를 정의한다. 파일 수정은 새 버전이며 업로드만으로 공개본을 바꾸지 않는다.
2. 소수 파일의 PostgreSQL bytea·메타데이터·hash·공개 포인터를 기본안으로 파일당 5 MiB/10페이지/20버전의 초기 상한, 총량/메모리/보관/backup 예산을 확정한다. 검증된 업로드·바이트·감사를 원자적으로 저장하고 재시작/중복 업로드/동시 공개에서 유실·중복을 막을 schema를 정한다. 실제 테이블명/번호는 기존 migration 확인 후 결정한다.
3. 업로드 크기·형식·암호화·첨부/실행 동작 검사와 제한된 미리보기 renderer를 선정한다. 지원하지 않는 입력 거부, parser 자원/시간 제한, 외부 요청 금지, 임시 파일 정리와 인증된 미리보기 접근을 검증 가능하게 적는다. 현재 Nginx 2m 제한을 관리자 업로드 위치에서만 맞추는 방법을 정한다.
4. 공개 다운로드는 /api/resume/pdf의 current 파일 하나만 제공하도록 정한다. no-store·GET/HEAD·조건부/Range·404/503·Content-Disposition·교체/해제 직후 새 요청의 동작을 확정한다. 이미 받은/전송 중인 바이트를 회수할 수 없음을 명시한다.
5. 파일/hash별 전 페이지·메타데이터/주석/링크·공개 정보 검토 확인과 예상 revision·중복 키·감사 transaction을 정한다. admin_actions의 target_type 제약을 실제 schema와 대조하고 필요한 최소 확장을 설계한다. 복구 시 공개 게이트 닫힘/재검토와 rollback 절차를 정한다. 범용 PDF 편집기는 포함하지 않는다.

## 인수 기준

저장/검증/검수/공개/다운로드/회수/복구의 상태·권한·자원 예산과 각 테스트가 정의된다. private 파일은 public 경로를 갖지 않고 하나의 승인된 버전만 공개된다. 구체적인 기존 파일/새 구현 대상과 확인 명령이 확정된다.

## 검증

Markdown/JSON 파싱·상대 링크/읽을 파일 존재·상태/의존 순서와 `git diff --check`를 확인한다. 코드/DB/파일을 변경하지 않는다.

1. 이전 공개 PDF를 복원하지 않고 라이브 코드·migration·Nginx·backup 경계와 계약을 대조한다.
2. 서버 미리보기와 본문 편집, 공개 포인터와 보관 파일 삭제, 관리자 배포와 실제 파일 공개가 구분돼 있는지 확인한다.
3. 실제 command·결과·한계·다음 작업을 step과 index에 기록한다. 계획만으로 completed를 표시하지 않는다.

## 하지 말 것

- 업로드만으로 공개하거나 기존 파일 바이트를 덮어쓰지 말 것. 새 버전 검토와 공개 의사가 분리돼야 한다.
- public 폴더/공개 bucket/원격 변환 서비스에 개인 PDF를 복사하지 말 것. 인증·파일 검수·공개 current 판정을 우회할 수 있다.
- MIME/확장자만으로 파일을 신뢰하거나 검증 불가능한 PDF를 공개하지 말 것. 업로드와 parser는 외부 입력 경계다.
- 파일 교체를 범용 PDF 본문 편집이나 온라인 Resume 자동 동기화로 설명하지 말 것. 이번 구현 범위가 다르다.
- 실제 이력서·비공개 과거 파일·metadata/본문·키를 fixture/로그/커밋에 넣지 말 것. 검증은 합성 자료로 수행한다.
- OCI/DNS/TLS/운영 migration·실제 PDF 공개·provider/timer를 실행하지 말 것. 로컬 phase 완료와 운영 승인은 별개다.

## 다음 단계

A4 Step 1 private-upload-preview-and-versions. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.
