# Step 1 wire-runtime-and-migration-credentials

Compose와 릴리스 절차에 분리한 계정을 연결한다. B0의 역할별 성공·거부 표가 먼저 통과해야 한다.

## 읽을 파일

앱 디렉터리를 기준으로 한다. [검토 근거와 실행 순서](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md), [PRD](../../.codex/docs/harness/PRD.md), [ADR](../../.codex/docs/harness/ADR.md), [아키텍처](../../.codex/docs/harness/ARCHITECTURE.md), [워크플로](../../.codex/docs/harness/WORKFLOW.md), [실행 루프](../../.codex/docs/harness/AGENT_LOOP.md), [구현 계획](../../.codex/docs/harness/IMPLEMENTATION_PLAN.md)을 함께 읽는다.

- `AGENTS.md`
- `../../AGENTS.md`
- `../../.codex/skills/harness/SKILL.md`
- `compose.yaml`
- `deploy/env.dev`
- `deploy/postgres.env.dev`
- `deploy/systemd/hlog-auto-publish.service`
- `scripts/blog-migrations.mjs`
- `deploy/observability/database-roles.sql`
- `.codex/docs/deployment-ci-cd.md`
- `.codex/docs/backup-restore-runbook.md`
- `../../.github/workflows/h-log.yml`

## 작업

web·worker·scheduler와 migrate/복구에서 각각 어느 접속 정보를 받는지 명시한다. 기본 개발 Compose에서도 실행자에게 bootstrap 암호가 전달되지 않게 한다. 과거 기본 계정이 이미 데이터 소유자인 경우 기존 volume을 복제한 합성 DB에서 권한 부여 → 앱 전환 → 확인 → 이전 과권한 연결 회수 순서와 실패 시 복귀 지점을 검증한다.

## 인수 기준

렌더링한 기본·worker·scheduler·tools profile의 계정 매핑을 비밀번호 출력 없이 확인한다. 빈 DB와 기존 데이터 fixture 모두에서 B0의 권한 표, 발행·철회·복구·원본 hash가 통과한다. 이전 앱 호환 및 rollback 절차에는 평상시 앱 계정과 관리 자격 증명의 사용 지점을 구분한다.

## 검증

앱 디렉터리에서 실행한다. Compose 명령은 격리된 로컬 테스트 프로젝트를 지정한 세션에서 수행한다.

```sh
docker compose --profile tools --profile worker --profile scheduler config --quiet
npm run test:integration
npm run test:projection:db
```

DB 명령은 CI workflow와 각 `scripts/*integration.test.mjs`의 fixture·opt-in을 먼저 확인한다. `test:projection:db`에는 `HLOG_PROJECTION_TEST=1`과 소유 확인된 테스트 DB를 사용한다. fixture 관리자와 검증할 런타임 역할을 구분해 실행한다.

검증 결과와 남은 제한을 이 phase의 `index.json`에 기록한다.

## 하지 말 것

기존 volume을 초기화하거나 운영 계정을 회전하지 않는다. 이 step은 데이터가 있는 설치의 로컬 전환 가능성을 확인한다.
