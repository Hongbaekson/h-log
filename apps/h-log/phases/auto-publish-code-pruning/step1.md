# Step 1: remove-auto-publish-memory-mirror

## 읽을 파일

- `apps/h-log/AGENTS.md`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- `apps/h-log/lib/blog-auto-publish-runner.ts`
- 위 두 모듈의 focused test
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/phases/index.json`

## 작업

Production이 소비하지 않는 daily generation의 mutable `state/store` mirror를 제거한다. Pipeline은 검증된 private `publishing` aggregate를 persistence callback에 한 번 넘기고 `post/status/version`만 반환한다.

## 인수 기준

- `DailyAutoArticlePipelineState`, state factory, result `store`가 제거된다.
- post/source/tag/version, publish job, generation run, usage event의 test-only mirror를 유지하지 않는다.
- 중복 daily run은 runner advisory lock과 PostgreSQL post existence query가 계속 소유한다.
- durable usage ledger, privacy scan, generated slug existence query, private aggregate persistence는 유지된다.
- OCI, domain, DNS/TLS, production env, privacy production 목록, timer는 변경하지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-daily-auto-article.test.ts lib/blog-auto-publish-runner.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 변경 전 focused test를 특성화 기준으로 통과시킨다.
2. mutable mirror와 mirror 전용 assertion만 삭제하고 focused test를 다시 통과시킨다.
3. 기본 앱 gate와 phase JSON parse, diff/status를 확인한다.

## 완료 결과

- 특성화: 변경 전 focused test 11/11이 통과했다.
- 구현: pipeline `state/store` 계약과 durable write 뒤의 mutable mirror를 제거했다.
- 소유권: 같은 날 중복은 runner lock/PostgreSQL 조회, 사용량은 durable ledger, 공개 전이는 persistent worker가 계속 소유한다.
- 검증: 변경 후 focused 10/10, 전체 unit 192개 중 180 pass/12 DB skip, typecheck, lint, production build, phase JSON parse, `git diff --check`가 통과했다.
- 운영 경계: OCI, domain, DNS/TLS, production env, privacy production 목록, timer는 변경하지 않았다.

## 하지 말 것

- 삭제한 state를 다른 cache나 class로 대체하지 말 것. Reason: durable 경계가 이미 실제 상태를 소유한다.
- privacy scan, input validation, usage ledger를 단순화하지 말 것. Reason: 외부 입력과 비용/개인정보 trust boundary다.
- pending Step 2-6 코드를 함께 삭제하지 말 것. Reason: 각 step 시작 시 live caller를 다시 확인해야 한다.
