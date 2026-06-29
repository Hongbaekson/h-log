# Step 3: backup-restore-deploy-smoke

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `apps/h-log/.codex/docs/backup-restore-runbook.md`
- `apps/h-log/.codex/docs/deploy-smoke-rollback-runbook.md`
- `apps/h-log/phases/oci-server-runtime-setup/step0.md`

## 작업

승인 후 운영 배포 smoke와 backup/restore rehearsal 기준을 확인한다.

- backup 성공만으로 완료 처리하지 않고 local/test restore rehearsal을 확인한다.
- `vector` extension, migration version 적용 가능 여부, `content_hash`, public smoke를 함께 확인한다.
- rollback은 이전 image tag, server-local env, migration rollback 가능 여부를 확인한 뒤 승인 후 실행한다.
- smoke 결과에는 secret, server IP, private host, signed URL을 남기지 않는다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
docker compose config
```

## 검증

1. local/test restore rehearsal 기준을 충족한다.
2. deploy smoke가 public route와 Nginx blocking route를 모두 확인한다.
3. rollback checkpoint가 준비되어 있는지 확인한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- Do not treat a production dump file as a repo artifact. Reason: it can contain unpublished content and personal data.
- Do not execute rollback without explicit approval. Reason: rollback can affect live service and data compatibility.
