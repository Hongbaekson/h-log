# Step 1 single-read-search-flow

## 상태와 선행 조건

pending — 2026-11-06 등록한 F4의 중복 전체 조회를 줄인 검색 흐름 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F4 Step 0 완료.

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
- `apps/h-log/app/api/search/route.ts`
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/components/blog/BlogSearchPanel.tsx`
- `apps/h-log/lib/blog-search.ts`
- `apps/h-log/lib/blog-search-ui.ts`
- `apps/h-log/lib/blog-discovery-ui.test.ts`
- `apps/h-log/scripts/blog-index-seo.http.test.mjs`

## 범위와 산출물

중복 전체 조회를 줄인 검색 흐름을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 검색 상태의 서버 화면에서 일반 목록 본문 가공을 피하고 필요한 필터 집계만 조회한다. API 결과는 검색 projection과 공개 목록 모델을 사용한다.
2. 검색 guard·요청 취소·URL 복원·재시도·페이지/태그 개수는 기존 계약을 따른다. 캐시가 있다면 공개 generation/search schema에 묶고 hit에서도 현재 공개 상태를 검증한다.
3. 입력부터 결과 표시까지 요청 수·DB 전송량·응답 시간과 중복 가공을 측정한다. 비용 guard와 기존 keyword 동작을 회귀 검수한다.

## 인수 기준

- 하나의 검색 흐름에서 전체 본문 store를 두 번 읽는 경로가 제거된다. 검색 취소/역순 응답/브라우저 뒤로가기/철회 후 같은 질의가 올바르다.
- 글 1,000개·동시 요청 8개와 cache miss/hit에서 F1 예산과 결과 일치를 확인한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-search.test.ts lib/blog-search-ui.test.ts lib/blog-discovery-ui.test.ts
npm run test:seo:http
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

F5 Step 0 `reusable-graph-layouts`. 독립 실행 조건은 전체 계획을 따른다.
