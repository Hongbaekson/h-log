# Step 2: published-resume-download

## 상태와 선행 조건

completed — 2026-10-26. A4 Step 1의 비공개 보관함에 검토한 버전의 공개·교체·해제와 Resume 다운로드를 연결했다. 실제 개인 PDF 공개와 운영 적용은 수행하지 않았다.

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

## 완료 기록 — 2026-10-26

- `resume-pdf.ts`의 공개 명령은 ID·SHA-256과 네 가지 검토 확인을 요구한다. 관리자 UI는 전 페이지 이미지와 추출 보고서를 열기 전 승인을 막고, 파일 선택·목록 갱신·명령 완료마다 확인을 초기화한다. 이전 버전 재선택도 동일하다.
- `resume-pdf-http.ts`는 서버의 유효한 `HLOG_RESUME_PDF_PUBLICATION_EPOCH`를 확인하고, 기존 처리 lock 안에서 같은 바이트를 현재 개인정보 정책으로 다시 검사한 뒤 짧은 공개 transaction을 실행한다. 미설정은 `409 publication_disabled`이며 업로드·검토·해제는 계속 가능하다.
- `resume-pdf-repository.ts`는 revision·중복 명령·hash를 검사하고 포인터/검토/epoch/감사를 원자적으로 저장한다. 완료 receipt는 재사용하지만 늦은 재전송으로 현재 포인터를 되돌리지 않는다. 새로운 epoch로 과거 명령을 보내면 충돌로 거부한다. 기존 migration 007을 사용하며 schema 변경은 없다.
- `resume-pdf-download.ts`와 `/api/resume/pdf`는 한 snapshot의 현재 공개본만 조회하고 bytea/hash/크기/정책을 검사한다. GET/HEAD, strong If-Match→weak If-None-Match, no-store, 한글 attachment 파일명, Range 무시/전체 응답을 제공한다. ID query는 404, DB/무결성 오류는 일반 503이며 과거 파일 fallback은 없다. 프로세스당 네 개의 스트림 슬롯을 완료·취소·30초 timeout에 반환한다. PG 연결/statement/query에도 제한 시간을 둔다.
- `ResumeDownload`는 바이트 없는 metadata 조회와 Suspense 영역을 사용한다. 공개본만 일반 링크로 표시하고 DB 오류는 이 영역의 안내로 제한한다. 본문/프로필과 서버 HTML 읽기를 유지하며 Home·레이더·Brain UI는 변경하지 않았다.

### 실행한 검증

1. RED: 공개 JSON을 받지 못하는 parser, 공개 조회가 없는 repository, 다운로드 handler 부재, epoch 없이 저장소에 접근하는 handler, Resume의 조건부 다운로드 영역 부재를 각각 확인했다. 같은 focused test를 GREEN으로 전환했다.
2. 단위 검사: `npm run test` 244 pass / 16 DB skip. 저장소 검사는 격리 DB의 `npm run test:integration` 18/18에서 별도로 실행했다. A→B→해제→A, 감사 실패 rollback, 동시 revision 경쟁, 손상 bytea, epoch 불일치, 과거 receipt 재전송을 포함한다.
3. Linux HTTP: `HLOG_RESUME_HTTP_TEST=1 HLOG_RESUME_PUBLIC_HTTP_TEST=1 npm run test:resume:http` 2/2. loopback 관리자 origin/owner test key와 유효한 서버 epoch를 사용했다. 실제 qpdf/Poppler 재검사, GET/HEAD/조건부/Range/ID query, 공개 Resume 링크와 교체·해제를 검증했다. 환경변수는 검증 환경에만 주입했다.
4. 로컬 추가 확인: 현재 개인정보 정책에서 `Synthetic`을 금지하면 기존 등록본도 422로 공개가 거부되고 포인터/revision/감사가 보존된다. DB 중지 시 GET/HEAD는 no-store 503이고 온라인 Resume 본문·프로필은 유지된다. 재시작 뒤 같은 ETag/공개본을 확인했다.
5. 캐시를 활성화한 로컬 Nginx에서 공개 PDF를 두 번 요청해 `200/no-store/MISS`, 해제 후 일반·조건부 요청 모두 `404/no-store/MISS`를 확인했다. 브라우저 다운로드 후 같은 URL을 다시 열어 `resume_not_found`를 확인했다. 다운로드 완료 사본과 이미 시작한 응답의 회수는 보장하지 않는다.
6. 개발 서버의 관리자·Resume를 1440/390/320px에서 확인했다. 전 페이지/보고서 전에는 확인과 공개가 비활성이고, 네 가지 확인 후 키보드 공개·해제가 가능하며 완료 후 검토가 초기화된다. 가로 넘침 없이 버튼·문서 정보·긴 hash가 줄바꿈된다.
7. 두 ingress의 `npm run test:admin:http` 4/4에서 HTML/API/RSC·Host/Origin·공개 관리자 차단을 확인했다. 처음의 직접 개발 서버 접속은 ingress 전용 헤더 조건과 달라 실패했으며, 기존 로컬 ingress 계약을 적용한 환경에서 통과했다.
8. `npm run lint`, `npm run typecheck`, `npm run build`, 문서·phase JSON·상대 링크 및 `git diff --check`를 통과했다. native 도구 자체의 변경은 없으며 Step 1의 parser suite와 별개로 이번에는 실제 HTTP 공개 재검사를 실행했다.

### 남은 범위

Step 3에서 최대 20버전/100 MiB·임시 공간/RSS/동시 전송 실측, dump/restore와 새 epoch·구 receipt의 종합 복구 리허설을 진행한다. 실제 운영 두 ingress 검증과 rollout은 A3의 승인 범위다. 기존 Next.js critical audit의 패치 gate는 계속 남아 있다. 운영 Compose/Nginx/환경값, OCI·실제 PDF·provider·timer는 변경하지 않았다.
