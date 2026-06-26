# H-Log PostgreSQL Backup/Restore Runbook

이 문서는 OCI self-hosted PostgreSQL + pgvector 운영을 위한 백업/복구 기준이다. 현재 저장소에는 실제 DB adapter, migration runner, 운영 DB 연결이 없으므로 이 runbook은 운영 DB를 직접 조작하지 않고 로컬/테스트 DB 리허설을 먼저 강제하는 절차로 둔다.

## 범위

- 대상 DB: Compose service `hlog-postgres`
- 대상 volume: Compose volume `postgres_data`
- 대상 image: `pgvector/pgvector:pg16`
- 기본 방식: PostgreSQL logical dump
- 운영 접속: 명시 승인 후 `ssh oci`
- 제외: 운영 DB dump 생성, 운영 credential 저장, 서버 IP/SSH key/API key 문서화

## 백업 정책

1차 백업은 `pg_dump --format=custom`으로 만든 logical dump다. 초기 단계에서는 DB volume snapshot을 주 백업으로 보지 않는다. snapshot은 장애 복구 시간을 줄이는 보조 수단으로만 검토한다.

권장 시점:

- 수동 발행 데이터가 생긴 뒤 1일 1회
- migration 적용 전
- 배포 rollback 가능성을 판단해야 하는 변경 전
- 자동 발행 worker를 켜기 전

권장 보관:

- 운영 서버 로컬 보관: 최근 7일 daily, 최근 4주 weekly
- 장기 보관: OCI Object Storage 선택 검토
- Object Storage credential, bucket URL, namespace, access key는 저장소에 쓰지 않는다.
- 백업 파일은 저장소 밖에 둔다. 로컬 실수 방지를 위해 root `.gitignore`는 `backups/`, `*.dump`, `*.dump.gz`, `*.backup`을 제외한다.

파일명 규칙:

```text
hlog-postgres-YYYYMMDDTHHMMSSZ-<git-sha>-pg16.dump
```

파일명에는 서버 IP, 계정명, private host, DB password를 넣지 않는다.

## 로컬 백업 명령 예시

아래 명령은 `apps/h-log`에서 실행한다. 운영 DB가 아니라 로컬 Compose DB 기준이다.

```bash
mkdir -p ../.local/hlog-backups
docker compose up -d hlog-postgres
docker compose exec -T hlog-postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > ../.local/hlog-backups/hlog-postgres-local-$(date -u +%Y%m%dT%H%M%SZ)-pg16.dump
```

PowerShell에서는 timestamp와 redirection 구문을 셸에 맞게 바꾼다. 백업 파일은 repo 밖 또는 git ignore 대상 경로에 둔다.

## 운영 백업 절차

운영 백업은 사용자 승인 후에만 진행한다.

```bash
ssh oci
cd <server-local-hlog-compose-dir>
mkdir -p <server-local-backup-dir>
docker compose exec -T hlog-postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > <server-local-backup-dir>/hlog-postgres-$(date -u +%Y%m%dT%H%M%SZ)-<git-sha>-pg16.dump
```

주의:

- 운영 dump를 저장소로 복사하지 않는다.
- dump를 채팅이나 issue에 첨부하지 않는다.
- 명령 출력에 password, token, cookie, private URL이 찍히면 공유 전 제거한다.
- `PGPASSWORD`를 명령줄 인자로 쓰지 않는다. 운영 secret은 서버 로컬 env 또는 Compose secret 경계에서만 주입한다.

## 복구 리허설 절차

복구 완료 기준은 dump 파일 생성이 아니라 새 DB에 복구한 뒤 핵심 검증을 통과하는 것이다. 운영 복구 전에는 로컬 또는 테스트 Compose project에서 먼저 리허설한다.

```bash
docker compose -p hlog_restore_rehearsal up -d hlog-postgres
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl' < <dump-file>
```

리허설 후에는 아래 확인을 수행한다.

```bash
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select extname, extversion from pg_extension where extname = '\''vector'\'';"'
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) from posts;"'
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) from post_versions where content_hash is null or content_hash = '\'''\'';"'
```

현재는 migration runner가 없으므로 migration version 검증은 "미구현"으로 기록한다. migration 도구가 추가되면 해당 도구의 version table을 restore checklist에 추가한다.

## 복구 체크리스트

- `vector` extension이 존재한다.
- migration version table이 최신 배포와 일치한다. 현재 단계에서는 migration runner가 없으므로 적용 불가로 기록한다.
- `posts.current_version_id`가 `post_versions.id`를 가리킨다.
- `published` 상태가 아닌 글이 public route 대상 쿼리에 포함되지 않는다.
- `post_versions.content_hash`가 비어 있지 않다.
- 앱의 content hash 검증 로직과 DB 데이터가 일치한다. 현재 contract는 `lib/blog-content-model.ts`의 `assertPostVersionContentHashMatches`다.
- `/blog`, `/blog/:slug`, `/blog/:slug.md` smoke가 200을 반환한다.
- `/admin`과 `/api/internal`은 인증/접근 제어 확정 전까지 public ingress에서 막힌다.
- 복구 리허설 결과, dump filename, app git SHA, image tag, Compose config hash를 운영 노트에 남긴다. 운영 노트에는 secret을 쓰지 않는다.

## 실패 시 처리

- `pg_restore` 실패: dump 파일, PostgreSQL major version, extension 상태를 먼저 확인한다.
- `vector` extension 누락: DB image가 `pgvector/pgvector:pg16`인지 확인하고 extension 생성 migration을 재확인한다.
- migration version 불일치: 앱을 기동하지 말고 migration/rollback 가능 여부를 먼저 판단한다.
- content hash mismatch: public route를 열지 말고 DB dump와 app commit 조합을 확인한다.
- public smoke 실패: Step 4 `deploy-smoke-rollback-runbook` 기준으로 rollback 여부를 판단한다.

## 보안 기준

- 운영 dump는 개인정보와 내부 작성 흔적을 포함할 수 있으므로 public artifact로 취급하지 않는다.
- Object Storage 업로드는 server-local credential 또는 CI/CD secret으로만 수행한다.
- bucket, namespace, credential, signed URL은 저장소에 남기지 않는다.
- 백업/복구 로그는 token, cookie, DB password, private URL을 제거한 뒤 공유한다.
- production backup, restore, compose restart는 명시 승인 없이 실행하지 않는다.
