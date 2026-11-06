# Step 1 worker-layout-computation

## 상태와 선행 조건

pending — 2026-11-06 등록한 F5의 그래프 계산의 Worker 분리 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F5 Step 0 완료.

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
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/lib/brain-layout.ts`
- `apps/h-log/components/brain/BrainScene.tsx`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/lib/brain-layout.test.ts`
- `apps/h-log/scripts/brain-discovery.browser-check.mjs`
- `apps/h-log/next.config.ts`

## 범위와 산출물

그래프 계산의 Worker 분리을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 최소 공개 좌표 입력을 Web Worker로 전달하고 layout 결과를 받는다. 브라우저 entrypoint와 번들 구성을 현재 Next 문서로 검증한다.
2. request sequence와 graph/layout fingerprint로 늦은 결과를 제외한다. 연속 검색·배치 변경·unmount에서 작업 합치기/취소/종료를 구현한다.
3. Worker 로딩 실패·지원 제한 시 입력을 막지 않는 bounded fallback과 오류 상태를 정의한다. 공개 본문/원문 전달 범위를 검사한다.

## 인수 기준

- 작업 중 검색·키보드·pan/zoom이 응답하고 최신 배치만 적용된다. 다섯 배치와 reset의 결과가 기준선과 일치한다.
- 300/1,000개 및 CPU 4배 감속의 interaction/long task 예산을 확인하고 반복 진입/종료 후 Worker·메모리 잔류를 검수한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/brain-layout.test.ts
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

개발 서버와 production에서 1440/390/320px, 키보드, JS ON/OFF, history/URL, 로딩/오류/복구를 검수한다. 승인된 Brain 외관·다섯 배치·검색/reader와 Home 레이더를 화면 및 동작 회귀 기준으로 사용한다.

## 경계

- 원본·과거 버전·공개 선택·검수·감사는 기준 데이터로 보존한다. 재생성 권한은 파생 데이터에 한정한다.
- 현재 published/current-version, Brain published revision, privacy 정책, owner 인증·Origin·command revision/idempotency를 모든 새 읽기/쓰기 경로에서 검증한다.
- 성능 결과에는 fixture·환경·표본 수·cold/warm 조건을 함께 기록한다. 준비 실행·최댓값·소수 표본의 중앙값을 운영 p95로 표시하지 않는다.
- 실험 DB·파일·프로세스는 본 작업이 생성한 대상을 확인한 뒤 정리한다. 운영 적용·실제 콘텐츠 발행·OCI/DNS/TLS·provider·timer·외부 알림은 기존의 명시 승인 절차를 따른다.
- 공개 UI는 승인된 화면/상호작용을 인수 기준으로 사용한다. 질문 데이터는 작성자가 기록한 항목의 계약을 따른다.

## 다음 단계

F5 Step 2 `bounded-frame-work`.
