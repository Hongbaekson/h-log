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
4. 로컬 Docker Compose로 web, manual `--once` worker, PostgreSQL + pgvector, Redis, Nginx topology 검증
5. OCI에서 수동 배포 성공
6. Nginx, 도메인, HTTPS 확인
7. DB backup/restore와 deploy smoke/rollback 확인
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

## Server-Local Compose Directory

운영 OCI host의 H-Log Compose 기준 경로는 `/opt/stacks/h-log`다.

- `ssh oci` 후 수동 배포, smoke, rollback은 이 경로에서 실행한다.
- `/home/ubuntu/h-log`는 과거 수동 검증 경로였고, 운영 기준 경로로 사용하지 않는다.
- 서버 로컬 env, credential, backup 파일은 저장소에 복사하지 않는다.

## Local Compose

로컬 검증은 `apps/h-log`에서 실행한다.

```bash
docker compose config
docker compose up hlog-postgres hlog-redis hlog-web hlog-nginx
```

로컬 ingress는 `http://localhost:8080`만 사용한다. PostgreSQL과 Redis는 host port를 publish하지 않고 Compose `data_net`에서만 접근한다.

Worker는 자동 발행 phase 전까지 profile로만 실행한다.

```bash
docker compose --profile worker run --rm hlog-worker
```

`deploy/env.dev`는 web/worker가 읽는 placeholder-only local development 파일이다. 실제 운영 값, 서버 IP, SSH key, DB password, API key, private URL은 이 파일에 넣지 않는다. PostgreSQL 컨테이너에는 필요한 `POSTGRES_*`만 주고, OCI 운영 값은 서버 로컬 env 파일 또는 CI/CD secret으로 주입한다.

## Nginx Boundary

로컬 Nginx config는 `deploy/nginx/conf.d/hlog.conf`에 둔다.

- local: `localhost:8080 -> hlog-nginx -> hlog-web:3000`
- production: `80/443 -> hlog-nginx -> hlog-web:3000`
- `/admin`과 `/api/internal`은 인증/접근 제어가 확정될 때까지 Nginx에서 404로 막는다.
- `/blog`, `/blog/:slug`, `/blog/:slug.md`, sitemap/feed/llms crawler surface는 reverse proxy를 통과해야 한다.
- upstream은 고정된 Compose service인 `hlog-web:3000`만 사용한다. request `Host`를 그대로 넘기지 않고 upstream `Host`는 `hlog-web`으로 고정한다.
- `X-Real-IP`와 `X-Forwarded-For`는 Nginx의 `$remote_addr` 기준으로 설정한다. 앱의 PDF 다운로드 rate limit은 `X-Real-IP`를 client 식별자로 사용한다.
- 기본 public route에서는 `Upgrade`/`Connection` header를 upstream으로 전달하지 않는다. WebSocket 또는 h2c가 필요하면 별도 route 설정과 보안 검토 후 추가한다.
- TLS certificate, private key path, domain-specific `server_name`은 저장소에 고정하지 않는다.

## DB Backup/Restore

기준 runbook은 `.codex/docs/backup-restore-runbook.md`에 둔다.

- 1차 백업 방식은 PostgreSQL logical dump다.
- 로컬 검증은 `apps/h-log`의 Compose service `hlog-postgres`와 volume `postgres_data` 기준으로 한다.
- 운영 백업/복구는 명시 승인 후 `ssh oci`로 접속해 서버 로컬 경로에서 수행한다.
- 운영 dump, Object Storage credential, bucket URL, server IP, DB password는 저장소에 남기지 않는다.
- 복구 완료 기준은 dump 생성이 아니라 local/test DB restore rehearsal, `vector` extension 확인, migration version 확인, `content_hash` 검증, public smoke 확인이다.
- 현재 저장소의 `hlog-migrate` runner로 migration version을 확인하고 배포 기록에 남긴다.

## Deploy Smoke/Rollback

기준 runbook은 `.codex/docs/deploy-smoke-rollback-runbook.md`에 둔다.

- 배포 전 `npm run lint`, `npm run build`, `docker compose config`를 통과해야 한다.
- 운영 배포는 명시 승인 후 `ssh oci`로 접속해 서버 로컬 compose 디렉터리에서 수행한다.
- 배포 전에는 app git SHA, image tag, Compose config hash, server-local env 기준을 기록한다. secret 값은 기록하지 않는다.
- registry pull, `docker compose up -d`, `docker compose ps`, `docker compose logs --tail=100` 순서로 상태를 확인한다.
- local smoke는 `localhost:8080 -> hlog-nginx -> hlog-web` 경계를 기준으로 한다.
- production smoke는 같은 public route 목록을 domain만 바꿔 확인한다.
- public smoke는 `/`, `/resume`, `/portfolio`, `/blog`, `/blog/:slug`, `/blog/:slug.md`, `/admin` 차단, `/api/internal/*` 차단을 포함한다.
- `sitemap.xml`, `feed.xml`, `llms.txt`, `llms-full.txt`는 구현된 crawler route이므로 published-only 포함/제외 조건과 함께 필수 200 smoke로 확인한다.
- rollback은 이전 image tag, 이전 server-local env/Compose 설정, migration rollback 가능 여부 또는 restore rehearsal을 확인한 뒤 승인 후 실행한다.

## CI Checks

기본 CI는 다음을 실행한다.

```bash
npm ci
npm run test
npm run typecheck
npm run lint
npm run build
```

dependency나 보안 경계가 바뀌는 변경은 아래 local security check도 함께 실행한다.

```bash
npm audit --audit-level=moderate
gitleaks detect --source <source-only-temp-dir> --no-git --redact
semgrep scan --novcs --no-git-ignore --config p/owasp-top-ten --config p/secrets --timeout=60 --exclude node_modules --exclude .next --exclude tsconfig.tsbuildinfo .
```

`gitleaks`와 `semgrep`은 설치된 경우에만 실행한다. `source-only-temp-dir`는 `git ls-files`와 `git ls-files --others --exclude-standard` 결과를 복사해 만들고, generated build output인 `.next`, `node_modules`, `tsconfig.tsbuildinfo`는 제외한다. Semgrep도 필요하면 `--novcs --no-git-ignore`를 붙여 git 미추적 소스 파일까지 포함한다.

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
cd /opt/stacks/h-log
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
- 운영 DB 백업/복구는 `.codex/docs/backup-restore-runbook.md` 기준으로 진행하고, restore rehearsal 없이 백업 성공만으로 완료 처리하지 않는다.
- 배포 smoke와 rollback은 `.codex/docs/deploy-smoke-rollback-runbook.md` 기준으로 public route, `/blog`, `/blog/:slug`, `/blog/:slug.md`, phase-gated sitemap/feed/llms, Nginx status, container health를 확인한다.
- rollback은 이전 image tag와 migration rollback 가능 여부를 함께 확인한 뒤 실행한다.
