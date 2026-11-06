# Step 4 projected-detail-navigation

## 상태와 선행 조건

pending — 2026-11-06 등록한 F3의 상세 한 편과 가벼운 탐색 조회 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F3 Step 3 완료.

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
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-series.ts`
- `apps/h-log/lib/portfolio-posts.ts`
- `apps/h-log/components/portfolio/ProjectRelatedPosts.tsx`
- `apps/h-log/lib/blog-search.ts`
- `apps/h-log/lib/blog-detail-ui.test.ts`

## 범위와 산출물

상세 한 편과 가벼운 탐색 조회을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 상세 본문과 metadata를 대상 공개 버전·renderer 버전의 본문 모델로 공유한다. 본문 hash가 같은 경우에도 제목·검수 메타데이터 변경을 올바르게 반영한다.
2. 이전/다음, 관련 태그, 시리즈, 프로젝트 연결은 필요한 공개 요약만 조회한다. 대상과 탐색 링크의 현재 공개 판단을 같은 읽기 계약에 묶는다.
3. 캐시 miss·이전 renderer 결과·정책 변경·이웃 철회에서 현재 결과를 재구성한다. 읽기 fallback의 비용 상한과 오류를 검증한다.

## 인수 기준

- 상세 요청이 다른 글 전체의 Markdown/HTML을 로드하지 않는다. 본문 블록·목차 anchor·링크 순서·JSON-LD가 기준선과 일치한다.
- 10/1,000개에서 처리량을 비교하고 직접 URL·HTML/RSC·metadata·관련 링크의 공개/철회 회귀를 통과한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts lib/blog-series.test.ts lib/blog-detail-ui.test.ts
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

F3 Step 5 `versioned-crawler-outputs`.
