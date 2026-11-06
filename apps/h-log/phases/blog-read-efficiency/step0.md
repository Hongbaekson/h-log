# Step 0 lightweight-list-model

## 상태와 선행 조건

pending — 2026-11-06 등록한 F2의 목록 전용 모델과 요청 내 계산 공유 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F1 Step 0 완료.

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
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-thumbnails.ts`
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/components/blog/HomeRecentPosts.tsx`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/lib/blog-discovery-ui.test.ts`

## 범위와 산출물

목록 전용 모델과 요청 내 계산 공유을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 제목·요약·태그·날짜·썸네일과 페이지/태그 집계에 필요한 목록 모델을 분리한다. 본문 블록과 목차 생성은 상세 본문의 호출 경로에 둔다.
2. 일반 목록의 metadata와 page가 같은 요청의 공개 판정·개수 계산을 공유하게 한다. Home 최근 3개도 같은 경량 모델을 사용한다.
3. 동일 공개 snapshot에서 ID별 태그·출처·자산 인덱스를 재사용하고 반복 배열 스캔을 줄인다. 요청 경계를 넘는 캐시는 후속 F3의 버전 계약을 따른다.

## 인수 기준

- RED/GREEN으로 제목·순서·태그 개수·페이지 정규화·빈 결과·현재 버전·철회·썸네일 실패 결과의 동등성을 확인한다.
- 목록 요청의 본문 블록 생성 횟수가 0이고 metadata/page의 동일 가공 중복이 제거된다. F1의 1,000개 CPU/HTTP 예산을 비교한다.
- Home의 소개/최근 글 스트리밍과 Blog의 JS ON/OFF 탐색을 검수한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts lib/blog-discovery-ui.test.ts
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

개발 서버와 production에서 1440/390/320px, 키보드, JS ON/OFF, history/URL, 로딩/오류/복구를 검수한다. 승인된 Brain 외관·다섯 배치·검색/reader와 Home 레이더를 화면 및 동작 회귀 기준으로 사용한다.

## 경계

- 원본·과거 버전·공개 선택·검수·감사는 기준 데이터로 보존한다. 재생성 권한은 파생 데이터에 한정한다.
- 현재 published/current-version, Brain published revision, privacy 정책, owner 인증·Origin·command revision/idempotency를 모든 새 읽기/쓰기 경로에서 검증한다.
- 성능 결과에는 fixture·환경·표본 수·cold/warm 조건을 함께 기록한다. 준비 실행·최댓값·소수 표본의 중앙값을 운영 p95로 표시하지 않는다.
- 실험 DB·파일·프로세스는 본 작업이 생성한 대상을 확인한 뒤 정리한다. 운영 적용·실제 콘텐츠 발행·OCI/DNS/TLS·provider·timer·외부 알림은 기존의 명시 승인 절차를 따른다.
- 공개 UI는 승인된 화면/상호작용을 인수 기준으로 사용한다. 질문 데이터는 작성자가 기록한 항목의 계약을 따른다.

## 다음 단계

F2 Step 1 `scoped-markdown-read`.
