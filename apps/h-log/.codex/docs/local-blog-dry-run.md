# H-Log Local Blog Dry-Run

이 문서는 외부 provider, scheduler, OCI, production domain을 사용하지 않고 local Compose에서 DB 발행 vertical slice를 재현하는 절차다. 고정된 fake topic과 두 개의 local 전용 post ID만 사용한다.

## 실행

`apps/h-log`에서 실행한다.

```bash
docker compose --profile dry-run run --rm --build hlog-dry-run
```

이 명령은 migration을 적용하고 다음 경로를 한 번에 검증한다.

1. 성공/실패 aggregate와 current version을 PostgreSQL에 저장한다.
2. manual persistent worker가 required job을 처리한다.
3. 모든 required job이 성공한 글만 `published`로 전환한다.
4. Nginx를 통해 성공 글 HTML과 Markdown이 200인지 확인한다.
5. sitemap, feed, llms, llms-full에 성공 slug만 포함되는지 확인한다.
6. required 실패 글이 `failed_publish`이고 public detail이 404인지 확인한다.

## 기대 결과

- 성공: `local-dry-run-success`, `published`, required job `succeeded`
- 실패: `local-dry-run-failure`, `failed_publish`, required job `failed`
- 실패 메시지: `fake required provider failed`
- 성공 글의 `post_versions.content_hash`와 public/crawler read source가 동일하다.
- 관련 없는 `queued` 또는 `retrying` job이 있으면 dry-run은 실행을 거부한다.

고정 ID의 이전 dry-run 레코드는 다음 실행 시 먼저 삭제되므로 재실행할 수 있다. 다른 post와 job은 삭제하거나 처리하지 않는다.

## 2026-07-13 실행 기록

위 Compose 명령은 exit code 0으로 완료됐다. 성공 글은 HTML, Markdown, sitemap, feed, llms, llms-full 검증을 통과했고 실패 글은 404 및 crawler 제외를 유지했다. 이 결과는 local runtime 완료 근거이며 production 자동 발행 활성화 근거는 아니다.
