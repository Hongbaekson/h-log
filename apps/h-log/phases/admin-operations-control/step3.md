# Step 3: local-admin-release-rehearsal

## 상태와 선행 조건

계획 등록 상태: pending — 미구현. A1/A2/A4, A3 Steps 0–2와 operations-observability Steps 0–6 완료.

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
- `plans/automated-blog-publishing-plan.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/admin-operations-control/index.json`
- `apps/h-log/phases/admin-operations-control/step2.md`
- `apps/h-log/compose.yaml`
- `apps/h-log/deploy/nginx/conf.d/hlog.conf`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/phases/operations-observability/step6.md`
- `apps/h-log/lib/blog-public-read-path.integration.test.ts`
- `apps/h-log/scripts/brain-capture.http.test.mjs`
- `apps/h-log/phases/admin-resume-pdf/index.json`
- `apps/h-log/phases/admin-resume-pdf/step3.md`

## 작업

1. 격리 로컬 ingress의 공개/관리 두 host와 직접 upstream으로 전체 인증·경로 allowlist·TLS/Host 전달 계약을 검증한다. 실제 DNS/OCI 변경 없이 필요한 배포 예시와 rollback 절차를 준비한다.
2. 합성 글/Brain/PDF와 fake provider로 초안·선택 버전 공개·철회·정책 pause·재시도·감사 실패·DB/worker 재시작의 사용자 경로를 검수한다. 운영 데이터나 실제 수신처를 사용하지 않는다.
3. 인증 실패·형제 origin·null Origin·위조 forwarded header·RSC/prefetch·private cache·검색/crawler 유출을 검사한다. 백업/격리 restore와 이전 앱 artifact의 schema 호환을 확인한다. 새 schema를 즉시 삭제하는 rollback은 만들지 않는다.
4. 키 회전/분실 복구·관리자 차단 rollback·현재 제한을 runbook에 정리하고 A3 Step 4에서 사용할 검증 영수증을 남긴다.

## 인수 기준

운영 배포 전 필요한 auth/데이터/실패/복구/브라우저 검증과 재현 명령이 기록돼 있고 secret 없는 배포 예시 및 안전한 rollback이 준비된다. 로컬 통과를 운영 완료로 표시하지 않는다.

## 검증

앱 디렉터리에서 focused RED → GREEN 후 아래 기본 gate를 실행한다. DB/repository/worker/migration 변경 시 격리 DB에서 `npm run test:integration`을 추가한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

1. docker compose config --quiet와 선택한 로컬 Nginx 설정 검사, 격리 통합·HTTP·1440/390/320px 및 공개 회귀를 실행한다.
2. 정책 OFF/인증 차단 복구 후 공개 콘텐츠와 원문/hash/Brain 이력이 보존되는지 확인한다.
3. 이 step과 phase index에 실제 command·결과·남은 한계·다음 작업을 기록한다. 완료한 구현만 completed로 변경한다. UI 변경은 개발 서버의 데스크톱/모바일 검수를 포함한다.

## 하지 말 것

- 인증을 메뉴 숨김/noindex/서브도메인 이름만으로 대신하지 말 것. 직접 URL/API/RSC 접근으로 우회할 수 있다.
- 비공개 글·Brain 원문·credential·raw error를 공개 응답/소스/로그에 넣지 말 것. 관리자 데이터도 공개 경계와 별개다.
- 가상 Queue를 실제 작업 제어에 연결하거나 웹에서 shell/systemctl/docker를 실행하지 말 것. 실제 작업은 기존 runner/lease와 명시된 명령만 사용한다.
- Home/레이더·공개 Brain UI·저장 원문/hash를 이 작업과 무관하게 바꾸지 말 것. 기존 사용자 요구와 공개 무결성을 보존한다.
- OCI/DNS/TLS/운영 migration·실제 provider/외부 알림·공개 발행·timer를 실행하지 말 것. 이 단계는 로컬 구현/검증 범위다.

## 다음 단계

승인 후 observability Step 7, 이후 A3 Step 4. 전체 순서는 [통합 관리자 계획](../../.codex/docs/harness/ADMIN_CONSOLE_PLAN.md)을 따른다.

## A4 인계 — 2026-10-26

A4 Steps 0–3의 합성 로컬 검증은 완료했다. [PDF Step 3](../admin-resume-pdf/step3.md)의 실제 최대 보관량 dump/restore·공개 초기화·의존성 패치 결과를 읽는다. 이 단계에서는 같은 artifact/schema·32 MiB tmpfs/UID·native sandbox·공개/관리 ingress와 새 epoch 복구·feature OFF rollback을 다시 대조하고 운영 자원 예산을 확인한다. A4 완료는 이 단계의 다른 선행 조건이나 운영 보류를 해제하지 않는다.
