# Step 0: production-generation-handoff-only

## 읽을 파일

- `apps/h-log/AGENTS.md`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- `apps/h-log/lib/blog-auto-publish-runner.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/scripts/blog-auto-publish.mjs`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/phases/index.json`

## 작업

Generation pipeline을 실제 production 경로 하나로 줄인다. Pipeline은 생성 결과를 private `publishing` aggregate와 queued required jobs로 저장하고 종료하며, required job/retry/public 전이는 persistent worker만 담당한다. 생성 slug는 저장 전에 PostgreSQL 존재 여부를 한 번 조회해 unique constraint 실패 대신 기존 quality gate로 거부한다.

## 인수 기준

- Test-only inline required job, retry, direct `published` 전이 코드와 관련 상태가 제거된다.
- Persistence callback은 필수이며 성공 결과는 항상 private `publishing`이다.
- 이미 저장된 slug는 aggregate persistence 전에 `generation_failed`로 차단된다.
- 같은 서울 날짜의 결정적 post ID/advisory lock, privacy scan, usage budget, persistent worker 공개 검증은 유지된다.
- OCI, domain, DNS/TLS, production env, timer는 변경하지 않는다.

```bash
npm run test:integration
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. 저장된 slug에도 pipeline이 `publishing`을 반환하는 focused RED를 확인한다.
2. Inline publish/retry 경로 삭제 후 focused unit test를 통과시킨다.
3. PostgreSQL integration과 기본 앱 gate를 실행한다.
4. diff와 phase registry를 확인하고 완료 상태를 갱신한다.

## 완료 결과

- RED: 이미 저장된 slug에도 pipeline이 `publishing`을 반환하고 persistence를 호출하는 실패를 확인했다.
- 구현: test-only inline required job/retry/public 전이와 관련 상태를 삭제하고 private `publishing` persistence를 필수 경로로 만들었다.
- slug gate: 생성 결과의 slug를 PostgreSQL unique index 대상에 단일 existence query로 확인하고 persistence 전에 기존 duplicate quality gate로 거부한다.
- 검증: focused 11/11, PostgreSQL integration 13/13, 전체 unit 193개 중 181 pass/12 DB skip, typecheck, lint, production build가 통과했다.
- 운영 경계: OCI, domain, DNS/TLS, production env, privacy production 목록, timer는 변경하지 않았다.

## 하지 말 것

- Generation과 worker를 한 process 책임으로 합치지 말 것. Reason: private 상태 검증과 durable retry 소유권을 유지해야 한다.
- slug 전체 목록을 메모리로 읽지 말 것. Reason: indexed existence query 하나면 충분하다.
- OCI, HTTPS origin, privacy production 목록, timer를 활성화하지 말 것. Reason: `auto-publish-ops-hardening / Step 4`의 별도 승인 경계다.
