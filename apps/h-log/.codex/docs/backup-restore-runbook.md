# H-Log PostgreSQL Backup/Restore Runbook

이 문서는 OCI self-hosted PostgreSQL + pgvector 운영을 위한 백업/복구 기준이다. 저장소에는 PostgreSQL repository와 migration runner가 있다. 이 runbook은 운영 DB를 직접 조작하지 않고 로컬/테스트 DB 리허설을 먼저 요구한다.

## 범위

2026-10-26 [PDF 계약](harness/RESUME_PDF_CONTRACT.md)의 A4는 PDF 바이트/검사 보고서/공개 포인터/감사 receipt를 같은 PostgreSQL backup 범위에 두도록 확정했다. A4 Step 1에서 migration 007의 `resume_pdf_versions`(불변 bytea/보고서)·`resume_pdf_state`·감사 receipt를 구현하고 격리 DB upgrade/재시작·원자적 rollback을 검증했다. A4 Step 3에서 최대 원본 100 MiB의 실제 custom dump와 별도 DB restore를 수행해 파일 SHA-256·버전·포인터·감사 이력과 최대 보관 예산을 확인했다. 과거 backup의 공개 포인터가 철회된 PDF를 다시 노출하지 않도록 복구 환경의 PDF 공개 게이트를 먼저 닫고 dump 밖의 새 publication epoch를 발급한다. 구 포인터와 epoch가 달라 새 다운로드가 404인지 확인한 뒤, 포인터를 감사와 함께 해제하고 현재 파일을 재검토·명시적으로 공개한다. 원본 최대 100 MiB/검사 보고서 10 MiB, PDF DB 증분 256 MiB/custom dump 증분 200 MiB·보관 여유 3 GiB의 예산은 [Step 3](../../phases/admin-resume-pdf/step3.md)에서 실측했다. 실제 개인 PDF나 dump는 저장소·검수 로그에 포함하지 않는다.

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

## 수동 백업·격리 복구 신호

Step 4의 [수동 실행 절차](../../deploy/observability/README.md#step-4-수동-백업복구-검증)를 사용한다. `pg_dump` 종료·파일 fsync·크기/PGDMP 형식·목록 검사를 마쳐야 backup 성공이다. Restore 성공은 별도의 일회용 tmpfs DB에 복원하고 migration/vector·본문/PDF hash·실제 공개/비공개 HTTP와 PDF 새 epoch/reset을 모두 확인한 결과다. 기존 DB/volume을 복원 대상으로 지정할 수 없다.

파일은 저장소 밖 제한된 디렉터리의 새 이름으로 생성한다. 기존 파일을 덮어쓰지 않으며 실패한 이번 파일만 제거한다. PowerShell 텍스트 redirection을 사용하지 않고 Node binary stream을 사용한다. 별도 백업 scheduler·보관 삭제 작업은 아직 없고 초기 기대 상태는 disabled다.

승인된 schedule이 생기면 첫 백업 26시간·첫 복구 검증 24시간 안에 성공이 필요하다. 이후에는 최근 백업 성공+26시간, 최근 복구 성공+30일을 deadline으로 쓴다. 최대 24시간 정비 후에는 각각 26시간/24시간 안에 새 성공을 확인한다. 수집 실패/누락·never와 비활성은 구분하며 알림은 다음 Step 5에서 연결한다. 수동 성공이 있어도 schedule 활성화를 뜻하지 않는다.

복구 명령의 label은 `hlog.restore-rehearsal=1`, 기본 PGDATA는 tmpfs, published DB port는 loopback이어야 한다. 전체 checkout의 의존성과 `npm run build` 결과가 필요하다. 새 DB만 생성/삭제하며 원본 DB에는 쓰지 않는다. SIGKILL/전원 차단 뒤에는 해당 실행의 `hlog_restore_` DB와 loopback Next 프로세스 소유 여부를 확인해 수동 정리한다. 기존 자원이나 운영 DB를 이름 패턴만으로 삭제하지 않는다.

## 운영 백업 절차

운영 백업은 사용자 승인 후에만 진행한다.

```bash
ssh oci
cd /opt/stacks/h-log
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

주의: 운영 서버에서 같은 Compose 파일을 다른 project 이름으로 재사용하는 복구 리허설은 named volume 재사용 여부를 먼저 확인하지 않으면 live volume을 건드릴 수 있다. 서버에서 리허설할 때는 production volume을 mount하지 않는 임시 `pgvector/pgvector:pg16` 컨테이너를 사용하거나, volume 이름이 완전히 분리된 것이 확인된 테스트 환경만 사용한다.

```bash
docker compose -p hlog_restore_rehearsal up -d hlog-postgres
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl' < <dump-file>
```

리허설 후에는 아래 확인을 수행한다.

```bash
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select extname, extversion from pg_extension where extname = '\''vector'\'';"'
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select version, applied_at from schema_migrations order by version;"'
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) from posts;"'
docker compose -p hlog_restore_rehearsal exec -T hlog-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) from post_versions where content_hash is null or content_hash = '\'''\'';"'
```

현재 app image의 migration version은 `schema_migrations`에서 확인한다. 첫 local schema version은 `001_blog_core`이며, app image에 포함된 migration과 복구 DB의 current version이 다르면 앱을 기동하지 않는다.

## 복구 체크리스트

- `vector` extension이 존재한다.
- `schema_migrations`의 current version이 app image의 최신 migration과 일치한다.
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

## PDF가 포함된 복구의 공개 초기화 — A4 완료 절차

1. 모든 PDF reader/writer web을 중지하고 공개/관리 ingress를 닫는다. 복구 대상 환경의 HLOG_RESUME_PDF_ENABLED=0, HLOG_RESUME_PDF_PUBLICATION_EPOCH 비움을 확인한다. 셸의 환경값만 변경해서 이미 실행 중인 web도 닫혔다고 가정하지 않는다.
2. 원래 DB/volume을 보존하고 명확히 분리된 빈 DB에 pg_restore --exit-on-error로 복구한다. 007 migration과 image를 대조한다. bytes의 SHA-256·byte_size·page_count, inspection/정책/도구, 메모/시각, state와 admin_actions를 dump 기준과 비교한다. 원문·보고서·키를 공개 로그에 출력하지 않는다.
3. web을 계속 중지한 채 아래 SQL로 revision만 읽고 새 UUID를 생성한다. 같은 명령을 재시도할 때는 UUID와 expected revision을 그대로 사용한다. revision_conflict면 현재 상태를 다시 확인하며 임의 값을 올려 덮어쓰지 않는다.

```sql
select revision from resume_pdf_state where id = 1;
```

복구 DB의 DATABASE_URL을 비공개 환경으로 주입한 관리 셸에서 실행한다. Node와 앱 의존성이 있는 해당 commit의 migrations image 또는 관리 checkout을 사용한다. 명령은 새 서버 endpoint를 열지 않는다.

```bash
HLOG_RESUME_PDF_ENABLED=0 HLOG_RESUME_PDF_PUBLICATION_EPOCH= \
  node --no-warnings --experimental-strip-types scripts/resume-pdf-recovery.mjs \
  --command-id "$RESET_COMMAND_ID" --expected-revision "$RESTORED_REVISION"
```

4. 반환 receipt와 DB에서 포인터/검토 필드 null, revision 증가, resume_recovery_reset 감사 한 건을 확인한다. 도구는 현재 셸의 공개 설정만 검사하므로 web 중지/ingress 차단은 운영자가 별도로 확인해야 한다.
5. dump와 이전 운영 환경에서 복사하지 않은 새 publication epoch UUID를 비공개 설정에 보관한다. 새 image와 필수 tmpfs, 정확한 관리자 HTTPS/Host/Origin으로 재기동한다. 초기 GET/HEAD/옛 ETag/Range PDF 요청이 모두 404인지 확인한다. 예전 공개 명령/receipt를 재전송해도 공개 상태가 복원되면 안 된다.
6. 현재 의도에 맞는 버전만 전 페이지·검사 보고서·메타데이터/링크/숨은 내용까지 다시 검토하고 새 명령 UUID로 공개한다. 다운로드 SHA-256이 검토본과 같고 no-store인지 확인한다. 재공개할 의사가 없으면 포인터를 비운 채 둔다.

일반 앱 재시작은 기존 epoch를 유지한다. 백업 복구나 공개 게이트를 되살리는 재개 절차는 새 epoch를 사용한다. 예전 epoch를 재사용하면 철회했던 dump 포인터가 다시 유효해질 수 있다. 기본 복구 예시의 drop/clean은 명시적인 일회용 DB에만 적용하고 기존 운영 DB/volume에 복사 실행하지 않는다.

관리자 키 분실/회전은 기존 SSH 관리 경로에서 모든 web의 owner 키를 교체하고 오래된 키의 401을 확인한다. 키 교체가 PDF 공개 해제를 뜻하지 않으므로 PDF 철회가 필요하면 ingress를 먼저 차단하고 위 reset 절차로 별도 처리한다. 복구 검증과 실제 파일 공개는 운영 승인 범위와 구분한다.
