# Step 1 scoped-markdown-read

## 상태와 선행 조건

pending — 2026-11-06 등록한 F2의 Markdown 한 편의 조회 범위 축소 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F2 Step 0 완료.

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
- `apps/h-log/.codex/docs/harness/BLOG_LIST_EFFICIENCY_REVIEW.md`
- `apps/h-log/.codex/docs/harness/blog-list-performance-2026-11-13.json`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/app/blog-markdown/[slug]/route.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public-read-path.test.ts`
- `apps/h-log/lib/blog-public-read-path.integration.test.ts`
- `apps/h-log/lib/blog-postgres-repository.integration.test.ts`

## 범위와 산출물

Markdown 한 편의 조회 범위 축소을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 기존 slug 전용 repository/loader를 사용해 Markdown 요청이 대상 글의 현재 공개 버전과 필요한 검증 자료만 조회하도록 연결한다.
2. slug 입력, rewrite, published-current, 본문 hash, 환경별 privacy와 자산 검증 경계를 점검한다. 다른 글의 본문을 읽는 경로를 검수한다.
3. Markdown 응답 캐시의 철회/변경 일관성을 검사하고 F3 읽기 계약에 필요한 차이를 기록한다.

## 인수 기준

- 10개와 1,000개 fixture에서 대상 한 편의 조회 행 수·가공량이 제한된다. 현재 버전의 응답 바이트/hash가 기준선과 일치한다.
- 비공개/없는/철회 slug의 404, DB 실패의 기존 오류 status, private no-store와 rewrite 회귀가 통과한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-public-read-path.test.ts
npm run test:repository
npm run test:public-read-path
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

Step 0에서 남은 1,000글 Markdown/동시 8요청 p95 초과(2,597.60ms, 예산 2,399.94ms)와 한 차례의 원인 미확정 앱 종료 139를 함께 재확인한다. 원래 예산과 자원 제한을 유지하고, 중단이 발생하면 컨테이너 상태·로그·이벤트를 보존한다. 재현되지 않아도 원인이 해결됐다고 단정하지 않는다.

## 경계

- 원본·과거 버전·공개 선택·검수·감사는 기준 데이터로 보존한다. 재생성 권한은 파생 데이터에 한정한다.
- 현재 published/current-version, Brain published revision, privacy 정책, owner 인증·Origin·command revision/idempotency를 모든 새 읽기/쓰기 경로에서 검증한다.
- 성능 결과에는 fixture·환경·표본 수·cold/warm 조건을 함께 기록한다. 준비 실행·최댓값·소수 표본의 중앙값을 운영 p95로 표시하지 않는다.
- 실험 DB·파일·프로세스는 본 작업이 생성한 대상을 확인한 뒤 정리한다. 운영 적용·실제 콘텐츠 발행·OCI/DNS/TLS·provider·timer·외부 알림은 기존의 명시 승인 절차를 따른다.
- 공개 UI는 승인된 화면/상호작용을 인수 기준으로 사용한다. 질문 데이터는 작성자가 기록한 항목의 계약을 따른다.

## 다음 단계

F3 Step 0 `source-and-projection-contract`. 독립 실행 조건은 전체 계획을 따른다.
