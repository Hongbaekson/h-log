# Step 2 transactional-projection-freshness

## 상태와 선행 조건

pending — 2026-11-06 등록한 F3의 수정·공개·철회와 파생 데이터 일치 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F3 Step 1 완료.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step에서 추가한 실제 파일·migration·계약도 수정 전에 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-editorial-actions.ts`
- `apps/h-log/lib/blog-auto-publish-runner.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-admin.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/lib/blog-job-retry.ts`
- `apps/h-log/lib/blog-editorial-actions.integration.test.ts`
- `apps/h-log/lib/brain-postgres-repository.integration.test.ts`

## 범위와 산출물

수정·공개·철회와 파생 데이터 일치을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 관리자/자동 생성 저장, 검증 뒤 공개 전이, 수정/철회, 자동 실패 숨김/rollback, Brain 공개 선택의 실제 쓰기 경로를 전수 연결한다. 원본 변경과 파생 변경 또는 durable 갱신 표식을 같은 PG transaction에 둔다.
2. 비싼 계산을 transaction 밖에서 할 때 source revision/hash를 완료 시 재검증한다. 오래된 작업과 command 재전송은 현재 선택을 덮어쓰지 못하게 한다.
3. 재생성과 작성·철회를 교차 실행하고 정책 변경, 프로세스 중단, 명령 응답 유실을 검사한다. 복구는 파생 데이터 생성 권한으로 제한하고 외부 발행/알림 동작과 분리한다.

## 인수 기준

- commit/rollback/재전송 뒤 원본과 활성 파생 버전의 일치가 보장된다. 복구 대기 중에도 현재 공개 여부를 확인한다.
- private/newer draft/withdrawn sentinel이 공개 응답과 집계에 섞이지 않는다. 기존 command fingerprint·감사·lease 회귀가 통과한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
npm run test:repository
npm run test:editorial
npm run test:worker
npm run test:brain
```

기본 gate를 실행하고 결과를 기록한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

전체 lint에 기존 Git 제외 private helper 오류가 있으면 실패 내역과 source lint를 따로 기록한다. 실패를 숨기거나 무관한 파일을 수정해 통과시키지 않는다.

## 경계

- 원본·과거 버전·공개 선택·검수·감사는 기준 데이터로 보존한다. 재생성 권한은 파생 데이터에 한정한다.
- 현재 published/current-version, Brain published revision, privacy 정책, owner 인증·Origin·command revision/idempotency를 모든 새 읽기/쓰기 경로에서 검증한다.
- 성능 결과에는 fixture·환경·표본 수·cold/warm 조건을 함께 기록한다. 준비 실행·최댓값·소수 표본의 중앙값을 운영 p95로 표시하지 않는다.
- 실험 DB·파일·프로세스는 본 작업이 생성한 대상을 확인한 뒤 정리한다. 운영 적용·실제 콘텐츠 발행·OCI/DNS/TLS·provider·timer·외부 알림은 기존의 명시 승인 절차를 따른다.
- 공개 UI는 승인된 화면/상호작용을 인수 기준으로 사용한다. 질문 데이터는 작성자가 기록한 항목의 계약을 따른다.

## 다음 단계

F3 Step 3 `projected-blog-list`.
