# Step 0 fix-static-cache-and-headers

정적 파일 성공·실패의 캐시와 보안 헤더를 바로잡는다. 로컬 NGINX 1.30.7 digest를 기준으로 독립 실행한다.

## 읽을 파일

앱 디렉터리를 기준으로 한다. [검토 근거와 실행 순서](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md), [PRD](../../.codex/docs/harness/PRD.md), [ADR](../../.codex/docs/harness/ADR.md), [아키텍처](../../.codex/docs/harness/ARCHITECTURE.md), [워크플로](../../.codex/docs/harness/WORKFLOW.md), [실행 루프](../../.codex/docs/harness/AGENT_LOOP.md), [구현 계획](../../.codex/docs/harness/IMPLEMENTATION_PLAN.md)을 함께 읽는다.

- `AGENTS.md`
- `../../AGENTS.md`
- `../../.codex/skills/harness/SKILL.md`
- `deploy/nginx/conf.d/hlog.conf`
- `compose.yaml`
- `Dockerfile`
- `scripts/observability-stack.test.mjs`
- `.codex/docs/deploy-smoke-rollback-runbook.md`

## 작업

고정 이미지와 합성 upstream으로 정적 200/304/404/5xx를 대조한다. 정상 해시 자산에만 장기 재사용이 적용되고 실패 응답에는 장기/immutable 값이 남지 않게 한다. NGINX의 헤더 상속과 Next upstream의 Cache-Control을 함께 검사하고 중복·상충 지시를 제거한다.

## 인수 기준

nginx -t 성공. 실제 production 번들의 정적 파일은 유효한 장기 캐시, 누락 파일·upstream 오류는 장기 캐시 없음. 200/304/404/5xx에 의도한 nosniff·frame·referrer·permissions 정책이 유지된다. 같은 URL의 합성 404→200 회복, 공개 /admin·/api/internal 404, 관리자 no-store도 확인한다.

## 검증

앱 디렉터리에서 실행한다. Compose 명령은 격리된 로컬 테스트 프로젝트를 지정한 세션에서 수행한다.

```sh
docker compose config --quiet
# 실행 중인 격리 프로젝트에서 확인한다.
docker compose exec -T hlog-nginx nginx -t
```

검증 결과와 남은 제한을 이 phase의 `index.json`에 기록한다.

## 하지 말 것

전체 경로에 immutable을 적용하지 않는다. 관리자 응답이나 철회된 글을 오래 보관하게 될 수 있다.
