# Step 3: local-admin-release-rehearsal

## 상태와 선행 조건

상태: completed — 2026-11-02 격리 관리자 릴리스 검수 완료. A1/A2/A4, A3 Steps 0–2와 operations-observability Steps 0–6 결과를 현재 artifact에서 대조했다. 운영 단계와 실제 파일 공개는 별도 승인 범위다.

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
- `apps/h-log/deploy/observability/admin-monitoring.md`
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

## 완료 기록 — 2026-11-02

### 변경과 재현

- `scripts/admin-release.rehearsal.mjs`와 `npm run test:admin:release`로 새 DB·공개 HTTP/관리 HTTPS ingress·직접 upstream을 구성한다. 합성 자료, fake writer, 새 임시 키와 인증서만 사용한다. 로컬 재현 조건은 [관리자 릴리스 인계](../../deploy/admin/README.md)에 있다.
- 선택형 Nginx/Compose 예시는 기본 배포에 연결하지 않았다. 정확한 port 포함 Host를 검증한 뒤 전달하며 관리 경로만 허용한다. 공개 Nginx와 기존 공개 UI는 변경하지 않았다.
- 비용 조회의 `created_at <= $3`에 JavaScript ISO 시각을 넘기면 DB의 소수점 정밀도가 줄어 같은 밀리초의 사용량이 빠졌다. 격리 통합 테스트에서 기대값 1.25 / 실제 0을 두 번 재현한 뒤 같은 transaction의 `transaction_timestamp()`를 직접 비교하도록 한 줄 수정했다. DB 시각을 고정한 회귀 검사도 포함했다.
- 실제 Nginx를 거친 기존 auth 검사에서 `X-Frame-Options: DENY, DENY` 중복을 발견했다. 예시 ingress에서 중복 upstream 헤더를 숨기고 하나만 설정한 뒤 같은 검사가 통과했다.

### 검증 결과

| 검증 | 실제 결과 |
| --- | --- |
| `npm run test` | 303개 중 277 pass, DB opt-in 26 skip, 실패 0 |
| `npm run test:integration` | 새 격리 PostgreSQL에서 migration·repository·공개 읽기·worker·Brain·PDF·초안·발행·정책·비용·재시도·모니터링 전체 30 pass / skip 0 |
| `npm run test:admin:release` | 실제 Nginx를 통한 auth/ingress/monitoring/Brain/PDF/draft/editorial HTTP 11 pass, 아래 상태·복구 검증 전부 통과 |
| `npm run test:resume:processor` | native 처리 5개 + bounded/unbounded scratch 검사 2개, 총 7 pass |
| `npm run test:resume:rehearsal` | 같은 Linux 앱 이미지에서 20 × 5 MiB, 각 10페이지 합성 PDF·동시 다운로드·dump/restore·공개 초기화·이전 이미지 복귀 통과 |
| lint / typecheck / build | `eslint . --ignore-pattern 'private/**'`, `npm run typecheck`, Linux Docker build 안의 `npm run build` 통과 |
| 기본 `npm run lint` | 기존 Git 제외 `private/observe-step4/{sync-docs,validate}.cjs`, `private/observe-step5/validate.cjs`의 `no-require-imports` 10건으로 실패. 기존 파일·lint 설정은 수정하지 않았고 추적 소스 검사로 분리했다. |
| 설정 | base + opt-in Compose `config --quiet`, 격리 Nginx `nginx -t` 통과 |
| 브라우저 | Edge에서 관리자 9개 화면 × 1440/390/320px 가로 넘침 없음, 키보드 이동, JavaScript OFF 9개 읽기 화면, 공개 4개 페이지의 관리 링크 비노출, pageerror 0 |

통합 검수는 Node 24.22.1을 사용했다. 처음 사용한 호스트 Node 22.14.0이 로그 없이 종료한 실행은 통과 근거에서 제외하고, 해당 실행의 Docker 자원·임시 키를 소유 이름으로 확인해 정리했다. DB 재시작 검수의 저장소는 정지 시 사라지는 tmpfs에서 재시작 가능한 일회용 익명 volume으로 바로잡았다. 검수 완료 시 그 volume도 삭제한다.

### 확인한 경계와 복구

1. 공개 host는 관리자 HTML/API/RSC와 폐기된 Queue URL에 404, 익명 관리 요청은 401, 소유자 요청은 200이다. 직접 upstream의 잘못된 Host는 403, 관리 ingress의 잘못된 authority는 404다. forwarded header로 우회하지 못하며 private/no-store/noindex를 확인했다. sitemap/feed/search/공개 Portfolio에 관리 경로가 나오지 않는다.
2. 관리 POST 7개 경로에서 Origin 없음/null/형제 origin 및 same-site/cross-site 입력을 거부했다. Brain의 원문과 공개 사본, PDF 검토·교체·철회, fake 초안, 선택 버전 발행·철회는 기존 HTTP 흐름으로 확인했다.
3. 실패 작업의 단건 재시도와 동일 명령 중복 처리, 정책 OFF에서 worker 대기, 새 worker 프로세스의 처리·재시작 후 중복 방지를 확인했다. 감사 INSERT 실패는 503이고 전체 16개 테이블 hash/행 수가 변하지 않았다.
4. DB 정지 시 안전한 오류가 나오고 재시작 뒤 자료가 유지된다. 키 교체 후 옛 키 401/새 키 200, 관리자 OFF 404에도 공개 글 200 및 DB hash가 유지된다.
5. 16개 전체 테이블을 실제 `pg_dump -Fc` / 별도 DB `pg_restore --exit-on-error`로 복구해 행 수와 hash를 대조했다. 새 PDF epoch에서는 이전 공개 명령 409와 다운로드 404를 확인했다. Brain 공개 사본·블로그 Markdown은 읽힌다.
6. 이전 이미지에서 admin/PDF OFF 상태로 공개 글을 읽고, offline PDF 공개 초기화 후 현재 이미지로 돌아와 보존된 자료를 확인했다. migration/schema를 삭제하지 않았다.

검수 이미지 ID: `sha256:7b192e33c14228f48cc2e96f39980da2e78ac9a516620acc957f6ce91adee230` (`hlog-web:admin-release`). 이전 이미지: `sha256:07f639b9fb4cc7ac0f34dd94c78b50a25a62480fefdac8503aa41a8fafd0de3e` (`hlog-web:observe-step6`). 이 값은 로컬 Docker image ID이며 운영 registry에 push한 digest가 아니다.

### PDF 자원 측정

동일 이미지·UID 1001·32 MiB tmpfs에서 최대 보관량 원본은 104,857,600 bytes, 보고서는 10,007,960 bytes였다. 합성 PDF 20개 업로드는 각각 1,141–1,206 ms, 최대 임시 공간 5,406,720 bytes, 업로드 시 web RSS 최대 313,452 KiB였다. 동시 다운로드 시 RSS는 297,248 → 365,340 KiB, 임시 파일은 0이었다. DB 증가량 119,390,208 bytes, custom dump 122,156,211 bytes / 6,762 ms, restore 2,891 ms를 기록했다. 로컬 합성 자료의 측정이며 운영 용량이나 지연을 보장하지 않는다.

내용 원문·키·env는 커밋하지 않았다. 원본 로그, 테이블 hash/행 수, 브라우저 결과와 스크린샷은 Git 제외 `private/admin-release`에 있다. 모니터링은 이번 통합 검수에서 인증/읽기 경계와 미설정 상태를 확인했으며 실제 Prometheus/alert/probe 연동 근거는 A3 Step 2 및 observability Step 6의 별도 기록을 따른다.

### 남은 일

관리자 로컬 구현·검수는 **completed 16 / pending 0 / blocked 1**이다. 모니터링은 **completed 7 / pending 0 / blocked 1**이다. 실제 운영 도메인·TLS·네트워크·자원 예산·외부 검사/알림 전달은 미검증으로 유지한다. OCI 보류를 해제하고 범위를 승인한 뒤 **operations-observability Step 7 → A3 Step 4**를 진행한다. 실제 PDF 공개, provider 호출·자동 발행·timer 활성화는 이번 검수에 포함하지 않았다.
