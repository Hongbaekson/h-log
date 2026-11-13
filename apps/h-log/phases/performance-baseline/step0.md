# Step 0 reproducible-performance-baseline

## 상태와 선행 조건

completed — 2026-11-13 반복 가능한 격리 측정기와 두 번의 전체 기준선·비교 예산을 검증했다. [결과](../../.codex/docs/harness/PERFORMANCE_BASELINE_REVIEW.md)를 따른다.

R1–R5 완료 후 성능 트랙 F1을 완료했다. F 1 completed/21 pending이다.

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
- `apps/h-log/package.json`
- `apps/h-log/Dockerfile`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/brain-layout.ts`
- `apps/h-log/components/brain/BrainScene.tsx`
- `apps/h-log/scripts/brain-discovery.browser-check.mjs`
- `apps/h-log/.codex/docs/harness/SEO_RELEASE_REVIEW.md`

## 범위와 산출물

반복 가능한 측정과 성능 예산을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. Git 제외 분석용 측정기의 합성 자료·측정 방법을 검토하고 scripts/performance-baseline.mjs --local 명령을 마련한다. loopback 격리 자원 생성/정리와 입력 fixture를 소유하며 private 원자료가 없어도 실행되게 한다.
2. 글 10/100/500/1,000개, 노드 28/100/300/1,000개와 연결 수·분포를 명시한다. HTTP와 CPU, 브라우저의 측정 조건을 분리하고 본문 길이·썸네일 유무·버전 수를 고정한다.
3. CPU 준비 실행 2회/본 측정 5회, HTTP 준비 실행 뒤 최소 30표본과 동시 요청 1/8개, 브라우저 조건별 최소 3표본을 기록한다. cold/warm과 CPU 1배/4배, 화면 크기, Node/Next/브라우저·이미지·commit을 남긴다.
4. 후속 구현 전에 list_model_cpu_ms, request_p50_ms/request_p95_ms, graph_interaction_ms, retained_heap_bytes, rebuild_duration_ms의 비교 방법·허용 예산을 확정한다. 현재 공개 결과와 검수된 UI를 회귀 기준으로 저장한다.

## 인수 기준

- 같은 fixture로 두 번 재실행하여 조건·표본 수·결과 파일을 확인할 수 있다. 통계 이름에 맞는 표본 수와 산식을 기록한다.
- 격리 DB/loopback·임시 자산·본 작업 소유 프로세스의 생성/정리가 검증된다. 원본/비공개 sentinel은 측정 요약에 포함되지 않는다.
- 2026-11-06 탐색 표본과 새 기준선을 구분하고 이후 step이 사용할 실행 명령·예산을 main 계획에 등록한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --check scripts/performance-baseline.mjs
node --no-warnings --experimental-strip-types scripts/performance-baseline.mjs --local
```

측정기 코드의 lint/문법 검사, fixture 경로·정리 검사와 `git diff --check`를 실행한다. 앱 코드를 변경하는 경우 앱의 기본 gate와 TDD 규칙을 적용한다.

전체 lint에 기존 Git 제외 private helper 오류가 있으면 실패 내역과 source lint를 따로 기록한다. 실패를 숨기거나 무관한 파일을 수정해 통과시키지 않는다.

## 경계

- 원본·과거 버전·공개 선택·검수·감사는 기준 데이터로 보존한다. 재생성 권한은 파생 데이터에 한정한다.
- 현재 published/current-version, Brain published revision, privacy 정책, owner 인증·Origin·command revision/idempotency를 모든 새 읽기/쓰기 경로에서 검증한다.
- 성능 결과에는 fixture·환경·표본 수·cold/warm 조건을 함께 기록한다. 준비 실행·최댓값·소수 표본의 중앙값을 운영 p95로 표시하지 않는다.
- 실험 DB·파일·프로세스는 본 작업이 생성한 대상을 확인한 뒤 정리한다. 운영 적용·실제 콘텐츠 발행·OCI/DNS/TLS·provider·timer·외부 알림은 기존의 명시 승인 절차를 따른다.
- 공개 UI는 승인된 화면/상호작용을 인수 기준으로 사용한다. 질문 데이터는 작성자가 기록한 항목의 계약을 따른다.

## 다음 단계

F2 Step 0 `lightweight-list-model`. 독립 실행 조건은 전체 계획을 따른다.

## 완료 기록 — 2026-11-13

- 현재 코드 `bcabf2c37aed2303a7e5a95639251b330739047f`에 측정기 4개 파일을 추가했다. 앱 동작·schema·의존성·UI는 변경하지 않았다.
- 같은 fixture/source/측정기와 환경으로 전체 두 실행 완료: CPU 160표본, warm HTTP 2,048요청, 브라우저 192표본과 기본 발견 12표본. 공개 결과/원본 보존·자원 정리를 확인했다.
- 통계/fixture의 초기 예상 실패 3개 후 현재 도구 테스트 5/5, scripts 문법/ESLint, 두 Docker production build, 작은 표본과 실패 정리 검수를 통과했다. 기존 전체 private-helper lint는 재실행하지 않았다.
- [수치와 조건·한계](../../.codex/docs/harness/PERFORMANCE_BASELINE_REVIEW.md), [비교용 JSON](../../.codex/docs/harness/performance-baseline-2026-11-13.json)에 도구/이미지/해시·표본 수·예산을 남겼다. 영속 rebuild는 미측정(null)이며 운영 p95/INP가 아니다.
- 그래프 상호작용 32조건 중 3조건은 실행 간 편차가 예산보다 커 참고값으로 표시했다. 후속 성능 판정 전에 해당 조건을 재측정한다.
- 문서/JSON·링크·60 phase/209 step·R14/F1 상태·private 제외·diff 형식을 검사했다. 후속은 F2 Step 0이고 OCI/운영 보류를 유지한다.
