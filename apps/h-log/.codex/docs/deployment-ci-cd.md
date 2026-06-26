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
3. DB-backed blog의 local contract와 migration strategy 확정
4. Dockerfile과 compose 작성
5. OCI에서 수동 배포 성공
6. Nginx, 도메인, HTTPS 확인
7. DB backup/restore와 rollback smoke 확인
8. CI/CD 자동화 추가

처음부터 CI/CD까지 한 번에 구현하지 않는다.

## Runtime

- Next.js standalone output 사용
- 앱 컨테이너는 내부 포트 `3000`
- Nginx가 외부 `80/443`에서 앱 컨테이너로 reverse proxy
- PostgreSQL + pgvector는 DB-backed blog부터 필요하다
- Redis는 worker queue/cache/search cost guard가 필요한 phase에서 추가한다
- worker는 자동 발행 phase 전까지 비활성 또는 수동 실행 가능하게 둔다
- DB/Redis는 public internet에 노출하지 않는다

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

## OCI SSH Access

기본 OCI 접속 명령은 아래 alias를 사용한다.

```bash
ssh oci
```

OCI 접속이나 수동 배포 확인이 필요한 작업에서 사용자가 별도 접속 명령을 다시 지정하지 않으면 이 alias를 기본값으로 본다. 서버 IP, SSH key 경로, 계정 상세는 저장소에 기록하지 않는다.

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
- PostgreSQL password
- Redis password 또는 internal auth 설정
- LLM, embedding, IndexNow, Discord provider token

저장소에 secret, server IP, API key를 커밋하지 않는다.

## OCI Guardrails

- 서버 접속, firewall/security list 변경, 실제 compose restart는 사용자 승인 후 수행한다.
- 운영 DB에 직접 연결하는 검증은 하지 않는다. 필요하면 local/test DB 또는 dump fixture를 먼저 사용한다.
- 배포 smoke는 public route, `/blog`, `/blog/:slug`, `/blog/:slug.md`, sitemap/feed/llms, Nginx status, container health를 확인한다.
- rollback은 이전 image tag와 migration rollback 가능 여부를 함께 확인한 뒤 실행한다.
