# Step 2 remove-home-render-from-healthcheck

헬스체크가 홈과 DB를 매번 조회하는 비용을 없앤다. F4–F7과 독립 실행한다. 공개 사용자 경로를 측정하는 기존 blackbox probe는 유지한다.

## 읽을 파일

앱 디렉터리를 기준으로 한다. [검토 근거와 실행 순서](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md), [PRD](../../.codex/docs/harness/PRD.md), [ADR](../../.codex/docs/harness/ADR.md), [아키텍처](../../.codex/docs/harness/ARCHITECTURE.md), [워크플로](../../.codex/docs/harness/WORKFLOW.md), [실행 루프](../../.codex/docs/harness/AGENT_LOOP.md), [구현 계획](../../.codex/docs/harness/IMPLEMENTATION_PLAN.md)을 함께 읽는다.

- `AGENTS.md`
- `../../AGENTS.md`
- `../../.codex/skills/harness/SKILL.md`
- `../../.codex/skills/tdd/SKILL.md`
- `compose.yaml`
- `app/page.tsx`
- `components/blog/HomeRecentPosts.tsx`
- `lib/public-blog-list.ts`
- `lib/blog-public-source.ts`
- `deploy/observability/probes/host-db-http.yml`
- `.codex/docs/deploy-smoke-rollback-runbook.md`

## 작업

앱 프로세스가 HTTP를 받을 수 있다는 상태와 DB/실사용 페이지의 가용성 신호를 구분한다. 기존 경량 HTTP 응답을 먼저 검토하고 필요할 때만 내부 전용 경로를 만든다. 같은 컨테이너와 합성 DB에서 기존 홈 probe와 후보를 같은 횟수로 호출해 SQL 수·응답 크기·시간·재기동 뒤 healthy 전환을 비교한다.

## 인수 기준

정상 probe 1회당 업무 SQL 0건, 홈 렌더 0회이고 기존 5초 timeout 안에 응답한다. web 정지/재기동에 따라 health 상태가 바뀌고 DB 중단 시 실제 DB/공개 페이지 장애 신호는 별도 경로에서 관측된다. 공개·관리자 차단, NGINX 기동 순서, 외부 공개 정보의 범위를 유지한다.

## 검증

앱 디렉터리에서 실행한다. 동작 변경은 해당 경로의 실패하는 회귀 검사를 먼저 확인한다. Compose 명령은 격리된 로컬 테스트 프로젝트를 지정한 세션에서 수행한다.

```sh
docker compose config --quiet
# 격리 프로젝트에서 반복 전후의 상태와 DB 통계를 비교한다.
docker compose ps
npm run test && npm run typecheck && npm run lint && npm run build
```

검증 결과와 남은 제한을 이 phase의 `index.json`에 기록한다.

## 하지 말 것

헬스체크를 단순 프로세스 존재 검사로 대체하지 않는다. NGINX의 depends_on은 앱의 HTTP 응답 가능 여부에 의존한다.
