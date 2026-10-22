# Step 3: resume-privacy-and-recovery-rehearsal

## 상태와 선행 조건

pending — 계획이며 미구현. A4 Steps 0–2 완료. 실제 개인 PDF를 공개하는 단계가 아니다.

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

## 작업

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
