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
4. 로컬 Docker Compose로 web, manual `--once` worker, PostgreSQL + pgvector, Nginx topology 검증
5. OCI에서 수동 배포 성공
6. Nginx, 도메인, HTTPS 확인
7. DB backup/restore와 deploy smoke/rollback 확인
8. CI/CD 자동화 추가

처음부터 CI/CD까지 한 번에 구현하지 않는다.

## Terraform 전환 계획

2026-09-22 결정: 앞으로 클라우드 자원은 Terraform으로 관리한다. 현재는 계획 단계이며 `.tf` 코드, OCI inventory, remote state, import/apply는 아직 실행하지 않았다. 실행 단위는 [`terraform-infrastructure-adoption`](../../phases/terraform-infrastructure-adoption/index.json)에 둔다. 기존 public surface 정리의 다음 Step 1은 그대로 유지한다.

### 관리 범위

- OCI Compute, 연결된 boot/block volume, VNIC/IP, network/security 자원 중 H-Log 소유로 확인한 것만 관리한다. 먼저 실제 DB 데이터가 어느 disk/volume에 있는지 확인한다.
- 공유 VCN/subnet/IAM 등은 별도 소유권 합의 없이 import하거나 수정하지 않는다. 필요한 값은 data source 또는 비공개 입력으로 참조한다.
- DNS는 도메인과 DNS provider가 정해진 뒤 해당 provider의 지원 범위에서 추가한다. 아직 provider나 zone을 가정하지 않는다.
- Compose/Nginx/systemd 설정, 앱 image 배포, DB migration/backup, OAuth/secret 주입은 기존 배포 절차에 남긴다. Terraform provisioner로 배포나 timer 활성화를 실행하지 않는다.

### 전환 순서와 검증

1. **Inventory**: 승인된 read-only 조회로 대상 compartment와 자원을 좁혀 소유권, 의존성, import ID/resource address 매핑을 확인한다. 기존 다른 state가 관리하는 자원은 중복 편입하지 않는다. 식별자와 원본 export는 비공개로 보관한다.
2. **코드화**: 확인된 자원만 `apps/h-log/infra/terraform/`의 작은 root module로 작성한다. Terraform CLI/provider의 지원 버전을 확인해 constraints와 `.terraform.lock.hcl`을 고정하고 `terraform fmt -check -recursive`, `terraform init -backend=false`, `terraform validate`를 검증한다. 이 단계의 init은 provider 설치만 허용하며 OCI 조회나 state 연결은 하지 않는다.
3. **승인된 편입**: private backend 준비와 import/state 변경을 별도로 승인받는다. 사전 backup과 복구 경로를 확인하고, 검토한 import만 실행한다. 편입 plan에 기존 자원 create/update/delete/replace가 있으면 중단한다. Import 후 `terraform plan -detailed-exitcode`의 exit 0으로 변경 없음을 확인한다. Exit 1은 오류, exit 2는 차이이므로 완료로 처리하지 않는다.
4. **이후 변경**: 고정 commit으로 만든 plan에서 비용, 네트워크 공개 범위, 교체/삭제와 DB disk 영향을 검토한다. 승인받은 저장 plan만 apply하고 재조회/plan으로 결과를 확인한다. Drift 확인이 곧 자동 수정 승인은 아니며 PR/push만으로 production apply하지 않는다.

### State와 보안

- 기본안은 OCI Object Storage의 native `oci` backend다. 전용 private bucket, state locking, bucket versioning, 최소 IAM 권한과 복구 절차를 준비한다.
- Backend bucket/IAM bootstrap은 별도 승인과 별도 state로 관리한다. 아직 없는 bucket을 그 bucket에 의존하는 root에서 만들려고 하지 않는다.
- `.terraform/`, `*.tfstate*`, 저장 plan, 실제 tfvars/backend 설정은 Git/공개 artifact에서 제외한다. Placeholder example과 provider lockfile만 커밋한다. CI에 OCI credential 없이 fmt/validate부터 연결한다.
- Credential은 환경변수 또는 저장소 밖 OCI 설정으로 주입한다. State/plan에도 민감값이 남을 수 있으므로 접근·보관을 제한하고 plan 원문을 공개 log/comment에 올리지 않는다. DB password/OAuth/TLS private key는 Terraform 입력으로 옮기지 않는다.
- 잠금 충돌은 원인을 확인하고 중단한다. `-lock=false`, 확인 없는 force-unlock, state 삭제나 `ignore_changes`로 차이를 숨기지 않는다.

공식 지원 확인(2026-09-22): [OCI resource discovery](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/guides/resource_discovery.html), [Terraform import](https://developer.hashicorp.com/terraform/cli/import), [OCI backend와 locking/versioning](https://developer.hashicorp.com/terraform/language/backend/oci). 실제 자원별 import 지원과 CLI/provider 호환 버전은 Step 0-1에서 다시 확인한다.

## Runtime

- Next.js standalone output 사용
- 앱 컨테이너는 내부 포트 `3000`
- Nginx가 외부 `80/443`에서 앱 컨테이너로 reverse proxy
- PostgreSQL + pgvector는 DB-backed blog부터 필요하다
- Redis Compose service는 confirmed-unused removal 이후 두지 않는다. 다시 도입하려면 실제 consumer와 별도 phase를 먼저 정한다.
- worker는 자동 발행 phase 전까지 비활성 또는 수동 실행 가능하게 둔다
- PostgreSQL은 public internet에 노출하지 않는다

## Reproducible Release Inputs

외부 production base image는 tag와 immutable multi-architecture manifest digest를 함께 고정한다. 2026-08-07에 아래 명령으로 read-only Docker Hub manifest를 확인했다.

```bash
docker buildx imagetools inspect <image:tag>
```

| 용도 | 고정 reference | 확인된 platform |
| --- | --- | --- |
| Next.js build/job/runtime | `node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43` | `linux/amd64`, `linux/arm64` |
| Nginx ingress | `nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10` | `linux/amd64`, `linux/arm64` |
| PostgreSQL + pgvector | `pgvector/pgvector:pg16@sha256:a36250871de0833b8757561c72f2477ef1ddd1101afa4e617fb552e0de514c6b` | `linux/amd64`, `linux/arm64` |
| Hermes auto-publish | `nousresearch/hermes-agent:v2026.7.7.2@sha256:9c841866021c54c4596849f6135717e8a4d52ba510b7f52c50aef1de1a283973` | `linux/amd64`, `linux/arm64` |

`hlog-*:dev`는 local `build` 산출 이름이므로 upstream release input이 아니다. 실제 OCI release는 server-local release note에 app registry `image@sha256`, git SHA, 위 base-image 목록, target platform과 이전 전체 `image@sha256` 목록을 함께 남긴다. digest 변경은 이 manifest 기록을 source artifact로 삼고, 이전 목록을 rollback reference로 보존한다. 아직 OCI platform을 override하거나 image를 pull/restart하지 않는다.

## Server-Local Compose Directory

운영 OCI host의 H-Log Compose 기준 경로는 `/opt/stacks/h-log`다.

- `ssh oci` 후 수동 배포, smoke, rollback은 이 경로에서 실행한다.
- `/home/ubuntu/h-log`는 과거 수동 검증 경로였고, 운영 기준 경로로 사용하지 않는다.
- 서버 로컬 env, credential, backup 파일은 저장소에 복사하지 않는다.

## Local Compose

로컬 검증은 `apps/h-log`에서 실행한다.

```bash
docker compose config
docker compose up hlog-postgres hlog-web hlog-nginx
```

로컬 ingress는 `http://localhost:8080`만 사용한다. PostgreSQL과 Redis는 host port를 publish하지 않고 Compose `data_net`에서만 접근한다.

Worker는 `worker` profile의 manual `--once` 실행으로 둔다. `hlog-worker`는 image CMD를 사용하며 internal `app_net`/`data_net`만 사용해 PostgreSQL과 내부 Nginx에 접근한다. Host port와 outbound network는 없고, `egress_net`은 Hermes OAuth writer가 사용하는 `hlog-auto-publish`에만 연결한다.

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
npm run test:integration
npm run typecheck
npm run lint
npm run build
```

`.github/workflows/h-log.yml`은 임시 pgvector PostgreSQL service에만 `DATABASE_URL`을 주입해 통합 테스트를 실행한다. 로컬에서는 기존 `hlog-migrate` image를 재사용한다.

```bash
docker compose --profile tools run --rm --build hlog-migrate npm run test:integration
```

dependency나 보안 경계가 바뀌는 변경은 아래 local security check도 함께 실행한다.

```bash
# 사용자 명시 승인 후에만 실행: registry에 dependency metadata를 보낸다.
npm audit --audit-level=moderate
gitleaks detect --source <source-only-temp-dir> --no-git --redact
semgrep scan --novcs --no-git-ignore --config p/owasp-top-ten --config p/secrets --timeout=60 --exclude node_modules --exclude .next --exclude tsconfig.tsbuildinfo .
```

`gitleaks`와 `semgrep`은 설치된 경우에만 실행한다. `source-only-temp-dir`는 `git ls-files`와 `git ls-files --others --exclude-standard` 결과를 복사해 만들고, generated build output인 `.next`, `node_modules`, `tsconfig.tsbuildinfo`는 제외한다. Semgrep도 필요하면 `--novcs --no-git-ignore`를 붙여 git 미추적 소스 파일까지 포함한다.

`npm audit`은 registry에 dependency metadata를 보내므로 사용자 명시 승인 후에만 실행한다. `release-input-hardening / Step 1`의 2026-08-07 검토는 `npm ls --package-lock-only --omit=dev --all`과 lockfile v3의 production package 69개 `resolved`/`integrity` 확인만 수행했다. `npm audit --omit=dev`는 실행하지 않았으며, 이전 phase에 기록된 audit 0건을 현재 결과로 주장하지 않는다. 승인 후에는 실행 날짜, 정확한 command, exit code와 `--omit=dev` 결과를 release note에 남긴다.

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
- LLM, embedding, IndexNow, Discord provider token

저장소에 secret, server IP, API key를 커밋하지 않는다.

## Hermes Codex OAuth

자동 글 writer는 OpenAI Platform API key 대신 Hermes의 `openai-codex` OAuth를 사용한다.

- 실행마다 provider는 `openai-codex`, model은 `gpt-5.6-sol`로 코드에서 고정하며 environment/factory override를 제공하지 않는다.
- Custom Hermes executable이 필요할 때만 server-local `HLOG_HERMES_COMMAND`를 override하고 model 설정은 두지 않는다.
- Writer는 `--safe-mode --toolsets context_engine`으로 실행해 user config/rules/plugins/MCP와 web/other tool capability를 차단한다.
- OAuth 등록은 실행 host에서 `hermes auth add openai-codex --type oauth --no-browser`로 수행하고 auth state를 저장소나 image에 복사하지 않는다.
- usage report가 `cost_status=included`, `estimated_cost_usd=0`, `api_calls=1`이 아니면 자동 글 생성을 중단한다. API key provider fallback은 두지 않는다.
- `HLOG_AUTO_PUBLISH_INPUT_FILE`은 서버 로컬의 검증된 topic/research/context JSON을 가리키며 저장소나 image에 포함하지 않는다. `npm run auto-publish:once`는 서울 날짜 advisory lock과 기존 daily post 확인 후 private `publishing` aggregate까지만 저장한다.
- `Dockerfile.auto-publish`는 공식 `nousresearch/hermes-agent:v2026.7.7.2@sha256:9c841866021c54c4596849f6135717e8a4d52ba510b7f52c50aef1de1a283973` image에 H-Log runner만 추가하며 cycle CMD와 `HERMES_HOME=/opt/data` 기본값을 소유한다. Compose/systemd는 이를 반복하지 않고, OAuth state는 image가 아니라 Compose `hermes_data` volume에 저장한다.
- `npm run auto-publish:cycle`은 generation 뒤 같은 `post-YYYY-MM-DD`의 required job만 required job 수 + idle probe 1회까지 처리한다. `failed`, `retrying`, 한도 초과는 non-zero로 중단한다.
- `deploy/systemd/hlog-auto-publish.service`는 explicit container-local OAuth preflight 뒤 image CMD를 실행한다. `deploy/systemd/hlog-auto-publish.timer`는 `Asia/Seoul` 매일 09:00로 packaging했지만 OCI canary/rollback 전에는 enable하지 않는다.

2026-07-22 read-only preflight에서 OCI 기준 경로에는 이전 source artifact와 Docker만 있었고 host Node/npm/Hermes, production env, scheduler는 없었다. Host에 runtime을 중복 설치하지 않고 아래 container 경계로 준비한다.

서버 로컬 `.env`에는 secret이 아니라 production env 파일 경로만 둔다.

```dotenv
HLOG_RUNTIME_ENV_FILE=/opt/stacks/h-log/deploy/env.production
HLOG_POSTGRES_ENV_FILE=/opt/stacks/h-log/deploy/postgres.env.production
HLOG_AUTO_PUBLISH_ENV_FILE=/opt/stacks/h-log/deploy/env.production
```

`deploy/env.production`에는 실제 `DATABASE_URL`, public base URL, privacy 목록과 container 내부 입력 경로를 두고 저장소에 커밋하지 않는다. PostgreSQL container에는 application env를 넘기지 않고 `deploy/postgres.env.production`의 `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`만 주입한다.

- `HLOG_PUBLIC_BASE_URL`은 sitemap/feed/llms에 기록할 실제 HTTPS canonical origin이다.
- `HLOG_WORKER_PUBLIC_BASE_URL`은 container가 Nginx를 확인할 내부 fetch origin이다. Worker는 내부 origin으로 요청하되 sitemap에는 canonical origin이 있는지 검증한다.
- Timer 활성화 전 `HLOG_PRIVACY_ORGANIZATION_NAMES`, `HLOG_PRIVACY_PRIVATE_REPOSITORIES`를 실제 차단 대상의 JSON string array로 설정한다. localhost canonical 또는 확인되지 않은 빈 목록을 scheduled production 값으로 사용하지 않는다.

```dotenv
HLOG_AUTO_PUBLISH_INPUT_FILE=/run/secrets/hlog-auto-publish-input.json
```

서버 로컬 `compose.override.yaml`에서 검증된 입력 파일을 read-only로 mount한다. 실제 host 경로나 내용은 저장소에 기록하지 않는다.

공식 Hermes image의 runtime user는 UID `10000`이다. Host/container UID가 다르면 mode `600` 파일이 `EACCES`로 실패하므로 입력 파일은 UID `10000` 소유 + mode `600`으로 두고, container에서 readable이면서 not writable인지 확인한다. Env/DB secret 파일은 application container에 bind mount하지 않고 Compose `env_file` 경계로만 주입한다.

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

OAuth status, backup/restore rehearsal, migration, 수동 canary와 rollback smoke가 모두 통과하고 실제 HTTPS canonical origin 및 privacy 목록이 설정된 뒤에만 user timer를 연결하고 활성화한다.

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
