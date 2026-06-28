# H-Log Deploy Smoke and Rollback Runbook

이 문서는 OCI self-hosted Docker Compose 배포 후 smoke와 rollback 판단 기준이다. 실제 OCI 접속, `docker compose up -d`, restart, rollback 실행은 사용자 승인 후에만 수행한다.

## 범위

- 대상 runtime: `hlog-nginx`, `hlog-web`, `hlog-postgres`, `hlog-redis`
- local ingress: `http://localhost:8080`
- production ingress: Nginx 80/443
- app image: Next.js standalone image
- 제외: 운영 서버 IP, SSH key path, secret, production env 값 문서화

현재 저장소에는 실제 DB adapter, migration runner, `sitemap.xml`, `feed.xml`, `llms.txt`, `llms-full.txt` route가 없다. 이 항목들은 phase-gated smoke로 두고, 해당 route가 구현되는 phase부터 200과 published-only 포함 여부를 필수 확인으로 승격한다.

## 배포 전 확인

`apps/h-log`에서 아래를 통과한 artifact만 배포 대상으로 본다.

```bash
npm run lint
npm run build
docker compose config
```

배포 기록에는 아래 값만 남긴다.

- git SHA
- image tag
- Compose config hash 또는 변경 요약
- migration 포함 여부
- smoke 결과
- rollback 기준 image tag

기록에 서버 IP, DB password, API key, private URL, SSH key path를 남기지 않는다.

## Local Smoke

운영 배포 전 같은 Compose boundary를 로컬에서 먼저 확인한다.

```bash
docker compose up -d hlog-postgres hlog-redis hlog-web hlog-nginx
docker compose ps
docker compose logs --tail=100 hlog-web hlog-nginx
```

현재 구현된 public route는 200을 기대한다.

```bash
curl -fsS http://localhost:8080/
curl -fsS http://localhost:8080/resume
curl -fsS http://localhost:8080/portfolio
curl -fsS http://localhost:8080/projects
curl -fsS http://localhost:8080/blog
curl -fsS http://localhost:8080/blog/db-first-public-boundary
curl -fsS http://localhost:8080/blog/db-first-public-boundary.md
curl -fsS http://localhost:8080/blog/oci-compose-deployment-checklist
curl -fsS http://localhost:8080/blog/oci-compose-deployment-checklist.md
```

Nginx가 아직 public admin surface를 막는지 확인한다.

```bash
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/admin)" = "404"
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/internal/smoke)" = "404"
```

PostgreSQL과 Redis는 host port를 publish하지 않아야 한다.

```bash
docker compose exec -T hlog-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose exec -T hlog-redis redis-cli ping
docker compose port hlog-postgres 5432
docker compose port hlog-redis 6379
```

`docker compose port`가 PostgreSQL 또는 Redis host port를 반환하면 배포를 멈춘다.

## Phase-Gated Public Smoke

아래 route는 관련 phase에서 구현된 뒤 배포 smoke의 필수 항목이 된다.

| Route | 현재 상태 | 필수 확인 |
| --- | --- | --- |
| `/sitemap.xml` | not implemented | published 글 URL만 포함 |
| `/feed.xml` | not implemented | published 최신 version만 포함 |
| `/llms.txt` | not implemented | 공개 가능한 요약과 URL만 포함 |
| `/llms-full.txt` | not implemented | 원문 전체 snapshot, secret, private URL 제외 |
| `/api/search` | not implemented | rate limit, cache, published-only 결과 |

구현 전에는 404를 정상으로 기록한다. 구현 후 404, 비공개 글 노출, content hash mismatch가 있으면 배포 실패로 본다.

## OCI Manual Deploy

아래 절차는 사용자 승인을 받은 뒤에만 실행한다.

```bash
ssh oci
cd <server-local-hlog-compose-dir>
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 hlog-web hlog-nginx
```

운영 배포 중에도 secret 값이 출력되면 공유 전 제거한다. 서버 로컬 env 파일과 Compose override는 저장소에 복사하지 않는다.

## Production Smoke

production smoke는 domain만 바꾸고 local smoke와 같은 route boundary를 확인한다.

```bash
curl -fsS https://<public-domain>/
curl -fsS https://<public-domain>/resume
curl -fsS https://<public-domain>/portfolio
curl -fsS https://<public-domain>/projects
curl -fsS https://<public-domain>/blog
curl -fsS https://<public-domain>/blog/db-first-public-boundary
curl -fsS https://<public-domain>/blog/db-first-public-boundary.md
```

운영 노트에는 domain별 private 설정, 서버 IP, credential을 쓰지 않는다.

## Migration Gate

DB migration이 포함된 배포는 `docker compose up -d` 전에 rollback 가능 여부를 먼저 판단한다.

- 현재 저장소에는 migration runner가 없으므로 migration check는 "not applicable"로 기록한다.
- migration이 추가되면 배포 전 backup/restore rehearsal을 통과해야 한다.
- destructive migration, data rewrite, `content_hash` 재계산은 rollback 불가 가능성이 있으므로 별도 승인 없이는 진행하지 않는다.
- rollback 불가 migration이면 app image rollback만으로 복구 가능하다고 기록하지 않는다.

## Rollback

rollback 기준은 이전 image tag와 이전 server-local env/Compose 설정이다. rollback 실행도 사용자 승인 후에만 수행한다.

```bash
ssh oci
cd <server-local-hlog-compose-dir>
docker compose ps
docker compose logs --tail=100 hlog-web hlog-nginx
```

rollback 전 판단한다.

- 이전 image tag가 남아 있는가?
- DB migration이 없거나 되돌릴 수 있는가?
- `posts.current_version_id`, `post_versions.content_hash`, published-only public route 조건이 유지되는가?
- 실패가 app image 문제인지, env/secret/Nginx/DB 상태 문제인지 분리했는가?

rollback 후에는 production smoke를 다시 실행한다. smoke가 계속 실패하면 public publish job, IndexNow, Discord 알림, 자동 발행 worker를 진행하지 않는다.

## 실패 처리

- web healthcheck 실패: `hlog-web` logs, image tag, env_file 주입 여부를 확인한다.
- Nginx 502/504: `hlog-web:3000` upstream, `hlog-web` health, Nginx config mount를 확인한다.
- public blog 404: published fixture 또는 DB selector가 `status=published` 최신 version만 읽는지 확인한다.
- Markdown endpoint 실패: `content_hash` mismatch와 `renderCrawlerMarkdownForPostVersion` 경계를 확인한다.
- private route 200: 즉시 배포 실패로 보고 `/admin`과 `/api/internal` Nginx 차단을 복구한다.
- migration mismatch: 앱을 계속 올리지 말고 backup/restore runbook 기준으로 복구 판단을 먼저 한다.

## 완료 기준

- container health가 정상이다.
- `/`, `/resume`, `/portfolio`, `/blog`, published blog detail, `.md` endpoint smoke가 통과했다.
- `/admin`과 `/api/internal`이 public ingress에서 404다.
- PostgreSQL과 Redis host port가 publish되지 않았다.
- phase-gated crawler route는 구현 상태에 맞게 200 또는 expected 404로 기록했다.
- rollback image tag와 migration 판단 결과가 운영 노트에 남아 있다.
