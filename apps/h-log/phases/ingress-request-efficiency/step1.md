# Step 1 minimize-ingress-access-logs

검색어와 식별자가 접근 로그에 남는 범위를 줄인다. C0과 독립 실행한다. 보존 정책 결정은 로컬 제안과 운영 적용을 구분한다.

## 읽을 파일

앱 디렉터리를 기준으로 한다. [검토 근거와 실행 순서](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md), [PRD](../../.codex/docs/harness/PRD.md), [ADR](../../.codex/docs/harness/ADR.md), [아키텍처](../../.codex/docs/harness/ARCHITECTURE.md), [워크플로](../../.codex/docs/harness/WORKFLOW.md), [실행 루프](../../.codex/docs/harness/AGENT_LOOP.md), [구현 계획](../../.codex/docs/harness/IMPLEMENTATION_PLAN.md)을 함께 읽는다.

- `AGENTS.md`
- `../../AGENTS.md`
- `../../.codex/skills/harness/SKILL.md`
- `deploy/nginx/conf.d/hlog.conf`
- `deploy/admin/admin.nginx.conf.example`
- `deploy/admin/compose.example.yaml`
- `deploy/observability/gateway.conf`
- `compose.yaml`
- `.codex/docs/harness/ADMIN_ACCESS_CONTRACT.md`
- `deploy/observability/README.md`

## 작업

공개·관리자 ingress에서 필요한 최소 필드(상태·지연 등)와 진단 용도를 정한다. 합성 query/경로/주소/referrer를 사용해 기본 포맷의 기록 여부를 확인하고 최소 포맷 또는 기존 로그 비활성 방식 중 용도에 맞는 것을 적용한다. 접근 로그와 오류 로그를 별개로 점검하고, 남는 진단 정보와 로컬 회전 상한을 문서화한다.

## 인수 기준

정상·거부·없는 경로의 합성 요청 후 공개/관리자 access log에서 검색어·query·개인 식별자·referrer·인증 문자열이 0건이다. 보존하기로 한 상태·지연은 읽을 수 있어야 한다. stderr에 남는 오류 맥락도 별도 기록한다. gateway의 기존 비공개 설정과 공개 404 검증을 통과한다.

## 검증

앱 디렉터리에서 실행한다. Compose 명령은 격리된 로컬 테스트 프로젝트를 지정한 세션에서 수행한다.

```sh
docker compose config --quiet
# 합성 요청 직후 해당 테스트 컨테이너의 로그만 사용한다.
docker compose logs --no-color hlog-nginx
```

검증 결과와 남은 제한을 이 phase의 `index.json`에 기록한다.

## 하지 말 것

실제 운영 로그나 키를 테스트에 쓰지 않는다. 민감한 값의 재수집 없이 표식으로 검증할 수 있다.
