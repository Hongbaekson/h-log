# Step 0 exclude-local-deployment-inputs

Docker 빌드 입력에서 운영 설정을 제외한다. 독립 실행. 운영 설정 파일을 놓는 디렉터리에서 새 이미지를 만들기 전에 우선한다.

## 읽을 파일

앱 디렉터리를 기준으로 한다. [검토 근거와 실행 순서](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md), [PRD](../../.codex/docs/harness/PRD.md), [ADR](../../.codex/docs/harness/ADR.md), [아키텍처](../../.codex/docs/harness/ARCHITECTURE.md), [워크플로](../../.codex/docs/harness/WORKFLOW.md), [실행 루프](../../.codex/docs/harness/AGENT_LOOP.md), [구현 계획](../../.codex/docs/harness/IMPLEMENTATION_PLAN.md)을 함께 읽는다.

- `AGENTS.md`
- `../../AGENTS.md`
- `../../.codex/skills/harness/SKILL.md`
- `.dockerignore`
- `../../.gitignore`
- `Dockerfile`
- `Dockerfile.auto-publish`
- `compose.yaml`
- `.codex/docs/deployment-ci-cd.md`

## 작업

빈 임시 디렉터리에 현재 제외 규칙을 복사하고, 운영 env 두 경로·Compose override·백업·private 파일을 합성 표식으로 만든다. 개발 예제 파일을 양성 대조군으로 둔다. scratch의 COPY와 로컬 출력으로 빌드 컨텍스트 경계를 확인한 뒤 실제 문서 경로를 제외하는 최소 규칙을 추가한다. 서버 설정 파일은 런타임의 env_file로만 주입한다.

## 인수 기준

같은 fixture에서 수정 전 두 운영 env가 보이고, 수정 후 운영 env·override·백업·private 표식이 모두 0개여야 한다. 필요한 개발 예제와 앱 빌드 입력은 남아야 한다. Dockerfile별 별도 ignore 파일이 있다면 같은 결과를 확인한다.

## 검증

앱 디렉터리에서 실행한다. Compose 명령은 격리된 로컬 테스트 프로젝트를 지정한 세션에서 수행한다.

```sh
docker compose --profile tools config --quiet
# 합성 fixture 루트에서 실행. Dockerfile은 FROM scratch와 COPY . /context/만 사용한다.
docker buildx build --network none --output type=local,dest=../result .
```

검증 결과와 남은 제한을 이 phase의 `index.json`에 기록한다.

2026-11-20 완료. 앱 디렉터리에서 `node --test scripts/docker-build-context.test.mjs`로 두 Dockerfile 이름과 해당 제외 규칙을 검증할 수 있다. 임시 디렉터리에는 합성 파일과 저장소의 제외 규칙만 복사한다.

## 하지 말 것

실제 서버 디렉터리를 테스트 입력으로 사용하지 않는다. 제외 규칙 검증 자체가 비밀을 빌더 캐시에 남길 수 있다.
