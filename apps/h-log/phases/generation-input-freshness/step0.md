# Step 0: reject-stale-research-before-generation

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/scripts/blog-auto-publish.mjs`
- `apps/h-log/lib/blog-auto-publish-runner.ts`
- `apps/h-log/lib/blog-daily-auto-article.ts`
- `apps/h-log/lib/blog-daily-auto-article.test.ts`
- `apps/h-log/lib/blog-topic-research.ts`

## 작업

기존 research source의 `fetchedAt`을 실행 시각 `runAt`과 비교한다. 모든 자료가 실행 시각 이전 24시간 이내여야 하며 양 끝 경계는 포함한다. 만료·미래·잘못된 시각은 사용량 조회/기록, LLM 호출, slug 조회, 글 저장 전에 실패시킨다. 오류에는 배열 위치와 필드명만 포함하고 자료의 식별자·URL·본문·원래 시각은 넣지 않는다.

- 공통 daily pipeline에 검증을 두어 one-shot runner와 직접 호출 경로에 함께 적용한다.
- 날짜가 바뀌어도 경과 시간으로 판단하고, 시간대가 다른 동일 시각은 같게 취급한다.
- 기존 일일 중복 확인과 lock 해제, 빈 주제의 `no_topic`, 공개 전 quality/privacy/claim gate를 유지한다.
- 이 단계는 연구 자료를 다시 수집/확인한 시각의 유효기간을 검사한다. 기사 발행일, topic 수집 시각, 개인 맥락 갱신일의 최신성이나 실제 원문 수집을 보장하지 않는다.

## 인수 기준

`apps/h-log`에서 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-daily-auto-article.test.ts lib/blog-auto-publish-runner.test.ts lib/blog-auto-publish-cycle.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
```

격리 local PostgreSQL로 `npm run test:integration`을 실행한다. Phase JSON parser와 `git diff --check`도 통과해야 한다.

## 검증

1. 만료된 자료가 생성으로 진행하는 focused RED를 확인한다.
2. 최소 검증을 추가한 뒤 같은 test의 GREEN을 확인한다.
3. 24시간 경계, 미래/잘못된 시각, 신선한 자료와 만료 자료 혼합, 날짜/시간대 경계를 검증한다.
4. fake provider를 통한 정상 private `publishing` handoff와 차단 시 side effect가 없음을 확인한다.
5. 검증 결과와 남은 수집기 연결 작업을 phase 및 관련 문서에 기록한다.

## 하지 말 것

- 새 timestamp 필드·DB schema·설정 knob를 추가하지 말 것. 기존 `fetchedAt`과 `runAt`이면 이 단계의 검증에 충분하다.
- 실제 HTTP 수집, Hermes 실행, OCI, DNS/TLS, 운영 timer를 활성화하지 말 것. 이번 범위는 로컬 최신성 검증이며 OCI 보류는 유지한다.
- 날짜만 현재로 바꿔 만료 입력을 통과시키지 말 것. 실제 자료를 다시 수집/확인한 시각을 기록해야 한다.

## 완료 기록 (2026-10-01)

- RED: 만료·미래·잘못된 `fetchedAt`이 통과하고 잘못된 `runAt`이 usage 조회까지 진행하는 focused test 4개가 기대한 이유로 실패했다.
- GREEN: 기존 daily pipeline에 24시간 검증을 추가했다. 혼합 자료 중 하나라도 유효하지 않으면 side effect 없이 실패하며 오류에 원래 값을 포함하지 않는다.
- 검증: focused 21/21, 전체 unit 156 pass/12 DB environment skip, 격리 local PostgreSQL integration 13/13, lint, typecheck, build 통과. 임시 DB는 메모리 저장소를 사용했고 검증 후 정리했다.
- 다음 로컬 작업 후보: 수집/원문 확인 결과를 기존 topic/research/context 입력에 연결한다. 실제 HTTP 수집과 persona/humanize 연결은 아직 구현하지 않았다.
- 운영 경계: CLI의 기존 일일 중복 확인과 advisory lock은 freshness 검사 전에 실행한다. 검사 실패는 runner의 `finally`로 lock을 해제하고 cycle의 required worker 실행 전에 전파된다. OCI 보류는 유지한다.
