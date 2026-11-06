# Step 2 cold-rebuild-performance-rehearsal

## 상태와 선행 조건

pending — 2026-11-06 등록한 F7의 보조 데이터 유실과 부하 통합 검수 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F1–F6 전체 및 F7 Steps 0–1 완료. 운영 적용은 기존 승인 gate를 따른다.

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
- `apps/h-log/scripts/admin-release.rehearsal.mjs`
- `apps/h-log/scripts/brain-discovery.browser-check.mjs`
- `apps/h-log/scripts/brain-editor.browser-check.mjs`
- `apps/h-log/scripts/blog-index-seo.http.test.mjs`
- `apps/h-log/scripts/observability-recovery.mjs`
- `apps/h-log/.codex/docs/harness/SEO_RELEASE_REVIEW.md`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`

## 범위와 산출물

보조 데이터 유실과 부하 통합 검수을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. F1의 동일 fixture/예산으로 warm/cold·동시 요청 1/8개·긴 기록·실제 크기 합성 이미지·CPU 감속을 재측정한다. 변경별 query/전송량·CPU·p50/p95·peak/retained memory를 비교한다.
2. 보조 저장소만 유실시킨 격리 환경에서 원본으로 재생성한다. 중단/재개·중복·손상·동시 수정/철회·이전 worker·정책/renderer 변경·rollback을 포함한다.
3. 공개 HTML/RSC/Markdown/검색/태그/개수/feed/llms/sitemap, Brain 공개 revision과 원본 hash·작성자 검수·감사를 비교한다. 보호 정책에 맞는 실패/복구와 퇴행을 기록한다.
4. 운영 인계에 migration 순서, 백업·원본 파일 보관, rebuild 실행/중지·복구, 호환 rollback, 필요 자원·측정 한계를 정리한다. 성능 수치는 환경·조건·표본 수와 함께 남긴다.

## 인수 기준

- 완료된 모든 F step의 회귀가 통과하고 사전 예산 대비 개선/미달 항목이 식별된다. 실제 원본과 공개 선택이 복구 전후 일치한다.
- private 표본과 임시 DB/프로세스/파일이 정리되며 운영 모니터링 Step 7 → 관리자 A3 Step 4 → timer 인계 조건이 명시된다.
- 운영 사용자 p75/p95와 실제 이미지/트래픽에 대한 측정 과제는 표본 한계로 기록한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
npm run test:integration
npm run test:brain:http
npm run test:seo:http
npm run test:observability:recovery
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

성능 트랙의 완료 결과와 운영 인계를 정리한다. 기존 콘텐츠 트랙의 다음 단계는 R2 Step 0이며, 현재 레지스트리를 다시 확인한다.
