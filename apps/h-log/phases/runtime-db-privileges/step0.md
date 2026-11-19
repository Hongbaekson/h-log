# Step 0 define-runtime-database-grants

DB 소유자와 런타임 권한을 분리한다. 새로 만든 로컬 PG16+pgvector에서 독립 실행한다.

## 읽을 파일

앱 디렉터리를 기준으로 한다. [검토 근거와 실행 순서](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md), [PRD](../../.codex/docs/harness/PRD.md), [ADR](../../.codex/docs/harness/ADR.md), [아키텍처](../../.codex/docs/harness/ARCHITECTURE.md), [워크플로](../../.codex/docs/harness/WORKFLOW.md), [실행 루프](../../.codex/docs/harness/AGENT_LOOP.md), [구현 계획](../../.codex/docs/harness/IMPLEMENTATION_PLAN.md)을 함께 읽는다.

- `AGENTS.md`
- `../../AGENTS.md`
- `../../.codex/skills/harness/SKILL.md`
- `../../.codex/skills/tdd/SKILL.md`
- `deploy/env.dev`
- `deploy/postgres.env.dev`
- `compose.yaml`
- `scripts/blog-migrations.mjs`
- `migrations/001_blog_core.sql`
- `migrations/015_public_read_freshness.sql`
- `lib/blog-postgres-repository.ts`
- `lib/public-read-rebuild.ts`
- `deploy/observability/database-roles.sql`

## 작업

앱·worker·migrator·projection 재생성·복구가 실제 사용하는 SQL을 표로 만든다. 우선 평상시 앱 연결과 schema/extension 관리 연결을 분리할 최소 역할과 권한을 정한다. 트리거, sequence, 신규 migration의 권한 승계와 모니터링 전용 역할도 검사한다. 앱 내부의 관리자 기능에 필요한 쓰기는 보존한다.

## 인수 기준

새 DB에서 런타임 역할의 superuser/createdb/createrole은 false이며 DB·schema·업무 테이블 소유자가 아니다. DDL·권한 부여가 거부되고 공개 조회·관리자 명령·worker·receipt·projection freshness가 정상이다. 초기화/upgrade 시 extension·migration은 지정 역할로 성공한다. 각 명령 전 접속 DB와 소유한 fixture를 확인한다.

## 검증

앱 디렉터리에서 실행한다. 동작 변경은 해당 경로의 실패하는 회귀 검사를 먼저 확인한다.

```sh
# 격리 DB에서 실제 역할별 접속을 사용한다.
npm run db:migrate
npm run test:integration
npm run test:projection:db
```

DB 명령은 CI workflow와 각 `scripts/*integration.test.mjs`의 fixture·opt-in을 먼저 확인한다. `test:projection:db`에는 `HLOG_PROJECTION_TEST=1`과 소유 확인된 테스트 DB를 사용한다. fixture 관리자와 검증할 런타임 역할을 구분해 실행한다.

검증 결과와 남은 제한을 이 phase의 `index.json`에 기록한다.

## 하지 말 것

통합 테스트 도구의 fixture 생성·TRUNCATE 권한을 앱 역할에 주지 않는다. 준비 계정과 실제 요청 계정을 분리해 검증한다.
