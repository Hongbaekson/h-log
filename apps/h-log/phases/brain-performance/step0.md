# Step 0 reusable-graph-layouts

## 상태와 선행 조건

pending — 2026-11-06 등록한 F5의 배치 좌표와 검색 인덱스 재사용 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F1 Step 0 완료. F3/F4와 독립 진행 가능.

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
- `apps/h-log/lib/brain.ts`
- `apps/h-log/lib/brain-curation.ts`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/components/brain/BrainScene.tsx`
- `apps/h-log/lib/brain-layout.test.ts`
- `apps/h-log/lib/brain.test.ts`

## 범위와 산출물

배치 좌표와 검색 인덱스 재사용을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. graph fingerprint·노드/edge 입력·layout·spread·알고리즘 버전에 따른 제한된 좌표 캐시를 만든다. d3가 수정하는 객체와 재사용 결과를 복사 경계로 구분한다.
2. 노드 degree·주제/유형 집계·정규화 검색 문자열을 graph 변경 단위로 계산한다. 검색 입력 처리는 즉시 반영하고 배치 계산의 연속 실행을 합친다.
3. 다섯 배치·다시 정렬·간격 변경·필터 부분 그래프의 기존 좌표 계약을 테스트한다. 캐시 비움/graph 변경 때 원본 공개 graph로 재구성한다.

## 인수 기준

- 같은 입력의 배치 결과가 일치하고 반복 실행량이 줄어든다. 캐시 key 수/bytes 상한과 eviction 뒤 복구가 검증된다.
- 노드 28/100/300/1,000개, 명시된 연결 분포에서 CPU와 입력 지연을 비교한다. 검색어 변경·reset·reduced motion 동작이 일치한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/brain-layout.test.ts lib/brain.test.ts
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

F5 Step 1 `worker-layout-computation`.
