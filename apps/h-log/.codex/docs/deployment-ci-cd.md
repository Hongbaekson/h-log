# Deployment and CI/CD

이 문서는 배포 작업을 할 때만 읽는다.

## Target Flow

```text
Local development
  -> Git push
  -> CI lint/build
  -> Docker image build
  -> Registry push
  -> OCI SSH deploy
  -> Docker Compose restart
  -> Nginx reverse proxy
```

## Recommended Order

1. 로컬 MVP 개발
2. 로컬 `npm run lint`와 `npm run build` 통과
3. Dockerfile과 compose 작성
4. OCI에서 수동 배포 성공
5. Nginx, 도메인, HTTPS 확인
6. CI/CD 자동화 추가

처음부터 CI/CD까지 한 번에 구현하지 않는다.

## Runtime

- Next.js standalone output 사용
- 앱 컨테이너는 내부 포트 `3000`
- Nginx가 외부 `80/443`에서 앱 컨테이너로 reverse proxy
- DB는 MVP에서 제외

## CI Checks

기본 CI는 다음을 실행한다.

```bash
npm ci
npm run lint
npm run build
```

typecheck 스크립트를 추가한 뒤에는 CI에 포함한다.

## CD Strategy

권장:

- CI에서 Docker image build
- registry에 push
- OCI에 SSH 접속
- compose 파일이 있는 디렉터리에서 pull/up

예상 명령:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

## Secrets

CI/CD secret으로만 관리한다.

- OCI SSH host
- OCI SSH user
- SSH private key
- registry token
- domain-specific env vars

저장소에 secret, server IP, API key를 커밋하지 않는다.
