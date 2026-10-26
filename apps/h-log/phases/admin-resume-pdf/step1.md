# Step 1: private-upload-preview-and-versions

## 상태와 선행 조건

completed — 2026-10-26 비공개 등록·전 페이지 PNG 미리보기·불변 버전·메모 구현과 로컬 검증 완료. A4 Step 0 및 A1 공통 인증/관리 shell을 재사용했다. 공개/다운로드는 Step 2, 최대 예산·복구 리허설은 Step 3에 남아 있다.

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

## 완료 기록 — 2026-10-26

### 구현과 변경 파일

- `lib/resume-pdf.ts`는 5 MiB·10페이지·20버전/100 MiB 상한, UUID/expectedRevision·메모 명령과 DTO를 정의한다. `resume-pdf-http.ts`는 owner/Host/Origin/feature를 body/DB보다 먼저 검사하고 실제 수신량·30초 수신·16 KiB JSON·safe error를 적용한다.
- `resume-pdf-processor.ts`는 암호화·손상·활성 내용·첨부/폼·숨김 레이어·증분 이력·잘못된 링크를 거부하고 객체/텍스트/메타데이터와 모든 페이지를 검사한다. 같은 원본을 PNG로 렌더하며 원본 PDF는 재작성하지 않는다. 공통 privacy scanner를 재사용한다.
- `resume-pdf-repository.ts`, `resume-pdf-server.ts`, `007_resume_pdf_storage.sql`은 불변 bytea/검사 보고서와 singleton revision을 저장한다. 업로드/메모·감사·receipt를 한 transaction으로 commit하고 감사 실패/충돌은 rollback한다. 중복 키는 원래 receipt, 같은 파일의 새 키는 기존 ID를 포함한 409다. 공개 포인터는 보존한다. 전용 pool의 연결 오류는 고정 문구만 기록한다.
- `app/admin/resume`의 page/records/files/preview, `components/admin/ResumeManager.tsx`와 CSS는 파일 선택·보관량/버전 목록·PNG 페이지 이동/확대·검사 보고서·메모·같은 요청 재확인을 제공한다. 날짜를 Asia/Seoul로 고정하고 hydration 전 입력을 잠갔다. 기존 관리자 탐색/개요에 연결했으며 공개 Header/Resume/레이더는 수정하지 않았다.
- Dockerfile에 같은 Linux 도구를 사용하는 `pdf-tools`와 `resume-pdf-test` stage를 추가했다. migration inventory/legacy upgrade·공통 admin HTTP 행렬과 PDF 단위/DB/native/HTTP 검증을 함께 갱신했다. npm dependency/lockfile·운영 Compose/Nginx는 변경하지 않았다.

### 도구와 실행 경계

기존 Node 24 Alpine base digest `sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43`를 유지했다. 직접 추가한 패키지는 qpdf `12.3.2-r0`, poppler-utils `25.12.0-r1`, util-linux-misc `2.42.3-r1`, font-noto-cjk `0_git20220127-r1`(OFL-1.1), font-dejavu `2.37-r6`(Bitstream-Vera)다. Linux x86_64에서 검증했으며 arm64는 실행 허용 대상이지만 이번 턴에 실행하지 않았다. arm64 배포 전 같은 검증을 다시 실행한다.

검증한 최종 `hlog-web:resume-step1` manifest digest는 `sha256:0bb2291ad1587aa6ec0128efb2116561b54419b7b0ee795454c09ce14daf5374`다. 이는 로컬 검증 image이며 레지스트리 push/운영 배포는 하지 않았다. 실제 parser 버전과 실행 파일 존재를 확인하고 없으면 503으로 닫는다. 비 root 자식 프로세스에 AS 256 MiB·CPU 5초·출력 파일 8 MiB·FD 64·CORE 0·호출 wall 10초/전체 45초를 적용했다. seccomp는 socket/connect/io_uring을 EPERM으로 거부하고 허용 env만 전달한다. x64/arm64의 native syscall에는 socketcall이 없어 별도 필터를 넣지 않는다. 새 권한/privileged container·원격 변환 서비스·Docker socket은 없다.

처리 전체에 advisory lock `710493708`을 쓰며 기존 migration lock `710493707`과 분리했다. 전용 0700 임시 루트/작업 디렉터리와 0600 입력을 사용하고 성공·실패·abort·재시작 잔여물을 정리한다. 입력과 한 페이지 출력만 순차 보관한다. **32 MiB는 전체 임시 공간 예산이며 별도 tmpfs 총량 quota를 설치한 상태는 아니다.** 실제 최대 공간·web RSS·DB/dump/복구 측정과 총량 제한 보완은 Step 3에서 수행한다. 완전한 파일시스템 격리나 악성 PDF 무해화를 보장한다고 표현하지 않는다.

### 검증 결과

모든 자료는 합성 PDF이며 별도 localhost PostgreSQL 컨테이너와 테스트가 생성/제거하는 전용 DB만 사용했다. 실제 이력서·운영 DB·provider·OCI에는 접근하지 않았다.

| 검증 | 실행/결과 |
| --- | --- |
| TDD | 미구현 model/HTTP/repository/processor import와 `/admin/resume` 404의 RED → 동일 focused 검증 GREEN. DB 재시작 시 원시 pg Client 설정이 로그로 나오는 실패를 재현한 뒤 고정 오류 handler로 해결 |
| Model/HTTP unit | `node --no-warnings --test --experimental-strip-types lib/resume-pdf.test.ts lib/resume-pdf-http.test.ts` 3/3 |
| Native | `npm run test:resume:processor` 4/4. 5 MiB 정확 경계/초과·10페이지/초과, 압축 객체/JS, 빈/실제 암호, 첨부/폼·이력·private 링크·metadata, 네트워크 EPERM·env·CPU/메모리/출력 상한·abort/청소 |
| DB/migrations | 격리 `DATABASE_URL`에서 `npm run test:integration` 17/17, skip 없음. fresh/기존 migration 006→007 보존, 업로드/메모 중복·충돌·불변 바이트·20개 한도·원자적 감사 rollback·공개 포인터 보존·lock 해제 |
| 전체 gate | `npm run test` 237 pass/15 DB skip, `npm run lint`, `npm run typecheck`, `npm run build` 성공. Docker 최종 runner build 성공 |
| 두 ingress HTTP | `node --test scripts/admin-owner.http.test.mjs scripts/resume-pdf.http.test.mjs` 5/5. 공개 `127.0.0.1:3034`·관리 `localhost:3035`의 격리 Nginx, 합성 owner 설정/명시적 HTTP-test flag. 공통 인증/RSC·공개 crawler·upload/retry/메모/PNG·fixed/chunked 크기 초과·Origin·공개 PDF 404 |
| 화면 | Linux `next dev --webpack`와 최종 runner+로컬 HTTPS에서 1440/390/320px 업로드·2페이지·확대·메모·보고서·가로 넘침 없음. 최종 runner에서 응답 유실 재확인·두 창 충돌·no-JS 안내까지 통과, pageerror 없음 |
| 장애 | flag OFF/DB 연결 실패/필수 pdfinfo 부재 3/3, 안전한 안내·503·추가 저장 없음. DB stop/start 후 목록·바이트 보존, 설정/키가 로그에 없음을 확인 |

브라우저 장애 주입은 동시 수정 검증 뒤에 별도로 실행했다. 네트워크 route 가로채기가 다음 검사에 남은 영향을 제거한 뒤 위 결과를 얻었고, 이 검증 도구 문제를 제품 수정으로 처리하지 않았다. 합성 screenshot/임시 인증서·실행 로그는 gitignore된 private 경로에만 두었다.

마지막 문서 검증은 변경 41개 파일 중 Markdown 14개·JSON 3개, 상대 링크 15개·읽을 파일 91개와 전체 46개 phase JSON/162개 step을 확인했다. 관리자 상태는 completed 6·pending 10·blocked 1이고 다른 phase·공개 화면·운영 설정은 보존됐다. `git diff --check`를 통과했으며 테스트용 앱/프록시/DB 컨테이너는 중지했다.

### 남은 일과 배포 조건

- Step 2: 공개본 검토/선택·교체·해제, current/epoch/hash 기반 GET/HEAD·ETag·no-Range 다운로드, Resume CTA. 아직 공개 API/버튼은 없다.
- Step 3: 최대 파일/압축 입력의 실제 RSS·전체 임시 공간·보관량/dump/복구 시간, 새 epoch와 공개 철회 복구 리허설. 이미지 속 글자·가림·누락된 추출은 사람이 원본과 전 페이지를 검토해야 한다.
- 기존 Next.js `16.2.11`을 포함한 production dependency audit는 critical 1·high 3·moderate 1이었다(`npm audit --omit=dev --json`, 2026-10-26). 이번 변경 전 lockfile에 있던 항목이며 자동 업데이트하지 않았다. 배포 전 지원 패치 확인·dependency 갱신·공개/관리 회귀 검증이 필요하다.
- 로컬 완료는 실제 PDF 공개나 운영 migration/Compose/Nginx·DNS/TLS·timer 활성화 승인이 아니다. 사용자 OCI 보류와 A3 운영 승인 경계를 유지한다.
