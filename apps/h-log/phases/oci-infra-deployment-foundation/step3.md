# Step 3: backup-restore-runbook

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/deployment-ci-cd.md`
- `.codex/skills/harness/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- DB schema, migration, compose volume, backup script files

## 작업

OCI self-hosted PostgreSQL 운영을 위한 backup/restore runbook을 만든다.

- PostgreSQL logical dump를 1차 백업 방식으로 둔다.
- pgvector extension, migration version, content_hash 검증을 restore checklist에 포함한다.
- 백업 파일 보관 위치와 retention 정책을 문서화한다.
- OCI Object Storage 업로드는 선택 단계로 두고 credential은 저장하지 않는다.
- restore rehearsal은 local/test DB 또는 fixture dump로 먼저 검증한다.

## 인수 기준

```bash
npm run test
git diff --check
```

## 검증

1. local/test DB restore 절차 또는 최소한의 runbook lint를 확인한다.
2. backup output에 민감정보가 그대로 남지 않는지 확인한다.
3. DB version/hash 검증 절차가 문서화됐는지 확인한다.
4. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- 운영 DB dump를 생성하거나 저장소에 추가하지 말 것.
- OCI Object Storage credential을 저장하지 말 것.
- 복구 검증 없이 백업 성공만으로 완료 처리하지 말 것.
