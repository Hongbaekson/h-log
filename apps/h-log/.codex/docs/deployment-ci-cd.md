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

## Hermes Codex OAuth

자동 글 writer는 OpenAI Platform API key 대신 Hermes의 `openai-codex` OAuth를 사용한다.

- 실행마다 provider는 `openai-codex`, model은 `gpt-5.6-sol`로 명시한다.
- `HLOG_HERMES_COMMAND`와 `HLOG_HERMES_MODEL`은 server-local runtime 설정으로만 둔다.
- OAuth 등록은 실행 host에서 `hermes auth add openai-codex --type oauth --no-browser`로 수행하고 auth state를 저장소나 image에 복사하지 않는다.
- usage report가 `cost_status=included`, `estimated_cost_usd=0`, `api_calls=1`이 아니면 자동 글 생성을 중단한다. API key provider fallback은 두지 않는다.
- `HLOG_AUTO_PUBLISH_INPUT_FILE`은 서버 로컬의 검증된 topic/research/context JSON을 가리키며 저장소나 image에 포함하지 않는다. `npm run auto-publish:once`는 서울 날짜 advisory lock과 기존 daily post 확인 후 private `publishing` aggregate까지만 저장한다.
- `Dockerfile.auto-publish`는 공식 `nousresearch/hermes-agent:v2026.7.7.2` image에 H-Log runner만 추가한다. OAuth state는 image가 아니라 Compose `hermes_data` volume에 저장한다.
- `npm run auto-publish:cycle`은 generation 뒤 같은 `post-YYYY-MM-DD`의 required job만 required job 수 + idle probe 1회까지 처리한다. `failed`, `retrying`, 한도 초과는 non-zero로 중단한다.
- `deploy/systemd/hlog-auto-publish.timer`는 `Asia/Seoul` 매일 09:00로 packaging했지만 OCI canary/rollback 전에는 enable하지 않는다.

2026-07-22 read-only preflight에서 OCI 기준 경로에는 이전 source artifact와 Docker만 있었고 host Node/npm/Hermes, production env, scheduler는 없었다. Host에 runtime을 중복 설치하지 않고 아래 container 경계로 준비한다.

서버 로컬 `.env`에는 secret이 아니라 production env 파일 경로만 둔다.

```dotenv
HLOG_AUTO_PUBLISH_ENV_FILE=/opt/stacks/h-log/deploy/env.production
```

`deploy/env.production`에는 실제 `DATABASE_URL`, public base URL, privacy 목록과 container 내부 입력 경로를 두고 저장소에 커밋하지 않는다.

```dotenv
HLOG_AUTO_PUBLISH_INPUT_FILE=/run/secrets/hlog-auto-publish-input.json
```

서버 로컬 `compose.override.yaml`에서 검증된 입력 파일을 read-only로 mount한다. 실제 host 경로나 내용은 저장소에 기록하지 않는다.

```yaml
services:
  hlog-auto-publish:
    volumes:
      - /server-local/private/auto-publish-input.json:/run/secrets/hlog-auto-publish-input.json:ro
```

최신 artifact와 production override를 반영한 뒤 image와 OAuth volume을 준비한다.

```bash
cd /opt/stacks/h-log
docker compose --profile scheduler build hlog-auto-publish
docker compose --profile scheduler run --rm --no-deps hlog-auto-publish hermes auth add openai-codex --type oauth --no-browser
docker compose --profile scheduler run --rm --no-deps hlog-auto-publish npm run auth:preflight
```

OAuth status, backup/restore rehearsal, migration, 수동 canary와 rollback smoke가 모두 통과한 뒤에만 user timer를 연결하고 활성화한다.

```bash
systemctl --user link /opt/stacks/h-log/deploy/systemd/hlog-auto-publish.service
systemctl --user link /opt/stacks/h-log/deploy/systemd/hlog-auto-publish.timer
systemctl --user daemon-reload
systemctl --user enable --now hlog-auto-publish.timer
systemctl --user list-timers hlog-auto-publish.timer
```

로그아웃 후에도 user timer가 필요하면 운영 계정에 대한 lingering을 서버 관리자 권한으로 별도 활성화한다. OAuth/device code, production input, env 값은 timer journal에 출력하지 않는다.

## OCI Guardrails

- 서버 접속, firewall/security list 변경, 실제 compose restart는 사용자 승인 후 수행한다.
- 운영 DB에 직접 연결하는 검증은 하지 않는다. 필요하면 local/test DB 또는 dump fixture를 먼저 사용한다.
- 운영 DB 백업/복구는 `.codex/docs/backup-restore-runbook.md` 기준으로 진행하고, restore rehearsal 없이 백업 성공만으로 완료 처리하지 않는다.
- 배포 smoke와 rollback은 `.codex/docs/deploy-smoke-rollback-runbook.md` 기준으로 public route, `/blog`, `/blog/:slug`, `/blog/:slug.md`, phase-gated sitemap/feed/llms, Nginx status, container health를 확인한다.
- rollback은 이전 image tag와 migration rollback 가능 여부를 함께 확인한 뒤 실행한다.
