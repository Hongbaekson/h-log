# Step 3: resume-privacy-and-recovery-rehearsal

## 상태와 선행 조건

completed — 2026-10-26. A4 Steps 0–3의 합성 로컬 검증을 완료했다. 실제 개인 PDF 공개·운영 적용은 수행하지 않았다. 아래 작업/예산은 이 단계의 인수 기준이며 결과는 완료 기록을 따른다.

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
- `apps/h-log/phases/admin-resume-pdf/step2.md`
- `apps/h-log/app/resume/page.tsx`
- `apps/h-log/compose.yaml`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/phases/admin-operations-control/step3.md`
- `apps/h-log/phases/admin-operations-control/step4.md`

## Step 1에서 이어받을 항목

- 전체 원본 100 MiB/보고서 10 MiB·web 추가 RSS 64 MiB·tmp 32 MiB·DB/dump/복구 시간을 실측한다. Step 1의 per-process/per-file 제한은 전체 임시 디스크 quota가 아니다. 별도 총량 제한을 검증/보완한 뒤 운영 준비 완료로 표시한다.
- 기존 Next.js 16.2.11의 production audit critical 1·high 3·moderate 1을 배포 전 패치하고 전체 인증/공개 회귀를 확인한다. Step 1은 기존 npm lockfile을 변경하지 않았다.

## 작업

A4 Step 0의 [확정 계약](../../.codex/docs/harness/RESUME_PDF_CONTRACT.md)을 구현 기준으로 사용한다. 예정 파일/명령은 live code와 대조해 추가하고 문서만으로 구현된 것으로 취급하지 않는다.

1. 격리 local DB/두 host의 합성 PDF로 관리자 등록부터 전 페이지 미리보기·공개/교체·해제·이전 버전 선택까지 검수한다. parser/인증/비공개 원문·hash·Nginx 제한·cache·오류의 실패 행렬을 재현한다.
2. DB dump를 별도 테스트 DB에 복구해 바이트/hash·메타데이터·공개 포인터·감사 이력을 대조한다. 복구 후 공개 게이트가 닫힌 상태에서 철회 의사를 재확인해 과거 공개 포인터가 자동 노출되지 않는지 검사한다.
3. 최대 허용 파일/버전 수의 DB·메모리·처리 시간·backup 예산을 확인한다. 저장소/조회/renderer 장애에서 기존 공개 이력서의 fallback이나 private 파일 유출이 없는지 확인한다.
4. 실제 파일의 공개 정책 검수 절차, 교체/해제·키 복구·개인 파일 없는 배포 예시·운영 migration/backup/rollback을 기록하고 A3 release rehearsal/rollout의 PDF 선행 조건을 맞춘다. 원래 Git PDF를 되살리거나 실명 자료를 fixture로 커밋하지 않는다.

## 인수 기준

파일/권한/공개/실패/복구 행렬과 자원 예산을 검증했고 운영 적용에 필요한 문서가 준비된다. 복구로 철회 파일이 다시 공개되지 않으며 현재 기능 완성은 합성 로컬 검증으로만 표시된다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 기본 gate를 실행한다. DB/repository/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가하고 parser/HTTP 검증 명령은 실제 구현에 맞춰 기록한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. PDF 모든 페이지의 렌더 결과를 직접 검수하고 공개 응답/header/body와 불허 입력·비인증 상태를 확인한다.
2. 격리 backup/restore·정책 OFF/복구·배포 rollback·1440/390/320px·public crawler와 기존 글/Brain의 회귀를 확인한다.
3. 실제 command·결과·한계·다음 작업을 step과 index에 기록한다. 계획만으로 completed를 표시하지 않는다.

## 하지 말 것

- 업로드만으로 공개하거나 기존 파일 바이트를 덮어쓰지 말 것. 새 버전 검토와 공개 의사가 분리돼야 한다.
- public 폴더/공개 bucket/원격 변환 서비스에 개인 PDF를 복사하지 말 것. 인증·파일 검수·공개 current 판정을 우회할 수 있다.
- MIME/확장자만으로 파일을 신뢰하거나 검증 불가능한 PDF를 공개하지 말 것. 업로드와 parser는 외부 입력 경계다.
- 파일 교체를 범용 PDF 본문 편집이나 온라인 Resume 자동 동기화로 설명하지 말 것. 이번 구현 범위가 다르다.
- 실제 이력서·비공개 과거 파일·metadata/본문·키를 fixture/로그/커밋에 넣지 말 것. 검증은 합성 자료로 수행한다.
- OCI/DNS/TLS/운영 migration·실제 PDF 공개·provider/timer를 실행하지 말 것. 로컬 phase 완료와 운영 승인은 별개다.

## 다음 단계

operations-observability Step 0. 운영 적용은 A3 Step 4의 승인 범위로 수행. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## 완료 기록 — 2026-10-26

### 구현과 검증 범위

- Compose web에 UID/GID 1001·0700·noexec/nosuid/nodev의 전용 32 MiB tmpfs를 지정했다. Processor는 같은 파일시스템의 종류와 총량을 확인하며 무제한 임시 경로에서는 503으로 닫힌다. 파일 시스템이 가득 차도 작업 디렉터리를 정리하고 다음 검사가 가능하다.
- 기존 원자적 unpublish를 재사용하는 오프라인 복구 명령을 추가했다. 공개 설정이 열렸거나 명령 형식이 잘못되면 DB 접속 전에 거부한다. 포인터 초기화·revision 증가·resume_recovery_reset 감사가 함께 commit되며 같은 명령 재전송은 같은 receipt를 반환한다. 기존 unpublish fingerprint/receipt 호환을 유지했다.
- Next.js/eslint-config-next 16.2.11→16.4.3, sharp 0.35.3→0.35.5와 관련 lockfile을 갱신했다. production npm 감사는 critical 1/high 3/moderate 1에서 0건이다. Next가 생성한 AGENTS.md의 버전별 문서 안내와 next-env.d.ts의 root-params 참조도 함께 반영했다. 앱 인증/공개 로직을 패치에 맞춰 완화하지 않았다.
- 두 loopback ingress(관리자 TLS·공개 HTTP)와 직접 upstream의 auth/Host/Origin/RSC/prefetch/HEAD, 공개 crawler와 기존 Portfolio/Blog 경계 6/6을 통과했다. Patched Next의 같은 origin/path RSC 캐시 키 정규화 redirect만 최대 2회 따라가며 최종 권한/본문을 검사한다. 시험용 캐시 프록시는 조건부 헤더를 upstream으로 전달하며 no-store를 존중한다.
- 최대 PDF 20개 등록, 21번째 409, 비공개 업로드 시 기존 공개본 유지, A→B→해제→A 재검토, 전 10페이지 PNG, 조건부/Range·현재 hash와 4개 동시 다운로드를 확인했다. 합성 PNG 10장을 직접 확인했다.
- 공개 A를 custom dump한 뒤 해제하고 별도 DB로 restore했다. 20개 원본의 SHA-256, 검사 보고서/정책/도구/메모/시각, 공개 state와 전체 감사를 대조했다. 새 epoch에서 404, 옛 공개 명령 409, web 중지 후 reset/재전송, 새 검토 뒤 200을 확인했다. 구 이미지의 PDF 기능 OFF rollback은 원본과 이력을 보존했다.
- 복구 DB의 파일 테이블을 일시적으로 사용할 수 없게 만든 경우 조건부/Range 요청도 503·no-store·고정 오류 JSON을 반환했다. Resume 본문은 200으로 읽히며 링크는 없어지고, 저장소 복구 뒤 다운로드도 복구됐다.

### 실측

Windows Docker Desktop의 Linux Node 24 standalone image, PostgreSQL 16/pgvector, qpdf 12.3.2·Poppler 25.12.0에서 측정했다. 각 버전은 정확히 5 MiB·10페이지이며 무작위 stream과 약 500 kB의 비참조 문자열을 포함한다. 공백 padding의 높은 압축률로 백업 예산을 축소하지 않았다. 페이지 자체는 단순 합성 텍스트이므로 복잡한 실제 문서의 최악 렌더 성능을 보장하는 수치가 아니다.

| 항목 | 최종 리허설 결과 | 기준/해석 |
| --- | --- | --- |
| 원본 20개 | 104857600 bytes / 100.00 MiB | 최대 100 MiB |
| JSONB 검사 보고서 합계 | 10007960 bytes / 9.54 MiB | 버전당 512 KiB, 총 10 MiB 이하 |
| DB 증가량 | 119324672 bytes / 113.80 MiB | 빈 schema 대비 256 MiB 이하 |
| custom dump 전체 | 122153590 bytes / 116.49 MiB | 전체 dump도 PDF 증분 예산 200 MiB 이내 |
| dump / restore | 6544 / 2888 ms | 해당 로컬 환경에서의 측정 |
| 등록 1건 | 1125–1273 ms | HTTP/검사/저장 포함, HTTP 회귀 후 warm process |
| 검사 중 web RSS 최대 증가 | 41356 KiB / 40.39 MiB | 요청 직전 대비 목표 64 MiB 이하 |
| 검사 중 web RSS 최대 | 306684 KiB / 299.50 MiB | web 전체, native 자식 제외 |
| 임시 공간 peak | 5406720 bytes / 5.16 MiB | 32 MiB 총량 quota; ENOSPC 별도 검증 |
| 4개 동시 다운로드 | RSS 증가 84.70 MiB, 최대 367.13 MiB | 검사 1건의 64 MiB 목표와 별도 측정 |

RSS와 tmp 사용량은 10 ms 간격 표본이다. tmpfs 32 MiB는 실제 kernel quota이고 web RSS는 표본값이다. 압축 메타데이터 32 MiB 확장 입력도 거부/정리했다. 관측 자원 계약에서 web 전체·동시 다운로드·native 자식(주소 공간 256 MiB/호출)·tmpfs·기존 부하를 함께 고려한다. 백업 보관 여유 3 GiB는 PDF 증분 기준이며 기존 글/감사/WAL을 포함한 총량으로 오해하지 않는다. 운영 서버의 시간/메모리는 아직 측정하지 않았다.

### 실행 근거와 재현

- TDD RED: tmpfs 검증이 없던 이미지에서 무제한 임시 경로 검사가 성공해 실패했고, 복구 CLI 부재/기존 receipt fingerprint 차이도 focused test로 재현했다. 최소 구현 후 같은 tests가 GREEN이다.
- npm run test: 245 pass / DB 전제 16 skip. 별도 격리 npm run test:integration: 18/18. npm run test:resume:processor: 7/7(기존 parser/네트워크·프로세스 종료, 최대 입력/압축 확장, 공간 소진/무제한 경로).
- npm run test:resume:rehearsal: 최대 용량·두 ingress HTTP 6/6·실제 dump/restore·장애·rollback 전체 통과. npm run lint/typecheck/build 및 git diff --check 통과.
- 개발 서버에서 Resume 1440/390/320px의 본문/프로필·미공개 링크 생략·가로 넘침 없음과 모바일 Brain 그래프를 확인했다. HTTP SSR 읽기는 브라우저 JavaScript와 무관하게 본문과 링크 상태를 확인했다. UI·Home/레이더·Brain 데이터는 변경하지 않았다.
- production image: hlog-web:resume-step3, manifest sha256:82b09a502e44b4fe5e5b7e52f891d6ee09b82043d089f5d4a15495b2e40b773a. 기능 OFF rollback 비교 image: hlog-web:resume-step1. 비공개 로컬 로그·PNG·측정 JSON은 private/resume-rehearsal/ 등에 두고 커밋하지 않는다.

재현 시 앱 디렉터리에서 Linux runner 이미지를 빌드하고, hlog-resume- 접두사의 별도 로컬 PostgreSQL 16/pgvector 테스트 컨테이너를 준비한다. DATABASE_URL은 loopback만 허용하고 해당 테스트 DB 사용자는 임시 DB 생성 권한이 필요하다. HLOG_RESUME_REHEARSAL=1, HLOG_RESUME_DB_CONTAINER, HLOG_RESUME_REHEARSAL_CERT_DIR, NODE_EXTRA_CA_CERTS를 명시한 뒤 npm run test:resume:rehearsal을 실행한다. 인증서는 localhost용 일회용 인증서이며 특정 인증서만 신뢰한다. TLS 검증 비활성화는 사용하지 않는다. 3044/3045/3046 포트를 비워 둔다. 기존 이미지 이름이 다르면 HLOG_RESUME_REHEARSAL_IMAGE/HLOG_RESUME_PREVIOUS_IMAGE로 지정한다.

스크립트가 이번 실행에 생성한 임시 DB·네트워크·web/proxy와 dump만 finally에서 제거한다. 강제 종료 시에는 출력/이름을 확인하고 생성한 대상만 정리한다. 기존 DB/volume이나 실제 파일에는 실행하지 않는다. 실제 운영 reset과 재검토는 [백업/복구 절차](../../.codex/docs/backup-restore-runbook.md), [배포/rollback](../../.codex/docs/deploy-smoke-rollback-runbook.md)을 따른다. A4는 모두 완료이며 다음은 operations-observability Step 0이다.
