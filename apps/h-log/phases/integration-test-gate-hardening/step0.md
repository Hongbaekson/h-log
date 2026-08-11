# Step 0: aggregate-db-integration-and-ci-gate

## 읽을 파일

- `apps/h-log/AGENTS.md`
- `apps/h-log/package.json`
- `apps/h-log/compose.yaml`
- `apps/h-log/Dockerfile`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/phases/index.json`

## 작업

기존 PostgreSQL migration/repository/public-read/worker/dry-run 통합 테스트를 하나의 fail-fast 명령으로 묶고 GitHub Actions에서 기본 앱 검증과 함께 실행한다.

## 인수 기준

- `DATABASE_URL`이 없으면 통합 테스트 명령은 성공으로 오인되지 않고 즉시 실패한다.
- 기존 PostgreSQL 통합 테스트 5종이 하나의 명령으로 순서대로 실행된다.
- CI는 임시 pgvector 서비스에서 unit, integration, typecheck, lint, build를 검증한다.
- 새 runtime service, dependency, production secret, 배포 단계는 추가하지 않는다.

```bash
npm run test:integration
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. aggregate script와 workflow 부재를 RED로 확인한다.
2. `DATABASE_URL` 없는 aggregate script가 fail-fast하는지 확인한다.
3. local Compose PostgreSQL에서 aggregate integration gate를 실행한다.
4. 기본 앱 검증과 workflow/phase 형식 검사를 실행한다.
5. phase index status와 summary를 갱신한다.

## 완료 결과

- RED: `npm run test:integration` script와 `.github/workflows/h-log.yml` 부재를 확인했다.
- fail-fast: `DATABASE_URL` 없이 aggregate command가 exit code 1과 명시적 오류로 종료됐다.
- PostgreSQL: 기존 5개 integration command의 13개 test가 local Compose pgvector에서 모두 통과했다.
- 기본 gate: unit test 193개 중 181개 통과/12개 DB skip, typecheck, lint, build가 통과했다.
- 운영 경계: production domain, OCI, timer, secret, runtime service는 변경하지 않았다.

## 하지 말 것

- 별도 CI 전용 Compose service나 test runner를 추가하지 말 것. Reason: 기존 pgvector image와 npm scripts로 충분하다.
- OCI, domain, DNS/TLS, production env, timer를 변경하지 말 것. Reason: production activation은 별도 승인 경계다.
